'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  FileText, Download, Loader2, Calculator, Building2, TrendingUp, TrendingDown, Euro,
  AlertCircle, CheckCircle, Info, Calendar, Upload, Paperclip, X, Eye
} from 'lucide-react'

interface Settings {
  companyName: string
  companySIRET: string
  companySIREN: string
  companyTVA: string | null
  companyAddress: string
  vatRegime: string
}

interface FiscalYearData {
  year: number
  income: number
  expenses: number
  profit: number
  isAmount: number
  tvaCollectee: number
  tvaDeductible: number
  tvaDue: number
}

interface Declaration {
  id: string
  type: string
  year: number
  period: string
  amount: number
  status: string
  dueDate: string
  filedAt: string | null
  documentUrl: string | null
}

interface DeclarationsSectionProps {
  settings: Settings | null
}

// IS Acomptes dates for a fiscal year ending November 30
// For FY ending Nov 30, 2025: acomptes are due March 15, June 15, Sept 15, Dec 15 (of same year)
function getISAcomptesDates(fyEndYear: number): Array<{ quarter: number; dueDate: Date; label: string }> {
  return [
    { quarter: 1, dueDate: new Date(fyEndYear, 2, 15), label: '15 Mars' },
    { quarter: 2, dueDate: new Date(fyEndYear, 5, 15), label: '15 Juin' },
    { quarter: 3, dueDate: new Date(fyEndYear, 8, 15), label: '15 Septembre' },
    { quarter: 4, dueDate: new Date(fyEndYear, 11, 15), label: '15 Décembre' },
  ]
}

// TVA CA12 declaration date (May 3rd of year after FY)
function getTVACA12Date(fyEndYear: number): Date {
  return new Date(fyEndYear + 1, 4, 3) // May 3rd of following year
}

// Calculate IS based on profit
function calculateIS(profit: number): number {
  if (profit <= 0) return 0
  if (profit <= 42500) {
    return profit * 0.15
  }
  return (42500 * 0.15) + ((profit - 42500) * 0.25)
}

export function DeclarationsSection({ settings }: DeclarationsSectionProps) {
  const [declarations, setDeclarations] = useState<Declaration[]>([])
  const [fiscalYearData, setFiscalYearData] = useState<Record<number, FiscalYearData>>({})
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('is')
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null)
  const [showDocModal, setShowDocModal] = useState<{ url: string; name: string } | null>(null)

  // Get data for selected fiscal year
  const selectedFYData = fiscalYearData[selectedYear]
  // Get data for previous fiscal year (for IS acomptes calculation)
  const previousFYData = fiscalYearData[selectedYear - 1]

  // IS acomptes based on previous year's IS
  const previousYearIS = previousFYData?.isAmount || 0
  const acompteAmount = previousYearIS > 0 ? Math.round((previousYearIS / 4) * 100) / 100 : 0

  // TVA info from selected year
  const isFranchiseEnBase = settings?.vatRegime === 'franchise'
  const tvaCollectee = selectedFYData?.tvaCollectee || 0
  const tvaDeductible = selectedFYData?.tvaDeductible || 0
  const tvaDue = selectedFYData?.tvaDue || 0

  useEffect(() => {
    fetchDeclarations()
    fetchFiscalYearData()
  }, [])

  const fetchFiscalYearData = async () => {
    try {
      // Fetch all transactions
      const res = await fetch('/api/transactions')
      const data = await res.json()
      const transactions = data.transactions || []

      // Calculate fiscal year data
      // Fiscal year YYYY runs from Dec 1 (YYYY-1) to Nov 30 (YYYY)
      const fyData: Record<number, FiscalYearData> = {}
      
      transactions.forEach((t: { date: string; amount: number }) => {
        const date = new Date(t.date)
        const year = date.getFullYear()
        const month = date.getMonth() + 1 // 1-12
        
        // Determine fiscal year
        let fy: number
        if (month === 12) {
          // December belongs to FY (year + 1)
          fy = year + 1
        } else {
          // Jan-Nov belongs to FY year
          fy = year
        }

        if (!fyData[fy]) {
          fyData[fy] = {
            year: fy,
            income: 0,
            expenses: 0,
            profit: 0,
            isAmount: 0,
            tvaCollectee: 0,
            tvaDeductible: 0,
            tvaDue: 0,
          }
        }

        if (t.amount > 0) {
          fyData[fy].income += t.amount
          fyData[fy].tvaCollectee += t.amount * 0.20 // 20% TVA
        } else {
          fyData[fy].expenses += Math.abs(t.amount)
          fyData[fy].tvaDeductible += Math.abs(t.amount) * 0.20 // 20% TVA
        }
      })

      // Calculate profit and IS for each fiscal year
      Object.keys(fyData).forEach(fy => {
        const year = parseInt(fy)
        fyData[year].profit = fyData[year].income - fyData[year].expenses
        fyData[year].isAmount = calculateIS(fyData[year].profit)
        fyData[year].tvaDue = fyData[year].tvaCollectee - fyData[year].tvaDeductible
      })

      setFiscalYearData(fyData)
    } catch (error) {
      console.error('Error fetching fiscal year data:', error)
    }
  }

  const fetchDeclarations = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/declarations')
      const data = await res.json()
      setDeclarations(data.declarations || [])
    } catch (error) {
      console.error('Error fetching declarations:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount)
  }

  const formatDate = (dateStr: string | Date) => {
    const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  }

  const getDaysUntil = (dateStr: string | Date) => {
    const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr
    const now = new Date()
    now.setHours(0, 0, 0, 0)
    date.setHours(0, 0, 0, 0)
    return Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  }

  // Generate IS declaration
  const generateISDeclaration = async (year: number) => {
    try {
      const res = await fetch('/api/declarations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          type: 'IS', 
          year,
          period: `FY${year}`,
          amount: previousYearIS
        })
      })
      const data = await res.json()
      if (data.success) {
        alert(`Déclaration IS générée pour l'exercice ${year}`)
        fetchDeclarations()
      } else {
        alert('Erreur: ' + (data.error || 'Erreur inconnue'))
      }
    } catch (error) {
      console.error('Error generating IS declaration:', error)
      alert('Erreur lors de la génération')
    }
  }

  // Generate TVA declaration
  const generateTVADeclaration = async (year: number) => {
    try {
      const res = await fetch('/api/declarations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          type: 'TVA', 
          year,
          period: `CA12-${year}`,
          amount: tvaDue
        })
      })
      const data = await res.json()
      if (data.success) {
        alert(`Déclaration TVA CA12 générée pour l'exercice ${year}`)
        fetchDeclarations()
      } else {
        alert('Erreur: ' + (data.error || 'Erreur inconnue'))
      }
    } catch (error) {
      console.error('Error generating TVA declaration:', error)
      alert('Erreur lors de la génération')
    }
  }

  // Mark declaration as filed
  const markAsFiled = async (id: string) => {
    try {
      await fetch('/api/declarations', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: 'filed', filedAt: new Date().toISOString() })
      })
      fetchDeclarations()
    } catch (error) {
      console.error('Error marking as filed:', error)
    }
  }

  // Upload document for declaration
  const uploadDocument = async (declarationId: string, file: File) => {
    setUploadingDoc(declarationId)
    try {
      const formData = new FormData()
      formData.append('declarationId', declarationId)
      formData.append('file', file)
      
      const res = await fetch('/api/declarations/document', {
        method: 'POST',
        body: formData
      })
      const data = await res.json()
      
      if (data.success) {
        fetchDeclarations()
      } else {
        alert('Erreur: ' + (data.error || 'Erreur inconnue'))
      }
    } catch (error) {
      console.error('Error uploading document:', error)
      alert('Erreur lors du téléchargement')
    } finally {
      setUploadingDoc(null)
    }
  }

  // Get IS acomptes for display
  const isAcomptes = getISAcomptesDates(selectedYear)
  const today = new Date()

  // Year options
  const yearOptions = [2026, 2025, 2024, 2023, 2022]

  return (
    <div className="space-y-6">
      {/* Year Selector */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardContent className="py-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-blue-900">Déclarations Fiscales</h2>
              <p className="text-sm text-blue-700">
                Calculs automatiques basés sur vos transactions.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Label className="text-sm font-medium text-blue-800">Exercice:</Label>
              <select
                className="p-2 border rounded-md bg-white"
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              >
                {yearOptions.map(y => (
                  <option key={y} value={y}>30/11/{y}</option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Info alert */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>Exercice fiscal:</strong> Du 01/12/{selectedYear - 1} au 30/11/{selectedYear}.
          Les acomptes IS sont dus les 15 mars, 15 juin, 15 septembre et 15 décembre.
        </AlertDescription>
      </Alert>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="is">Impôt sur les Sociétés</TabsTrigger>
          <TabsTrigger value="tva">TVA</TabsTrigger>
          <TabsTrigger value="history">Historique</TabsTrigger>
        </TabsList>

        {/* IS Tab */}
        <TabsContent value="is" className="space-y-6">
          {/* IS Summary Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Acomptes IS - Exercice {selectedYear}
              </CardTitle>
              <CardDescription>
                Calculés automatiquement sur la base de l'IS de l'exercice précédent (N-1)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Previous Year Summary */}
              <div className="p-4 bg-muted rounded-lg mb-6">
                <h4 className="font-semibold mb-3">Exercice N-1 (30/11/{selectedYear - 1})</h4>
                <div className="grid md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Chiffre d'affaires</p>
                    <p className="text-lg font-bold text-emerald-600">
                      {formatCurrency(previousFYData?.income || 0)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Charges</p>
                    <p className="text-lg font-bold text-red-600">
                      {formatCurrency(previousFYData?.expenses || 0)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Bénéfice fiscal</p>
                    <p className={`text-lg font-bold ${(previousFYData?.profit || 0) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {formatCurrency(previousFYData?.profit || 0)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">IS calculé</p>
                    <p className="text-lg font-bold text-blue-600">{formatCurrency(previousYearIS)}</p>
                  </div>
                </div>
              </div>

              {/* Acomptes Summary */}
              <div className="grid md:grid-cols-3 gap-4 mb-6">
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-sm text-muted-foreground">IS exercice N-1</p>
                  <p className="text-2xl font-bold text-blue-600">{formatCurrency(previousYearIS)}</p>
                </div>
                <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                  <p className="text-sm text-muted-foreground">Montant par acompte</p>
                  <p className="text-2xl font-bold text-purple-600">{formatCurrency(acompteAmount)}</p>
                </div>
                <div className="p-4 bg-indigo-50 rounded-lg border border-indigo-200">
                  <p className="text-sm text-muted-foreground">Total acomptes annuels</p>
                  <p className="text-2xl font-bold text-indigo-600">{formatCurrency(acompteAmount * 4)}</p>
                </div>
              </div>

              {/* Acomptes Schedule */}
              <h4 className="font-semibold mb-3">Calendrier des acomptes {selectedYear}</h4>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Acompte</TableHead>
                      <TableHead>Date limite</TableHead>
                      <TableHead>Montant</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>Justificatif</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isAcomptes.map((acompte, i) => {
                      const days = getDaysUntil(acompte.dueDate)
                      const isPast = days < 0
                      const isUrgent = days <= 7 && days >= 0
                      const declaration = declarations.find(d => 
                        d.type === 'IS' && 
                        d.period === `IS-Q${i+1}-${selectedYear}`
                      )
                      
                      return (
                        <TableRow key={i}>
                          <TableCell className="font-medium">
                            Acompte Q{i + 1} ({acompte.label})
                          </TableCell>
                          <TableCell className="font-mono">{formatDate(acompte.dueDate)}</TableCell>
                          <TableCell className="font-mono font-semibold">{formatCurrency(acompteAmount)}</TableCell>
                          <TableCell>
                            {declaration ? (
                              <Badge variant={declaration.status === 'filed' ? 'default' : 'secondary'}>
                                {declaration.status === 'filed' ? (
                                  <><CheckCircle className="h-3 w-3 mr-1" /> Payé</>
                                ) : (
                                  <><Calendar className="h-3 w-3 mr-1" /> En attente</>
                                )}
                              </Badge>
                            ) : (
                              <Badge variant={isPast ? 'destructive' : isUrgent ? 'destructive' : 'outline'}>
                                {isPast ? `${Math.abs(days)}j retard` : `${days}j`}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {declaration?.documentUrl ? (
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setShowDocModal({ url: declaration.documentUrl!, name: `Acompte Q${i+1}` })}
                                >
                                  <Eye className="h-4 w-4 text-blue-600" />
                                </Button>
                                <CheckCircle className="h-4 w-4 text-green-600" />
                              </div>
                            ) : declaration ? (
                              <label className="cursor-pointer">
                                <input
                                  type="file"
                                  accept="image/*,.pdf"
                                  className="hidden"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0]
                                    if (file) uploadDocument(declaration.id, file)
                                  }}
                                  disabled={uploadingDoc === declaration.id}
                                />
                                <Button variant="ghost" size="sm" disabled={uploadingDoc === declaration.id}>
                                  {uploadingDoc === declaration.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Paperclip className="h-4 w-4 text-gray-400" />
                                  )}
                                </Button>
                              </label>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* IS Balance */}
              {previousYearIS > 0 && (
                <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="font-semibold text-blue-800 mb-2">Régularisation IS</h4>
                  <div className="text-sm text-blue-700 space-y-1">
                    <p>• Total acomptes versés: {formatCurrency(acompteAmount * 4)}</p>
                    <p>• IS définitif: {formatCurrency(previousYearIS)}</p>
                    <p className="font-semibold">
                      {acompteAmount * 4 >= previousYearIS ? (
                        <>Crédit d'impôt: {formatCurrency(acompteAmount * 4 - previousYearIS)}</>
                      ) : (
                        <>Solde à payer: {formatCurrency(previousYearIS - acompteAmount * 4)}</>
                      )}
                    </p>
                  </div>
                </div>
              )}

              {/* Current Year Preview */}
              {selectedFYData && (
                <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <h4 className="font-semibold text-green-800 mb-2">Aperçu exercice en cours (30/11/{selectedYear})</h4>
                  <div className="grid md:grid-cols-4 gap-4 text-sm text-green-700">
                    <div>
                      <p className="text-green-600">CA</p>
                      <p className="font-bold">{formatCurrency(selectedFYData.income)}</p>
                    </div>
                    <div>
                      <p className="text-green-600">Charges</p>
                      <p className="font-bold">{formatCurrency(selectedFYData.expenses)}</p>
                    </div>
                    <div>
                      <p className="text-green-600">Bénéfice</p>
                      <p className="font-bold">{formatCurrency(selectedFYData.profit)}</p>
                    </div>
                    <div>
                      <p className="text-green-600">IS estimé</p>
                      <p className="font-bold">{formatCurrency(selectedFYData.isAmount)}</p>
                    </div>
                  </div>
                  <p className="text-xs text-green-600 mt-2">
                    Cet IS estimé servira au calcul des acomptes de l'exercice {selectedYear + 1}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Generate IS Button */}
          <Card>
            <CardContent className="py-6">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold">Enregistrer les déclarations IS</h4>
                  <p className="text-sm text-muted-foreground">
                    Créez les 4 acomptes IS pour suivi dans l'historique
                  </p>
                </div>
                <Button onClick={() => generateISDeclaration(selectedYear)}>
                  <FileText className="h-4 w-4 mr-2" />
                  Générer
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TVA Tab */}
        <TabsContent value="tva" className="space-y-6">
          {/* TVA Regime Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Déclaration TVA - Exercice {selectedYear}
              </CardTitle>
              <CardDescription>
                Régime: {isFranchiseEnBase ? 'Franchise en base (sans TVA)' : 'Réel simplifié'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isFranchiseEnBase ? (
                <Alert className="border-green-200 bg-green-50">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">
                    <strong>Franchise en base</strong> - Vous n'êtes pas assujetti à la TVA.
                    Vos factures doivent mentionner "TVA non applicable, art. 293B du CGI".
                    <br /><br />
                    <strong>Seuil franchise 2025:</strong><br />
                    • Prestations de services: 37 500 € HT<br />
                    • Ventes de biens: 85 000 € HT
                  </AlertDescription>
                </Alert>
              ) : (
                <>
                  <div className="grid md:grid-cols-3 gap-4 mb-6">
                    <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                      <p className="text-sm text-muted-foreground">TVA collectée (20%)</p>
                      <p className="text-2xl font-bold text-red-600">{formatCurrency(tvaCollectee)}</p>
                      <p className="text-xs text-muted-foreground mt-1">Sur {formatCurrency(selectedFYData?.income || 0)} HT</p>
                    </div>
                    <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                      <p className="text-sm text-muted-foreground">TVA déductible (20%)</p>
                      <p className="text-2xl font-bold text-green-600">{formatCurrency(tvaDeductible)}</p>
                      <p className="text-xs text-muted-foreground mt-1">Sur {formatCurrency(selectedFYData?.expenses || 0)} HT</p>
                    </div>
                    <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                      <p className="text-sm text-muted-foreground">TVA nette à payer</p>
                      <p className={`text-2xl font-bold ${tvaDue >= 0 ? 'text-amber-600' : 'text-green-600'}`}>
                        {tvaDue >= 0 ? formatCurrency(tvaDue) : `Crédit ${formatCurrency(Math.abs(tvaDue))}`}
                      </p>
                    </div>
                  </div>

                  {/* CA12 Info */}
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                    <h4 className="font-semibold text-amber-800 mb-2">Déclaration CA12</h4>
                    <p className="text-sm text-amber-700">
                      La déclaration annuelle de TVA (formulaire CA12) doit être déposée 
                      <strong> le {formatDate(getTVACA12Date(selectedYear))}</strong> (avant le 3 mai de l'année suivant la clôture).
                    </p>
                  </div>

                  {/* TVA Acomptes */}
                  {tvaDue > 1000 && (
                    <div className="mt-6">
                      <h4 className="font-semibold mb-3">Acomptes TVA (régime simplifié)</h4>
                      <p className="text-sm text-muted-foreground mb-3">
                        TVA due supérieure à 1 000 € → 2 acomptes semestriels requis:
                      </p>
                      <div className="rounded-md border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Acompte</TableHead>
                              <TableHead>Date limite</TableHead>
                              <TableHead>Montant (55%)</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            <TableRow>
                              <TableCell>1er acompte</TableCell>
                              <TableCell className="font-mono">15 juillet {selectedYear}</TableCell>
                              <TableCell className="font-mono">{formatCurrency(tvaDue * 0.55)}</TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell>2e acompte</TableCell>
                              <TableCell className="font-mono">15 décembre {selectedYear}</TableCell>
                              <TableCell className="font-mono">{formatCurrency(tvaDue * 0.55)}</TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Generate TVA Button */}
          {!isFranchiseEnBase && (
            <Card>
              <CardContent className="py-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold">Enregistrer la déclaration TVA CA12</h4>
                    <p className="text-sm text-muted-foreground">
                      Pour suivi dans l'historique des déclarations
                    </p>
                  </div>
                  <Button onClick={() => generateTVADeclaration(selectedYear)}>
                    <FileText className="h-4 w-4 mr-2" />
                    Enregistrer CA12
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Historique des déclarations</CardTitle>
              <CardDescription>
                Toutes vos déclarations fiscales enregistrées
              </CardDescription>
            </CardHeader>
            <CardContent>
              {declarations.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Aucune déclaration enregistrée</p>
                  <p className="text-sm mt-2">Les calculs sont automatiques, enregistrez pour suivi</p>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Type</TableHead>
                        <TableHead>Période</TableHead>
                        <TableHead>Montant</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead>Date limite</TableHead>
                        <TableHead>Document</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {declarations.map((d) => (
                        <TableRow key={d.id}>
                          <TableCell>
                            <Badge variant="outline">{d.type}</Badge>
                          </TableCell>
                          <TableCell className="font-mono">{d.period}</TableCell>
                          <TableCell className="font-mono">{formatCurrency(d.amount)}</TableCell>
                          <TableCell>
                            <Badge variant={d.status === 'filed' ? 'default' : 'secondary'}>
                              {d.status === 'filed' ? 'Déposée' : 'En attente'}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono">{formatDate(d.dueDate)}</TableCell>
                          <TableCell>
                            {d.documentUrl ? (
                              <Button variant="ghost" size="sm" onClick={() => setShowDocModal({ url: d.documentUrl!, name: d.period })}>
                                <Eye className="h-4 w-4" />
                              </Button>
                            ) : (
                              <label className="cursor-pointer">
                                <input
                                  type="file"
                                  accept="image/*,.pdf"
                                  className="hidden"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0]
                                    if (file) uploadDocument(d.id, file)
                                  }}
                                  disabled={uploadingDoc === d.id}
                                />
                                <Button variant="ghost" size="sm" disabled={uploadingDoc === d.id}>
                                  {uploadingDoc === d.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Paperclip className="h-4 w-4 text-gray-400" />
                                  )}
                                </Button>
                              </label>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Document Modal */}
      {showDocModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-semibold">{showDocModal.name}</h3>
              <Button variant="ghost" size="sm" onClick={() => setShowDocModal(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="p-4 overflow-auto flex-1">
              {showDocModal.url.endsWith('.pdf') ? (
                <iframe src={showDocModal.url} className="w-full h-[70vh]" title="Document PDF" />
              ) : (
                <img src={showDocModal.url} alt="Document" className="max-w-full max-h-[70vh] mx-auto object-contain" />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
