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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import {
  FileText, Download, Loader2, Calculator, Building2, Euro,
  AlertCircle, CheckCircle, Info, Copy, Check, Clipboard,
  ExternalLink, Save, HelpCircle, Percent
} from 'lucide-react'

interface Settings {
  companyName: string
  companySIRET: string
  companySIREN: string
  companyTVA: string | null
  companyAddress: string
  presidentName: string | null
  vatRegime: string
}

interface Formulaire3517S {
  id: string
  year: number
  status: string
  baseHT20: number
  tvaCollectee20: number
  baseHT10: number
  tvaCollectee10: number
  baseHT55: number
  tvaCollectee55: number
  baseHT21: number
  tvaCollectee21: number
  totalTVABrute: number
  totalBaseHT: number
  tvaDeductibleBiensServices: number
  tvaDeductibleImmobilisations: number
  totalTVADeductible: number
  totalDeductions: number
  tvaNette: number
  creditTVA: number
  tvaNetteDue: number
  totalAPayer: number
  periodeStart: string
  periodeEnd: string
  nombreVentes: number
  nombreAchats: number
}

interface FormulaireTVASectionProps {
  settings: Settings | null
}

// Tooltip helper component
const T = ({ text }: { text: string }) => (
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger asChild>
        <HelpCircle className="h-3.5 w-3.5 text-muted-foreground inline-block ml-1 cursor-help" />
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs text-sm">
        <p>{text}</p>
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
)

export function FormulaireTVASection({ settings }: FormulaireTVASectionProps) {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [copiedAll, setCopiedAll] = useState(false)

  const [form, setForm] = useState<Formulaire3517S | null>(null)
  const [formList, setFormList] = useState<Formulaire3517S[]>([])

  // Manual override inputs
  const [manualInputs, setManualInputs] = useState({
    tvaDeductibleBiensServices: 0,
    tvaDeductibleImmobilisations: 0,
  })

  const yearOptions = [2027, 2026, 2025, 2024, 2023, 2022]

  useEffect(() => {
    fetchForms()
  }, [])

  const fetchForms = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/formulaire-3517s')
      const data = await res.json()
      setFormList(data.formulaires || [])
      if (data.formulaires?.length > 0) {
        setForm(data.formulaires[0])
        setSelectedYear(data.formulaires[0].year)
        setManualInputs({
          tvaDeductibleBiensServices: data.formulaires[0].tvaDeductibleBiensServices,
          tvaDeductibleImmobilisations: data.formulaires[0].tvaDeductibleImmobilisations,
        })
      }
    } catch (error) {
      console.error('Error fetching forms:', error)
    } finally {
      setLoading(false)
    }
  }

  const generate = async () => {
    setGenerating(true)
    try {
      const res = await fetch('/api/formulaire-3517s', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ year: selectedYear, tvaInputs: manualInputs }),
      })
      const data = await res.json()
      if (data.success) {
        setForm(data.formulaire)
        fetchForms()
        
        // Show detailed breakdown
        const s = data.summary
        let msg = `Formulaire 3517-S généré pour l'exercice ${selectedYear}!\n\n`
        msg += `TVA collectée: ${s.invoices} facture(s) + ${s.incomeTransactions} transaction(s) revenu → ${(s.totalTVABrute || 0).toFixed(2)}€\n`
        msg += `TVA déductible: ${s.expenseTransactions} transactions achat → ${(s.totalTVADeductible || 0).toFixed(2)}€\n\n`
        
        if (s.categoryBreakdown) {
          msg += `Détail par catégorie:\n`
          for (const [cat, info] of Object.entries(s.categoryBreakdown as Record<string, { count: number; totalAmount: number; tvaAmount: number; rate: number }>)) {
            const rateStr = `${(info.rate * 100).toFixed(0)}%`
            msg += `  • ${cat}: ${info.count} txn(s), TTC=${info.totalAmount.toFixed(2)}€, TVA=${info.tvaAmount.toFixed(2)}€ (taux ${rateStr})\n`
          }
        }
        
        msg += `\nTVA nette due: ${(s.tvaNette || 0).toFixed(2)}€`
        alert(msg)
      } else {
        alert('Erreur: ' + (data.error || 'Erreur inconnue'))
      }
    } catch (error) {
      console.error('Error generating 3517-S:', error)
      alert('Erreur lors de la génération')
    } finally {
      setGenerating(false)
    }
  }

  const save = async () => {
    if (!form) return
    setSaving(true)
    try {
      const res = await fetch('/api/formulaire-3517s', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: form.id, ...manualInputs }),
      })
      const data = await res.json()
      if (data.success) {
        setForm(data.formulaire)
        alert('Formulaire 3517-S mis à jour!')
      }
    } catch (error) {
      console.error('Error saving 3517-S:', error)
    } finally {
      setSaving(false)
    }
  }

  const copyToClipboard = async (value: number, fieldLabel: string) => {
    const text = Math.round(value * 100) / 100
    try {
      await navigator.clipboard.writeText(text.toString())
      setCopiedField(fieldLabel)
      setTimeout(() => setCopiedField(null), 2000)
    } catch {
      const textarea = document.createElement('textarea')
      textarea.value = text.toString()
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      setCopiedField(fieldLabel)
      setTimeout(() => setCopiedField(null), 2000)
    }
  }

  const copyAllForImpots = async () => {
    if (!form) return
    const lines = [
      `FORMULAIRE 3517-S / CA12 - DECLARATION TVA ANNUELLE`,
      `Exercice: ${form.periodeStart} au ${form.periodeEnd}`,
      `${settings?.companyName || ''} - SIREN: ${settings?.companySIREN || ''}`,
      ``,
      `I - TVA COLLECTEE`,
      `  Ligne 5A - Taux 20%: Base HT = ${fmtVal(form.baseHT20)}, TVA = ${fmtVal(form.tvaCollectee20)}`,
      `  Ligne 5B - Taux 10%: Base HT = ${fmtVal(form.baseHT10)}, TVA = ${fmtVal(form.tvaCollectee10)}`,
      `  Ligne 5C - Taux 5.5%: Base HT = ${fmtVal(form.baseHT55)}, TVA = ${fmtVal(form.tvaCollectee55)}`,
      `  Ligne 5D - Taux 2.1%: Base HT = ${fmtVal(form.baseHT21)}, TVA = ${fmtVal(form.tvaCollectee21)}`,
      `  Ligne 16 - Total TVA brute due: ${fmtVal(form.totalTVABrute)}`,
      ``,
      `II - TVA DEDUCTIBLE`,
      `  Ligne 20 - Biens et services: ${fmtVal(form.tvaDeductibleBiensServices)}`,
      `  Ligne 21 - Immobilisations: ${fmtVal(form.tvaDeductibleImmobilisations)}`,
      `  Ligne 26 - Total déductions: ${fmtVal(form.totalDeductions)}`,
      ``,
      `III - TVA NETTE`,
      `  Ligne 28 - TVA nette: ${fmtVal(form.tvaNette)}`,
      `  Ligne 33 - Crédit TVA: ${fmtVal(form.creditTVA)}`,
      `  Ligne 54 - TVA nette due: ${fmtVal(form.tvaNetteDue)}`,
      `  Ligne 56 - Total à payer: ${fmtVal(form.totalAPayer)}`,
      ``,
      `Généré par Parfait Invoicing le ${new Date().toLocaleDateString('fr-FR')}`,
    ]
    await navigator.clipboard.writeText(lines.join('\n'))
    setCopiedAll(true)
    setTimeout(() => setCopiedAll(false), 3000)
  }

  const fmtVal = (v: number) => formatCurrency(v)
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount)
  }

  const renderCopyBtn = (value: number, fieldLabel: string) => (
    <button
      onClick={() => copyToClipboard(value, fieldLabel)}
      className="inline-flex items-center justify-center h-6 w-6 rounded hover:bg-muted transition-colors ml-1"
      title={`Copier ${fieldLabel}`}
    >
      {copiedField === fieldLabel ? (
        <Check className="h-3 w-3 text-green-600" />
      ) : (
        <Copy className="h-3 w-3 text-muted-foreground" />
      )}
    </button>
  )

  return (
    <div className="space-y-6">
      {/* Year Selector */}
      <Card className="bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200">
        <CardContent className="py-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-amber-900 flex items-center gap-2">
                TVA - Formulaire 3517-S
                <T text="Votre régime de TVA. Au régime simplifié, vous déclarez la TVA une fois par an (formulaire CA12 / 3517-S) au lieu de tous les mois." />
              </h2>
              <p className="text-sm text-amber-700">
                Déclaration annuelle de TVA (CA12) - Régime Simplifié d&apos;Imposition (RSI)
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Label className="text-sm font-medium text-amber-800">Exercice:</Label>
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
          <strong>Formulaire 3517-S / CA12.</strong> Déclaration annuelle de TVA pour l&apos;exercice clos le 30/11/{selectedYear}.
          Les données sont calculées automatiquement à partir de vos factures et transactions catégorisées.
          Vous pouvez copier les valeurs pour les coller sur <a href="https://cfspro.impots.gouv.fr" target="_blank" rel="noopener noreferrer" className="underline font-medium text-blue-600">impots.gouv.fr</a>.
        </AlertDescription>
      </Alert>

      {/* Generate Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Formulaire 3517-S / CA12
          </CardTitle>
          <CardDescription>
            Déclaration annuelle de TVA pour l&apos;exercice du 01/12/{selectedYear - 1} au 30/11/{selectedYear}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Manual inputs for TVA déductible */}
          <div className="p-4 bg-muted rounded-lg">
            <h4 className="font-semibold mb-3">Ajustements TVA déductible (optionnel)</h4>
            <p className="text-xs text-muted-foreground mb-3">
              Par défaut, la TVA déductible est estimée à 20% sur les dépenses catégorisées. Modifiez les valeurs ci-dessous pour affiner.
            </p>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs flex items-center">
                  TVA déductible biens et services
                  <T text="La TVA que vous avez payée sur vos achats professionnels (logiciels, fournitures, frais...). Vous pouvez la déduire de la TVA collectée." />
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  value={manualInputs.tvaDeductibleBiensServices}
                  onChange={(e) => setManualInputs({ ...manualInputs, tvaDeductibleBiensServices: parseFloat(e.target.value) || 0 })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs flex items-center">
                  TVA déductible immobilisations
                  <T text="La TVA sur vos investissements matériels (ordinateurs, mobilier, véhicules). Elle est déductible en totalité." />
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  value={manualInputs.tvaDeductibleImmobilisations}
                  onChange={(e) => setManualInputs({ ...manualInputs, tvaDeductibleImmobilisations: parseFloat(e.target.value) || 0 })}
                  className="mt-1"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <Button onClick={generate} disabled={generating}>
              {generating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Calculator className="h-4 w-4 mr-2" />}
              Générer le 3517-S
            </Button>
            {form && (
              <Button variant="outline" onClick={copyAllForImpots}>
                {copiedAll ? (
                  <><Check className="h-4 w-4 mr-2 text-green-600" /> Copié!</>
                ) : (
                  <><Clipboard className="h-4 w-4 mr-2" /> Copier tout pour impots.gouv.fr</>
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Result */}
      {form && (
        <>
          {/* Company Header */}
          {settings && (
            <Card>
              <CardContent className="py-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-lg">{settings.companyName}</h3>
                    <p className="text-sm text-muted-foreground">SIRET: {settings.companySIRET} | {settings.companyAddress}</p>
                    <p className="text-sm text-muted-foreground">
                      Exercice du {form.periodeStart} au {form.periodeEnd}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={form.status === 'filed' ? 'default' : 'secondary'}>
                      {form.status === 'filed' ? 'Déposé' : 'Brouillon'}
                    </Badge>
                    <a
                      href="https://cfspro.impots.gouv.fr"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
                    >
                      <ExternalLink className="h-3 w-3" />
                      impots.gouv.fr
                    </a>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Section I: TVA Collectée */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <span className="bg-amber-100 text-amber-800 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">I</span>
                TVA collectée
                <T text="C'est la TVA que vous avez facturée à vos clients sur vos ventes. Vous la collectez pour le compte de l'État, puis la reversez après déduction de la TVA sur vos achats." />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Taux</TableHead>
                      <TableHead className="text-right">Base HT</TableHead>
                      <TableHead className="text-right">TVA collectée</TableHead>
                      <TableHead className="text-right w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {/* Taux 20% */}
                    <TableRow>
                      <TableCell>
                        <span className="flex items-center font-medium">
                          Ligne 5A - Taux 20%
                          <T text="Le montant Hors Taxe (HT) de vos ventes au taux normal de 20%. C'est le prix de vos services avant ajout de la TVA." />
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        <div className="flex items-center justify-end">
                          {formatCurrency(form.baseHT20)}
                          {renderCopyBtn(form.baseHT20, 'base_ht_20')}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono font-semibold">
                        <div className="flex items-center justify-end">
                          {formatCurrency(form.tvaCollectee20)}
                          {renderCopyBtn(form.tvaCollectee20, 'tva_20')}
                        </div>
                      </TableCell>
                      <TableCell>
                        <T text="La TVA à 20% que vous avez ajoutée sur vos factures. Elle est calculée automatiquement : Base HT × 20%." />
                      </TableCell>
                    </TableRow>
                    {/* Taux 10% */}
                    <TableRow>
                      <TableCell>
                        <span className="flex items-center font-medium">
                          Ligne 5B - Taux 10%
                          <T text="Le montant HT de vos ventes au taux intermédiaire de 10% (restauration, transports, certains travaux)." />
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        <div className="flex items-center justify-end">
                          {formatCurrency(form.baseHT10)}
                          {renderCopyBtn(form.baseHT10, 'base_ht_10')}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono font-semibold">
                        <div className="flex items-center justify-end">
                          {formatCurrency(form.tvaCollectee10)}
                          {renderCopyBtn(form.tvaCollectee10, 'tva_10')}
                        </div>
                      </TableCell>
                      <TableCell>
                        <T text="La TVA à 10% collectée. Base HT × 10%." />
                      </TableCell>
                    </TableRow>
                    {/* Taux 5.5% */}
                    <TableRow>
                      <TableCell>
                        <span className="flex items-center font-medium">
                          Ligne 5C - Taux 5,5%
                          <T text="Le montant HT de vos ventes au taux réduit de 5.5% (livres, produits de première nécessité)." />
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        <div className="flex items-center justify-end">
                          {formatCurrency(form.baseHT55)}
                          {renderCopyBtn(form.baseHT55, 'base_ht_55')}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono font-semibold">
                        <div className="flex items-center justify-end">
                          {formatCurrency(form.tvaCollectee55)}
                          {renderCopyBtn(form.tvaCollectee55, 'tva_55')}
                        </div>
                      </TableCell>
                      <TableCell>
                        <T text="La TVA à 5.5% collectée. Base HT × 5.5%." />
                      </TableCell>
                    </TableRow>
                    {/* Taux 2.1% */}
                    <TableRow>
                      <TableCell>
                        <span className="flex items-center font-medium">
                          Ligne 5D - Taux 2,1%
                          <T text="Le montant HT de vos ventes au taux particulier de 2.1% (presse, certains médicaments)." />
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        <div className="flex items-center justify-end">
                          {formatCurrency(form.baseHT21)}
                          {renderCopyBtn(form.baseHT21, 'base_ht_21')}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono font-semibold">
                        <div className="flex items-center justify-end">
                          {formatCurrency(form.tvaCollectee21)}
                          {renderCopyBtn(form.tvaCollectee21, 'tva_21')}
                        </div>
                      </TableCell>
                      <TableCell>
                        <T text="La TVA à 2.1% collectée. Base HT × 2.1%." />
                      </TableCell>
                    </TableRow>
                    {/* Total TVA brute */}
                    <TableRow className="bg-muted font-bold">
                      <TableCell>
                        <span className="flex items-center">
                          Ligne 16 - Total TVA brute due
                          <T text="La somme de toute la TVA que vous avez collectée (tous taux confondus). C'est ce que vous devez à l'État avant déduction." />
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(form.totalBaseHT)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-amber-600">
                        <div className="flex items-center justify-end">
                          {formatCurrency(form.totalTVABrute)}
                          {renderCopyBtn(form.totalTVABrute, 'total_tva_brute')}
                        </div>
                      </TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>

              {/* Source data info */}
              <div className="mt-3 flex gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <T text="Le nombre de factures utilisées pour calculer la TVA collectée sur cette période." />
                  {form.nombreVentes} facture(s) utilisée(s)
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Section II: TVA Déductible */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <span className="bg-amber-100 text-amber-800 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">II</span>
                TVA déductible
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="flex items-center">
                    Ligne 20 - Biens et services
                    <T text="La TVA que vous avez payée sur vos achats professionnels (logiciels, fournitures, frais...). Vous pouvez la déduire de la TVA collectée." />
                  </span>
                  <div className="flex items-center">
                    <span className="font-mono">{formatCurrency(form.tvaDeductibleBiensServices)}</span>
                    {renderCopyBtn(form.tvaDeductibleBiensServices, 'tva_ded_bs')}
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="flex items-center">
                    Ligne 21 - Immobilisations
                    <T text="La TVA sur vos investissements matériels (ordinateurs, mobilier, véhicules). Elle est déductible en totalité." />
                  </span>
                  <div className="flex items-center">
                    <span className="font-mono">{formatCurrency(form.tvaDeductibleImmobilisations)}</span>
                    {renderCopyBtn(form.tvaDeductibleImmobilisations, 'tva_ded_immo')}
                  </div>
                </div>
                <Separator />
                <div className="flex justify-between items-center font-bold text-lg">
                  <span className="flex items-center">
                    Ligne 26 - Total déductions
                    <T text="La somme de toute la TVA que vous pouvez déduire. Elle sera soustraite de la TVA collectée." />
                  </span>
                  <div className="flex items-center">
                    <span className="font-mono text-emerald-600">-{formatCurrency(form.totalDeductions)}</span>
                    {renderCopyBtn(form.totalDeductions, 'total_deductions')}
                  </div>
                </div>
              </div>

              {/* Source data info */}
              <div className="mt-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <T text="Le nombre de transactions d'achats catégorisées utilisées pour estimer la TVA déductible." />
                  {form.nombreAchats} transaction(s) d&apos;achat(s) utilisée(s)
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Section III: TVA Nette */}
          <Card className={form.totalAPayer > 0 ? 'border-red-200 bg-red-50' : 'border-emerald-200 bg-emerald-50'}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <span className="bg-amber-100 text-amber-800 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">III</span>
                TVA nette
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="flex items-center">
                    Ligne 28 - TVA nette
                    <T text="C'est la différence entre la TVA collectée et la TVA déductible. Si positive = vous devez payer. Si négative = vous avez un crédit de TVA." />
                  </span>
                  <div className="flex items-center">
                    <span className={`font-mono font-bold ${form.tvaNette >= 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                      {formatCurrency(form.tvaNette)}
                    </span>
                    {renderCopyBtn(form.tvaNette, 'tva_nette')}
                  </div>
                </div>
                <div className="flex justify-between">
                  <span className="flex items-center">
                    Ligne 33 - Crédit de TVA
                    <T text="Si la TVA déductible dépasse la TVA collectée, vous avez un crédit. L'État vous remboursera ou vous pourrez le déduire sur la prochaine déclaration." />
                  </span>
                  <div className="flex items-center">
                    <span className="font-mono text-emerald-600">{formatCurrency(form.creditTVA)}</span>
                    {renderCopyBtn(form.creditTVA, 'credit_tva')}
                  </div>
                </div>
                <Separator />
                <div className="flex justify-between font-bold text-xl">
                  <span className="flex items-center">
                    Ligne 54 - TVA nette due
                    <T text="Le montant que vous devez régler à l'État. C'est la TVA nette due si elle est positive." />
                  </span>
                  <div className="flex items-center">
                    <span className={`font-mono ${form.tvaNetteDue > 0 ? 'text-red-700' : 'text-emerald-700'}`}>
                      {formatCurrency(form.tvaNetteDue)}
                    </span>
                    {renderCopyBtn(form.tvaNetteDue, 'tva_nette_due')}
                  </div>
                </div>
                <Separator />
                <div className="flex justify-between font-bold text-xl">
                  <span className="flex items-center">
                    Ligne 56 - Total à payer
                    <T text="Le montant que vous devez régler à l'État. C'est la TVA nette due si elle est positive." />
                  </span>
                  <div className="flex items-center">
                    <span className={`font-mono ${form.totalAPayer > 0 ? 'text-red-700' : 'text-emerald-700'}`}>
                      {formatCurrency(form.totalAPayer)}
                    </span>
                    {renderCopyBtn(form.totalAPayer, 'total_a_payer')}
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="mt-4 flex items-center justify-between">
                <Button variant="outline" onClick={save} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                  Enregistrer
                </Button>
                <Button onClick={copyAllForImpots} variant="default" className="bg-amber-600 hover:bg-amber-700">
                  {copiedAll ? (
                    <><Check className="h-4 w-4 mr-2" /> Copié!</>
                  ) : (
                    <><Clipboard className="h-4 w-4 mr-2" /> Copier tout pour impots.gouv.fr</>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {!form && !loading && (
        <Card>
          <CardContent className="py-12 text-center">
            <Percent className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-lg font-medium">Aucun formulaire 3517-S généré</p>
            <p className="text-muted-foreground mt-2">
              Ajustez vos valeurs de TVA déductible si nécessaire puis cliquez sur Générer.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Historique */}
      {formList.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Historique des déclarations TVA</CardTitle>
            <CardDescription>Vos formulaires 3517-S enregistrés</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Exercice</TableHead>
                    <TableHead className="text-right">TVA collectée</TableHead>
                    <TableHead className="text-right">TVA déductible</TableHead>
                    <TableHead className="text-right">TVA nette</TableHead>
                    <TableHead className="text-right">Total à payer</TableHead>
                    <TableHead>Statut</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {formList.map((f) => (
                    <TableRow key={f.id}>
                      <TableCell className="font-medium">{f.periodeStart || `01/12/${f.year - 1}`}</TableCell>
                      <TableCell className="text-right font-mono text-red-600">{formatCurrency(f.totalTVABrute)}</TableCell>
                      <TableCell className="text-right font-mono text-emerald-600">{formatCurrency(f.totalDeductions)}</TableCell>
                      <TableCell className="text-right font-mono font-semibold">
                        {formatCurrency(f.tvaNette)}
                      </TableCell>
                      <TableCell className="text-right font-mono font-bold">
                        {f.totalAPayer > 0 ? (
                          <span className="text-red-600">{formatCurrency(f.totalAPayer)}</span>
                        ) : (
                          <span className="text-emerald-600">Crédit: {formatCurrency(f.creditTVA)}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={f.status === 'filed' ? 'default' : 'secondary'}>
                          {f.status === 'filed' ? 'Déposé' : 'Brouillon'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
