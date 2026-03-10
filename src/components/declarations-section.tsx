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

interface LiasseData {
  id: string
  year: number
  status: string
  chiffreAffaires: number
  totalCharges: number
  resultatCourant: number
  impotSurSocietes: number
  resultatNet: number
  baseImposableIS: number
  isAPayer: number
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
  liasse: LiasseData | null
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

export function DeclarationsSection({ settings, liasse }: DeclarationsSectionProps) {
  const [declarations, setDeclarations] = useState<Declaration[]>([])
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('is')
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null)
  const [showDocModal, setShowDocModal] = useState<{ url: string; name: string } | null>(null)

  // Calculate IS acomptes based on previous year IS
  const previousYearIS = liasse?.isAPayer || 0
  const acompteAmount = previousYearIS > 0 ? Math.round((previousYearIS / 4) * 100) / 100 : 0

  // TVA info
  const isFranchiseEnBase = settings?.vatRegime === 'franchise'
  const tvaDue = liasse?.tvaDue || 0

  useEffect(() => {
    fetchDeclarations()
  }, [])

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

  return (
    <div className="space-y-6">
      {/* Info alert */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>Exercice fiscal:</strong> Votre exercice clos le 30/11/{selectedYear}. 
          Les acomptes IS sont dus les 15 mars, 15 juin, 15 septembre et 15 décembre de l'année de clôture.
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
                Calculés sur la base de l'IS de l'exercice précédent
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-4 mb-6">
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">IS exercice précédent</p>
                  <p className="text-2xl font-bold">{formatCurrency(previousYearIS)}</p>
                </div>
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">Montant par acompte</p>
                  <p className="text-2xl font-bold text-blue-600">{formatCurrency(acompteAmount)}</p>
                </div>
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">Total acomptes</p>
                  <p className="text-2xl font-bold">{formatCurrency(acompteAmount * 4)}</p>
                </div>
              </div>

              {/* Acomptes Schedule */}
              <h4 className="font-semibold mb-3">Calendrier des acomptes</h4>
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
            </CardContent>
          </Card>

          {/* Generate IS Button */}
          <Card>
            <CardContent className="py-6">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold">Générer les déclarations IS</h4>
                  <p className="text-sm text-muted-foreground">
                    Créez les 4 acomptes IS pour l'exercice {selectedYear}
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
                    <div className="p-4 bg-muted rounded-lg">
                      <p className="text-sm text-muted-foreground">TVA collectée</p>
                      <p className="text-2xl font-bold text-red-600">{formatCurrency(liasse?.tvaCollectee || 0)}</p>
                    </div>
                    <div className="p-4 bg-muted rounded-lg">
                      <p className="text-sm text-muted-foreground">TVA déductible</p>
                      <p className="text-2xl font-bold text-green-600">{formatCurrency(liasse?.tvaDeductible || 0)}</p>
                    </div>
                    <div className="p-4 bg-muted rounded-lg">
                      <p className="text-sm text-muted-foreground">TVA due</p>
                      <p className={`text-2xl font-bold ${tvaDue >= 0 ? 'text-red-600' : 'text-green-600'}`}>
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
                  <div className="mt-6">
                    <h4 className="font-semibold mb-3">Acomptes TVA (régime simplifié)</h4>
                    <p className="text-sm text-muted-foreground mb-3">
                      Si votre TVA due dépasse 1 000 €, vous devez verser 2 acomptes semestriels:
                    </p>
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Acompte</TableHead>
                            <TableHead>Date limite</TableHead>
                            <TableHead>Montant (55% de l'année précédente)</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          <TableRow>
                            <TableCell>1er acompte (juillet)</TableCell>
                            <TableCell className="font-mono">15 juillet {selectedYear}</TableCell>
                            <TableCell className="font-mono">{formatCurrency(tvaDue * 0.55)}</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell>2e acompte (décembre)</TableCell>
                            <TableCell className="font-mono">15 décembre {selectedYear}</TableCell>
                            <TableCell className="font-mono">{formatCurrency(tvaDue * 0.55)}</TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>
                  </div>
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
                    <h4 className="font-semibold">Générer la déclaration TVA CA12</h4>
                    <p className="text-sm text-muted-foreground">
                      Créez la déclaration CA12 pour l'exercice {selectedYear}
                    </p>
                  </div>
                  <Button onClick={() => generateTVADeclaration(selectedYear)}>
                    <FileText className="h-4 w-4 mr-2" />
                    Générer CA12
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
                  <p className="text-sm mt-2">Générez vos déclarations IS ou TVA</p>
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
