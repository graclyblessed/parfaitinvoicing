'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Separator } from '@/components/ui/separator'
import {
  FileText, Download, Loader2, Calculator, Building2, TrendingUp, TrendingDown, Euro
} from 'lucide-react'

interface LiasseData {
  id: string
  year: number
  status: string
  
  // Compte de résultat
  chiffreAffaires: number
  totalProduits: number
  achats: number
  servicesExterieurs: number
  impotsTaxes: number
  totalCharges: number
  resultatCourant: number
  impotSurSocietes: number
  resultatNet: number
  
  // Bilan
  capital: number
  totalCapitauxPropres: number
  disponibilites: number
  totalActif: number
  totalPassif: number
  
  // Déclaration
  baseImposableIS: number
  isAPayer: number
}

interface Settings {
  companyName: string
  companySIRET: string
  companyAddress: string
}

interface Transaction {
  id: string
  date: string
  amount: number
  type: string
  labeled: boolean
}

interface LiasseFiscaleSectionProps {
  settings: Settings | null
  transactions: Transaction[]
}

export function LiasseFiscaleSection({ settings, transactions }: LiasseFiscaleSectionProps) {
  const [liasse, setLiasse] = useState<LiasseData | null>(null)
  const [liasses, setLiasses] = useState<LiasseData[]>([])
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear() - 1)

  useEffect(() => {
    fetchLiasses()
  }, [])

  const fetchLiasses = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/liasse')
      const data = await res.json()
      setLiasses(data.liasses || [])
      if (data.liasses?.length > 0) {
        setLiasse(data.liasses[0])
        setSelectedYear(data.liasses[0].year)
      }
    } catch (error) {
      console.error('Error fetching liasses:', error)
    } finally {
      setLoading(false)
    }
  }

  const generateLiasse = async (year: number) => {
    setGenerating(true)
    try {
      const res = await fetch('/api/liasse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ year })
      })
      const data = await res.json()
      if (data.success) {
        setLiasse(data.liasse)
        fetchLiasses()
        alert(`Liasse fiscale ${year} générée avec succès!\n\nChiffre d'affaires: ${formatCurrency(data.summary.chiffreAffaires)}\nRésultat: ${formatCurrency(data.summary.resultatCourant)}\nIS à payer: ${formatCurrency(data.summary.isAPayer)}`)
      }
    } catch (error) {
      console.error('Error generating liasse:', error)
    } finally {
      setGenerating(false)
    }
  }

  const downloadPDF = () => {
    if (liasse) {
      window.open(`/api/liasse/${liasse.id}/pdf`, '_blank')
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount)
  }

  const labeledTransactions = transactions.filter(t => t.labeled)
  const unlabeledTransactions = transactions.filter(t => !t.labeled)

  return (
    <div className="space-y-6">
      {/* Warning if unlabeled transactions */}
      {unlabeledTransactions.length > 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="text-amber-600 text-2xl">⚠️</div>
              <div>
                <p className="font-medium text-amber-800">Transactions non catégorisées</p>
                <p className="text-sm text-amber-700">
                  Vous avez {unlabeledTransactions.length} transaction(s) non catégorisées. 
                  Catégorisez-les d'abord pour une liasse fiscale accurate.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Generate Liasse */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Générer une Liasse Fiscale
          </CardTitle>
          <CardDescription>
            Générez automatiquement votre liasse fiscale (2033-SD) à partir de vos transactions catégorisées
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-4">
            <div className="flex-1">
              <Label>Année fiscale</Label>
              <select 
                className="w-full mt-1 p-2 border rounded-md"
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              >
                {[2024, 2023, 2022, 2021].map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
            <Button onClick={() => generateLiasse(selectedYear)} disabled={generating}>
              {generating ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Calculator className="h-4 w-4 mr-2" />
              )}
              Générer la liasse {selectedYear}
            </Button>
          </div>
          
          <div className="mt-4 text-sm text-muted-foreground">
            <p>Transactions catégorisées disponibles: <strong>{labeledTransactions.length}</strong></p>
          </div>
        </CardContent>
      </Card>

      {/* Existing Liasses */}
      {liasses.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Liasse(s) existante(s)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Année</TableHead>
                    <TableHead>Chiffre d'affaires</TableHead>
                    <TableHead>Résultat</TableHead>
                    <TableHead>IS à payer</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {liasses.map((l) => (
                    <TableRow key={l.id}>
                      <TableCell className="font-medium">{l.year}</TableCell>
                      <TableCell>{formatCurrency(l.chiffreAffaires)}</TableCell>
                      <TableCell className={l.resultatCourant >= 0 ? 'text-emerald-600' : 'text-red-600'}>
                        {formatCurrency(l.resultatCourant)}
                      </TableCell>
                      <TableCell>{formatCurrency(l.isAPayer)}</TableCell>
                      <TableCell>
                        <Badge variant={l.status === 'filed' ? 'default' : 'secondary'}>
                          {l.status === 'filed' ? 'Déposée' : l.status === 'complete' ? 'Complète' : 'Brouillon'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Button variant="ghost" size="sm" onClick={() => setLiasse(l)}>
                          Voir
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => window.open(`/api/liasse/${l.id}/pdf`, '_blank')}>
                          <Download className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Liasse Detail */}
      {liasse && (
        <>
          {/* Company Header */}
          {settings && (
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Building2 className="h-5 w-5" />
                      {settings.companyName}
                    </CardTitle>
                    <CardDescription>
                      SIRET: {settings.companySIRET} | {settings.companyAddress}
                    </CardDescription>
                  </div>
                  <div className="text-right">
                    <Badge variant="outline" className="mb-2">Exercice {liasse.year}</Badge>
                    <br />
                    <Button onClick={downloadPDF} variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-2" />
                      Télécharger PDF
                    </Button>
                  </div>
                </div>
              </CardHeader>
            </Card>
          )}

          {/* Key Figures */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-emerald-500" />
                  Chiffre d'affaires
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-emerald-600">{formatCurrency(liasse.chiffreAffaires)}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <TrendingDown className="h-4 w-4 text-red-500" />
                  Total Charges
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{formatCurrency(liasse.totalCharges)}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Euro className="h-4 w-4 text-blue-500" />
                  Résultat Net
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${liasse.resultatNet >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {formatCurrency(liasse.resultatNet)}
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">IS à payer</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{formatCurrency(liasse.isAPayer)}</div>
              </CardContent>
            </Card>
          </div>

          {/* Compte de Résultat */}
          <Card>
            <CardHeader>
              <CardTitle>Compte de Résultat (Formulaire 2033-D)</CardTitle>
              <CardDescription>Détail des produits et charges de l'exercice</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                {/* Produits */}
                <div>
                  <h4 className="font-semibold mb-3 text-emerald-700">PRODUITS</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Chiffre d'affaires</span>
                      <span className="font-mono">{formatCurrency(liasse.chiffreAffaires)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Autres produits</span>
                      <span className="font-mono">{formatCurrency(liasse.totalProduits - liasse.chiffreAffaires)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between font-semibold">
                      <span>Total Produits</span>
                      <span className="font-mono">{formatCurrency(liasse.totalProduits)}</span>
                    </div>
                  </div>
                </div>

                {/* Charges */}
                <div>
                  <h4 className="font-semibold mb-3 text-red-700">CHARGES</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Achats</span>
                      <span className="font-mono">{formatCurrency(liasse.achats)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Services extérieurs</span>
                      <span className="font-mono">{formatCurrency(liasse.servicesExterieurs)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Impôts et taxes</span>
                      <span className="font-mono">{formatCurrency(liasse.impotsTaxes)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between font-semibold">
                      <span>Total Charges</span>
                      <span className="font-mono">{formatCurrency(liasse.totalCharges)}</span>
                    </div>
                  </div>
                </div>
              </div>

              <Separator className="my-4" />

              <div className="space-y-2">
                <div className="flex justify-between font-semibold text-lg">
                  <span>Résultat courant</span>
                  <span className={`font-mono ${liasse.resultatCourant >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {formatCurrency(liasse.resultatCourant)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Impôt sur les sociétés</span>
                  <span className="font-mono text-blue-600">-{formatCurrency(liasse.impotSurSocietes)}</span>
                </div>
                <Separator />
                <div className="flex justify-between font-bold text-xl">
                  <span>Résultat Net</span>
                  <span className={`font-mono ${liasse.resultatNet >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {formatCurrency(liasse.resultatNet)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Bilan Simplifié */}
          <Card>
            <CardHeader>
              <CardTitle>Bilan Simplifié (Formulaire 2033-A)</CardTitle>
              <CardDescription>Situation patrimoniale au 31 décembre {liasse.year}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                {/* Actif */}
                <div>
                  <h4 className="font-semibold mb-3 text-blue-700">ACTIF</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Disponibilités (trésorerie)</span>
                      <span className="font-mono">{formatCurrency(liasse.disponibilites)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between font-semibold">
                      <span>Total Actif</span>
                      <span className="font-mono">{formatCurrency(liasse.totalActif)}</span>
                    </div>
                  </div>
                </div>

                {/* Passif */}
                <div>
                  <h4 className="font-semibold mb-3 text-purple-700">PASSIF</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Capital social</span>
                      <span className="font-mono">{formatCurrency(liasse.capital)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Résultat de l'exercice</span>
                      <span className="font-mono">{formatCurrency(liasse.resultatNet)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between font-semibold">
                      <span>Total Passif</span>
                      <span className="font-mono">{formatCurrency(liasse.totalPassif)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Calcul IS */}
          <Card>
            <CardHeader>
              <CardTitle>Calcul de l'Impôt sur les Sociétés</CardTitle>
              <CardDescription>Barème progressif PME (15% jusqu'à 42 500€, 25% au-delà)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span>Base imposable à l'IS</span>
                  <span className="font-mono">{formatCurrency(liasse.baseImposableIS)}</span>
                </div>
                {liasse.baseImposableIS > 42500 ? (
                  <>
                    <div className="flex justify-between text-sm">
                      <span>Tranche 0 - 42 500 € (15%)</span>
                      <span className="font-mono">{formatCurrency(42500 * 0.15)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Tranche &gt; 42 500 € (25%)</span>
                      <span className="font-mono">{formatCurrency((liasse.baseImposableIS - 42500) * 0.25)}</span>
                    </div>
                  </>
                ) : (
                  <div className="flex justify-between text-sm">
                    <span>Taux réduit PME (15%)</span>
                    <span className="font-mono">{formatCurrency(liasse.baseImposableIS * 0.15)}</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between font-bold text-lg">
                  <span>IS à payer</span>
                  <span className="font-mono text-blue-600">{formatCurrency(liasse.isAPayer)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* No Liasse */}
      {!liasse && !loading && (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-lg font-medium">Aucune liasse fiscale générée</p>
            <p className="text-muted-foreground mt-2">
              Importez et catégorisez vos transactions, puis générez votre liasse fiscale.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
