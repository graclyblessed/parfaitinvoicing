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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import {
  FileText, Download, Loader2, Calculator, Building2, Euro,
  AlertCircle, CheckCircle, Info, Copy, Check, Clipboard,
  ExternalLink, Save, HelpCircle, Percent, ChevronDown
} from 'lucide-react'
import { toast } from 'sonner'

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
  const [activeTab, setActiveTab] = useState('formulaire')
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [copiedAll, setCopiedAll] = useState(false)
  const [nicheOpen, setNicheOpen] = useState(false)

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

  // Load the form matching the current selectedYear from the list
  const loadFormForYear = (forms: Formulaire3517S[], year: number) => {
    const match = forms.find(f => f.year === year)
    if (match) {
      setForm(match)
      setManualInputs({
        tvaDeductibleBiensServices: match.tvaDeductibleBiensServices,
        tvaDeductibleImmobilisations: match.tvaDeductibleImmobilisations,
      })
    } else {
      setForm(null)
      setManualInputs({ tvaDeductibleBiensServices: 0, tvaDeductibleImmobilisations: 0 })
    }
  }

  const fetchForms = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/formulaire-3517s')
      const data = await res.json()
      const forms = data.formulaires || []
      setFormList(forms)
      // Load the form for the currently selected year (not always the first!)
      loadFormForYear(forms, selectedYear)
    } catch (error) {
      console.error('Error fetching forms:', error)
    } finally {
      setLoading(false)
    }
  }

  // When year changes, load the matching form from the cached list
  const handleYearChange = (year: number) => {
    setSelectedYear(year)
    loadFormForYear(formList, year)
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
        // Refresh list but keep displaying the generated form
        try {
          const listRes = await fetch('/api/formulaire-3517s')
          const listData = await listRes.json()
          setFormList(listData.formulaires || [])
        } catch { /* ignore list refresh error */ }
        
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
        toast.success(msg)
      } else {
        toast.error('Erreur: ' + (data.error || 'Erreur inconnue'))
      }
    } catch (error) {
      console.error('Error generating 3517-S:', error)
      toast.error('Erreur lors de la génération')
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
        toast.success('Formulaire 3517-S mis à jour!')
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

  // Guide helpers
  const copyTextToClipboard = async (value: string, fieldKey: string) => {
    try {
      await navigator.clipboard.writeText(value)
      setCopiedField(fieldKey)
      setTimeout(() => setCopiedField(null), 2000)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = value
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
      setCopiedField(fieldKey)
      setTimeout(() => setCopiedField(null), 2000)
    }
  }

  const renderGuideAmountField = (label: string, value: number, fieldKey: string) => {
    const rounded = Math.round(value)
    return (
      <div className="flex items-start py-2 border-b border-gray-100 last:border-0 gap-3">
        <span className="text-sm text-gray-600 flex-1 leading-5">{label}</span>
        <div className="flex items-center gap-1 flex-shrink-0">
          {rounded === 0 ? (
            <span className="text-xs text-gray-400 font-mono px-2">0</span>
          ) : (
            <>
              <span className="font-mono text-sm font-bold bg-blue-50 text-blue-800 px-2 py-0.5 rounded">
                {rounded.toLocaleString('fr-FR')}
              </span>
              <button
                onClick={() => copyTextToClipboard(rounded.toString(), fieldKey)}
                className="inline-flex items-center justify-center h-6 w-6 rounded hover:bg-muted transition-colors"
                title="Copier"
              >
                {copiedField === fieldKey ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3 text-muted-foreground" />}
              </button>
            </>
          )}
        </div>
      </div>
    )
  }

  const renderGuideLabel = (label: string, badge: string, badgeColor = 'gray') => (
    <div className="flex items-center py-2 border-b border-gray-100 last:border-0 gap-3">
      <span className="text-sm text-gray-600 flex-1 leading-5">{label}</span>
      <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
        badgeColor === 'green' ? 'bg-green-100 text-green-800' :
        badgeColor === 'blue' ? 'bg-blue-100 text-blue-800' :
        badgeColor === 'red' ? 'bg-red-100 text-red-800' :
        'bg-gray-100 text-gray-500'
      }`}>{badge}</span>
    </div>
  )

  const renderGuideDoubleField = (label: string, baseHT: number, taxeDue: number, baseKey: string, taxeKey: string) => {
    const rBase = Math.round(baseHT)
    const rTaxe = Math.round(taxeDue)
    return (
      <div className="flex items-start py-2 border-b border-gray-100 last:border-0">
        <span className="text-sm text-gray-600 leading-5 min-w-0 pr-3 flex-1">{label}</span>
        <div className="flex items-center gap-3 flex-shrink-0">
          {/* Base HT column */}
          <div className="flex items-center gap-1 w-24 justify-end">
            {rBase === 0 ? (
              <span className="text-xs text-gray-400 font-mono">0</span>
            ) : (
              <>
                <span className="font-mono text-sm font-semibold bg-blue-50 text-blue-800 px-1.5 py-0.5 rounded">
                  {rBase.toLocaleString('fr-FR')}
                </span>
                <button
                  onClick={() => copyTextToClipboard(rBase.toString(), baseKey)}
                  className="inline-flex items-center justify-center h-6 w-6 rounded hover:bg-muted transition-colors"
                  title="Copier"
                >
                  {copiedField === baseKey ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3 text-muted-foreground" />}
                </button>
              </>
            )}
          </div>
          {/* Taxe due column */}
          <div className="flex items-center gap-1 w-24 justify-end">
            {rTaxe === 0 ? (
              <span className="text-xs text-gray-400 font-mono">0</span>
            ) : (
              <>
                <span className="font-mono text-sm font-semibold bg-blue-50 text-blue-800 px-1.5 py-0.5 rounded">
                  {rTaxe.toLocaleString('fr-FR')}
                </span>
                <button
                  onClick={() => copyTextToClipboard(rTaxe.toString(), taxeKey)}
                  className="inline-flex items-center justify-center h-6 w-6 rounded hover:bg-muted transition-colors"
                  title="Copier"
                >
                  {copiedField === taxeKey ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3 text-muted-foreground" />}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    )
  }

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
                onChange={(e) => handleYearChange(parseInt(e.target.value))}
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

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="formulaire">Formulaire 3517-S</TabsTrigger>
          <TabsTrigger value="guide3517">Guide saisie 3517-S</TabsTrigger>
        </TabsList>

        <TabsContent value="formulaire" className="space-y-6">
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
        </TabsContent>

        {/* ============================================ */}
        {/* GUIDE SAISIE 3517-S — impots.gouv.fr layout */}
        {/* ============================================ */}
        <TabsContent value="guide3517" className="space-y-6">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>Guide de saisie ligne par ligne.</strong> Ouvrez votre déclaration 3517-S sur{' '}
              <a href="https://cfspro.impots.gouv.fr" target="_blank" rel="noopener noreferrer" className="underline font-medium text-blue-600">
                impots.gouv.fr
              </a>{' '}
              et copiez chaque valeur ci-dessous dans le champ correspondant.
              Les valeurs en{' '}
              <span className="bg-blue-50 text-blue-800 px-1 rounded font-mono text-xs">bleu</span> sont des montants en euros entiers (arrondis).
            </AlertDescription>
          </Alert>

          {!form ? (
            <Card>
              <CardContent className="py-12 text-center">
                <FileText className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-lg font-medium">Générez d&apos;abord le formulaire 3517-S</p>
                <p className="text-muted-foreground mt-2 text-sm">
                  Allez dans l&apos;onglet &quot;Formulaire 3517-S&quot;, cliquez sur Générer.
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* ===================== PAGE 1 — Header ===================== */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Page 1 — En-tête / Déclaration néant</CardTitle>
                </CardHeader>
                <CardContent>
                  {renderGuideLabel(
                    'Si aucune case à remplir, cocher la case « Déclaration néant »',
                    'Non coché',
                    'gray'
                  )}
                </CardContent>
              </Card>

              {/* ===================== PAGE 2 — Opérations non taxées ===================== */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <span className="bg-amber-100 text-amber-800 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">I</span>
                    TVA BRUTE — Opérations non taxées (Page 2)
                  </CardTitle>
                  <CardDescription className="text-xs">Montants HT des opérations exonérées ou non imposables</CardDescription>
                </CardHeader>
                <CardContent>
                  {renderGuideAmountField('Ligne 01 — Achats en franchise de TVA / exportations', 0, 'g_3517_01')}
                  {renderGuideAmountField('Ligne 02 — Exportations hors UE', 0, 'g_3517_02')}
                  {renderGuideAmountField('Ligne 03 — Autres opérations non imposables', 0, 'g_3517_03')}
                  {renderGuideAmountField('Ligne 3A — Ventes à distance taxables dans un autre État membre', 0, 'g_3517_3a')}
                  {renderGuideAmountField('Ligne 3B — Mises à la consommation de produits pétroliers', 0, 'g_3517_3b')}
                  {renderGuideAmountField('Ligne 04 — Livraisons intracommunautaires à destination d\'une personne assujettie', 0, 'g_3517_04')}
                  {renderGuideAmountField('Ligne 4B — Ventes par assujetti non établi en France', 0, 'g_3517_4b')}
                  {renderGuideLabel('Taxe sur les vidéogrammes, TLV, CO2, etc.', 'Non coché', 'gray')}
                </CardContent>
              </Card>

              {/* ===================== PAGE 3 — Opérations taxées (France Métropolitaine) ===================== */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <span className="bg-amber-100 text-amber-800 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">I</span>
                    TVA BRUTE — Opérations taxées, France Métropolitaine (Page 3)
                  </CardTitle>
                  <CardDescription className="text-xs">Base HT et taxe due par taux d&apos;imposition</CardDescription>
                </CardHeader>
                <CardContent>
                  {/* Column headers */}
                  <div className="flex items-center pb-2 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase">
                    <span className="flex-1">Opération</span>
                    <div className="flex gap-3 flex-shrink-0">
                      <span className="w-24 text-right">Base HT</span>
                      <span className="w-24 text-right">Taxe due</span>
                    </div>
                  </div>
                  {/* Taux 20% */}
                  {renderGuideDoubleField('Ligne 5A — Taux normal 20%', form.baseHT20, form.tvaCollectee20, 'g_3517_5a_base', 'g_3517_5a_tva')}
                  {renderGuideDoubleField('Ligne 5B — Taux normal 20% produits pétroliers', 0, 0, 'g_3517_5b_base', 'g_3517_5b_tva')}
                  {/* Taux 5.5% */}
                  {renderGuideDoubleField('Ligne 06 — Taux réduit 5,5%', form.baseHT55, form.tvaCollectee55, 'g_3517_06_base', 'g_3517_06_tva')}
                  {/* Taux 10% */}
                  {renderGuideDoubleField('Ligne 6C — Taux réduit 10%', form.baseHT10, form.tvaCollectee10, 'g_3517_6c_base', 'g_3517_6c_tva')}
                </CardContent>
              </Card>

              {/* ===================== PAGE 3 — DOM + Autres opérations ===================== */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">TVA BRUTE — DOM, taux particuliers, autres opérations (Page 3)</CardTitle>
                  <CardDescription className="text-xs">Pour une SASU classique métropolitaine, toutes ces lignes sont à 0</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center pb-2 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase">
                    <span className="flex-1">Opération</span>
                    <div className="flex gap-3 flex-shrink-0">
                      <span className="w-24 text-right">Base HT</span>
                      <span className="w-24 text-right">Taxe due</span>
                    </div>
                  </div>
                  {renderGuideDoubleField('Ligne 07 — DOM Taux normal 8,5%', 0, 0, 'g_3517_07_base', 'g_3517_07_tva')}
                  {renderGuideDoubleField('Ligne 08 — DOM Taux réduit 2,1%', form.baseHT21, form.tvaCollectee21, 'g_3517_08_base', 'g_3517_08_tva')}
                  {renderGuideDoubleField('Ligne 09 — Opérations imposables à un taux particulier', 0, 0, 'g_3517_09_base', 'g_3517_09_tva')}
                  {renderGuideDoubleField('Ligne 9A — Taux réduit 13% produits pétroliers', 0, 0, 'g_3517_9a_base', 'g_3517_9a_tva')}
                  {renderGuideDoubleField('Ligne 10 — Anciens taux', 0, 0, 'g_3517_10_base', 'g_3517_10_tva')}
                  {renderGuideDoubleField('Ligne AA — Achats d\'électricité, gaz, chaleur, froid imposables', 0, 0, 'g_3517_aa_base', 'g_3517_aa_tva')}
                  {renderGuideDoubleField('Ligne AB — Achats auprès d\'assujetti non établi (art 283-1)', 0, 0, 'g_3517_ab_base', 'g_3517_ab_tva')}
                  {renderGuideDoubleField('Ligne AC — Achats de prestations auprès d\'assujetti non établi (art 283-2)', 0, 0, 'g_3517_ac_base', 'g_3517_ac_tva')}
                  <Separator />
                  {renderGuideDoubleField('Ligne 11 — Cessions d\'immobilisations', 0, 0, 'g_3517_11_base', 'g_3517_11_tva')}
                  {renderGuideDoubleField('Ligne 12 — Livraisons à soi-même', 0, 0, 'g_3517_12_base', 'g_3517_12_tva')}
                  {renderGuideDoubleField('Ligne 13 — Autres opérations imposables', 0, 0, 'g_3517_13_base', 'g_3517_13_tva')}
                  <Separator />
                  {/* Ligne 16 — TOTAL (taxe due column only) */}
                  <div className="flex items-start py-3 bg-muted/50 rounded px-2 -mx-2 border border-amber-200">
                    <span className="text-sm font-bold text-gray-800 leading-5 pr-3 flex-1">Ligne 16 — TOTAL DE LA TAXE DUE (lignes 5A à 13)</span>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <div className="w-24 text-right">
                        <span className="text-xs text-gray-400 font-mono">—</span>
                      </div>
                      <div className="flex items-center gap-1 w-24 justify-end">
                        <span className="font-mono text-sm font-bold bg-amber-100 text-amber-900 px-2 py-0.5 rounded">
                          {Math.round(form.totalTVABrute).toLocaleString('fr-FR')}
                        </span>
                        <button
                          onClick={() => copyTextToClipboard(Math.round(form.totalTVABrute).toString(), 'g_3517_16')}
                          className="inline-flex items-center justify-center h-6 w-6 rounded hover:bg-muted transition-colors"
                          title="Copier"
                        >
                          {copiedField === 'g_3517_16' ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3 text-muted-foreground" />}
                        </button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* ===================== PAGE 4 — Autre TVA due + TVA DÉDUCTIBLE ===================== */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <span className="bg-amber-100 text-amber-800 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">I</span>
                    Autre TVA due + Total TVA brute due (Page 4)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {renderGuideAmountField('Ligne 17 — Remboursements provisionnels', 0, 'g_3517_17')}
                  {renderGuideAmountField('Ligne 18 — TVA antérieurement déduite à reverser', 0, 'g_3517_18')}
                  {renderGuideAmountField('Ligne AD — Sommes à ajouter', 0, 'g_3517_ad')}
                  <Separator />
                  {/* Ligne 19 — TOTAL TVA BRUTE DUE */}
                  <div className="flex items-start py-3 bg-muted/50 rounded px-2 -mx-2 border border-amber-200">
                    <span className="text-sm font-bold text-gray-800 leading-5 flex-1">Ligne 19 — TOTAL TVA BRUTE DUE (lignes 16 + 17 + 18 + AD)</span>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <span className="font-mono text-sm font-bold bg-amber-100 text-amber-900 px-2 py-0.5 rounded">
                        {Math.round(form.totalTVABrute).toLocaleString('fr-FR')}
                      </span>
                      <button
                        onClick={() => copyTextToClipboard(Math.round(form.totalTVABrute).toString(), 'g_3517_19')}
                        className="inline-flex items-center justify-center h-6 w-6 rounded hover:bg-muted transition-colors"
                        title="Copier"
                      >
                        {copiedField === 'g_3517_19' ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3 text-muted-foreground" />}
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* ===================== PAGE 4 — TVA DÉDUCTIBLE ===================== */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <span className="bg-amber-100 text-amber-800 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">II</span>
                    TVA DÉDUCTIBLE (Page 4)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs font-semibold uppercase text-gray-500 mb-1">Déductions sur biens et services</p>
                  {renderGuideAmountField('Ligne 20 — Déductions sur factures d\'achats', form.tvaDeductibleBiensServices, 'g_3517_20')}
                  {renderGuideAmountField('Ligne 21 — Déductions forfaitaires', 0, 'g_3517_21')}
                  {/* Ligne 22 — sous-total */}
                  <div className="flex items-start py-2 border-b border-gray-100 gap-3">
                    <span className="text-sm font-semibold text-gray-700 flex-1 leading-5">Ligne 22 — Total (lignes 20 + 21)</span>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <span className="font-mono text-sm font-semibold bg-blue-50 text-blue-800 px-2 py-0.5 rounded">
                        {Math.round(form.tvaDeductibleBiensServices).toLocaleString('fr-FR')}
                      </span>
                      <button
                        onClick={() => copyTextToClipboard(Math.round(form.tvaDeductibleBiensServices).toString(), 'g_3517_22')}
                        className="inline-flex items-center justify-center h-6 w-6 rounded hover:bg-muted transition-colors"
                        title="Copier"
                      >
                        {copiedField === 'g_3517_22' ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3 text-muted-foreground" />}
                      </button>
                    </div>
                  </div>
                  <Separator />
                  <p className="text-xs font-semibold uppercase text-gray-500 mb-1">Immobilisations et autres déductions</p>
                  {renderGuideAmountField('Ligne 23 — TVA déductible sur immobilisations', form.tvaDeductibleImmobilisations, 'g_3517_23')}
                  {renderGuideAmountField('Ligne 24 — Crédit antérieur non imputé', 0, 'g_3517_24')}
                  {renderGuideAmountField('Ligne 25 — Omissions ou compléments de déductions', 0, 'g_3517_25')}
                  {renderGuideAmountField('Ligne 25A — Compte tenu du coefficient de déduction', 0, 'g_3517_25a')}
                  {renderGuideAmountField('Ligne AE — Sommes à imputer', 0, 'g_3517_ae')}
                  <Separator />
                  {/* Ligne 26 — TOTAL TVA DÉDUCTIBLE */}
                  <div className="flex items-start py-3 bg-muted/50 rounded px-2 -mx-2 border border-emerald-200">
                    <span className="text-sm font-bold text-gray-800 leading-5 flex-1">Ligne 26 — TOTAL TVA DÉDUCTIBLE</span>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <span className="font-mono text-sm font-bold bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded">
                        -{Math.round(form.totalDeductions).toLocaleString('fr-FR')}
                      </span>
                      <button
                        onClick={() => copyTextToClipboard(Math.round(form.totalDeductions).toString(), 'g_3517_26')}
                        className="inline-flex items-center justify-center h-6 w-6 rounded hover:bg-muted transition-colors"
                        title="Copier"
                      >
                        {copiedField === 'g_3517_26' ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3 text-muted-foreground" />}
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* ===================== PAGE 5 — III. TVA NETTE ===================== */}
              <Card className={form.tvaNetteDue > 0 ? 'border-red-200' : 'border-emerald-200'}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <span className="bg-amber-100 text-amber-800 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">III</span>
                    TVA NETTE — Résultat de la liquidation (Page 5)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {form.tvaNette >= 0 ? (
                    <>
                      {renderGuideAmountField('Ligne 28 — TVA due (ligne 19 − ligne 26)', form.tvaNette, 'g_3517_28')}
                      {renderGuideAmountField('Ligne 29 — ou Crédit (ligne 26 − ligne 19)', 0, 'g_3517_29')}
                    </>
                  ) : (
                    <>
                      {renderGuideAmountField('Ligne 28 — TVA due (ligne 19 − ligne 26)', 0, 'g_3517_28')}
                      {renderGuideAmountField('Ligne 29 — ou Crédit (ligne 26 − ligne 19)', Math.abs(form.tvaNette), 'g_3517_29')}
                    </>
                  )}
                  {renderGuideAmountField('Ligne 30 — Acomptes payés et/ou restant dus', 0, 'g_3517_30')}
                  <Separator />
                  {/* Solde */}
                  {form.tvaNetteDue > 0 ? (
                    <div className="flex items-start py-3 bg-red-50 rounded px-2 -mx-2 border border-red-200">
                      <span className="text-sm font-bold text-red-800 leading-5 flex-1">Ligne 33 — SOLDE DÛ</span>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <span className="font-mono text-sm font-bold bg-red-100 text-red-800 px-2 py-0.5 rounded">
                          {Math.round(form.tvaNetteDue).toLocaleString('fr-FR')}
                        </span>
                        <button
                          onClick={() => copyTextToClipboard(Math.round(form.tvaNetteDue).toString(), 'g_3517_33')}
                          className="inline-flex items-center justify-center h-6 w-6 rounded hover:bg-red-100 transition-colors"
                          title="Copier"
                        >
                          {copiedField === 'g_3517_33' ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3 text-muted-foreground" />}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start py-3 bg-emerald-50 rounded px-2 -mx-2 border border-emerald-200">
                      <span className="text-sm font-bold text-emerald-800 leading-5 flex-1">Ligne 34 — EXCÉDENT DE VERSEMENT</span>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <span className="font-mono text-sm font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">
                          {Math.round(form.creditTVA).toLocaleString('fr-FR')}
                        </span>
                        <button
                          onClick={() => copyTextToClipboard(Math.round(form.creditTVA).toString(), 'g_3517_34')}
                          className="inline-flex items-center justify-center h-6 w-6 rounded hover:bg-emerald-100 transition-colors"
                          title="Copier"
                        >
                          {copiedField === 'g_3517_34' ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3 text-muted-foreground" />}
                        </button>
                      </div>
                    </div>
                  )}
                  {form.tvaNetteDue <= 0 && (
                    renderGuideAmountField('Ligne 35 — Solde excédentaire', form.creditTVA > 0 ? form.creditTVA : 0, 'g_3517_35')
                  )}
                </CardContent>
              </Card>

              {/* ===================== PAGE 5 — IV. Taxes assimilées ===================== */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <span className="bg-amber-100 text-amber-800 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">IV</span>
                    Taxes assimilées (Page 5)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center pb-2 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase">
                    <span className="flex-1">Taxe</span>
                    <div className="flex gap-3 flex-shrink-0">
                      <span className="w-24 text-right">Base</span>
                      <span className="w-24 text-right">Taxe</span>
                    </div>
                  </div>
                  {renderGuideDoubleField('Ligne 36 — Taxe sur cession droits audiovisuels (5%)', 0, 0, 'g_3517_36_base', 'g_3517_36_tva')}
                  {renderGuideAmountField('Ligne 37 — Taxe exploitants agricoles', 0, 'g_3517_37')}
                </CardContent>
              </Card>

              {/* ===================== PAGES 6-10 — Taxes assimilées (suite) + Récapitulation ===================== */}
              <Collapsible open={nicheOpen} onOpenChange={setNicheOpen}>
                <Card>
                  <CollapsibleTrigger asChild>
                    <CardHeader className="pb-2 cursor-pointer hover:bg-muted/50 rounded-t-lg transition-colors">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-base">Pages 6-10 — Taxes assimilées (suite) + Récapitulation</CardTitle>
                          <CardDescription className="text-xs mt-1">
                            Taxes spécifiques (SASU classique : toutes à 0) + solde à payer + acomptes
                          </CardDescription>
                        </div>
                        <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform ${nicheOpen ? 'rotate-180' : ''}`} />
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="pt-0 space-y-6">
                      {/* Taxes assimilées (suite) */}
                      <div>
                        <p className="text-xs font-semibold uppercase text-gray-500 mb-2">Taxes assimilées (Pages 6-8)</p>
                        {renderGuideAmountField('Ligne 44 — Taxe huissiers', 0, 'g_3517_44')}
                        {renderGuideAmountField('Ligne 45 — Taxe employeurs main-d\'oeuvre étrangère', 0, 'g_3517_45')}
                        {renderGuideAmountField('Ligne 46 — Taxe formation professionnelle automobile', 0, 'g_3517_46')}
                        {renderGuideAmountField('Ligne 47 — Taxe dépenses publicité', 0, 'g_3517_47')}
                        {renderGuideAmountField('Ligne 4F — Taxe spéciale sur certains véhicules', 0, 'g_3517_4f')}
                        {renderGuideAmountField('Ligne 4K — Taxe sur les lustres métalliques', 0, 'g_3517_4k')}
                        {renderGuideAmountField('Ligne 4L — Taxe sur les contributions additionsales', 0, 'g_3517_4l')}
                        {renderGuideAmountField('Ligne 4M — Autres taxes', 0, 'g_3517_4m')}
                        <Separator />
                        <p className="text-xs font-semibold uppercase text-gray-500 mb-2">Contributions sur boissons</p>
                        {renderGuideAmountField('Ligne 88 — Droit de circulation', 0, 'g_3517_88')}
                        {renderGuideAmountField('Ligne 89 — Droit de consommation', 0, 'g_3517_89')}
                        {renderGuideAmountField('Ligne 90 — Cotisation assimilée TVA', 0, 'g_3517_90')}
                        <Separator />
                        {renderGuideAmountField('Ligne 93 — TSN (Taxe spéciale sur les navires)', 0, 'g_3517_93')}
                        {renderGuideAmountField('Ligne 94 — Taxe plateformes mise en relation', 0, 'g_3517_94')}
                      </div>

                      {/* VI — Récapitulation */}
                      <div>
                        <p className="text-xs font-semibold uppercase text-gray-500 mb-2 flex items-center gap-2">
                          <span className="bg-amber-100 text-amber-800 rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-bold">VI</span>
                          Récapitulation — Crédit ou excédent
                        </p>
                        {renderGuideAmountField('Ligne 49 — Solde excédentaire (report ligne 35)', form.creditTVA > 0 ? form.creditTVA : 0, 'g_3517_49')}
                        {renderGuideAmountField('Ligne 50 — Remboursement demandé (formulaire 3517 DDR)', 0, 'g_3517_50')}
                        {renderGuideAmountField('Ligne 51 — Crédit à reporter (prochaine CA12)', 0, 'g_3517_51')}
                        {renderGuideAmountField('Ligne 52 — Crédit imputé sur prochains acomptes', 0, 'g_3517_52')}
                      </div>

                      <Separator />

                      {/* SOLDE À PAYER */}
                      <div>
                        <p className="text-xs font-semibold uppercase text-gray-500 mb-2">Solde à payer</p>
                        {renderGuideAmountField('Ligne 54 — TVA nette due (ligne 33 − ligne X5)', form.tvaNetteDue, 'g_3517_54')}
                        {renderGuideAmountField('Ligne 55 — Taxes assimilées (total lignes 36 à 94)', 0, 'g_3517_55')}
                        {/* Ligne 56 — TOTAL À PAYER */}
                        <div className="flex items-start py-3 bg-muted/50 rounded px-2 -mx-2 border border-amber-200">
                          <span className="text-sm font-bold text-gray-800 leading-5 flex-1">Ligne 56 — TOTAL À PAYER</span>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <span className="font-mono text-sm font-bold bg-amber-100 text-amber-900 px-2 py-0.5 rounded">
                              {Math.round(form.totalAPayer).toLocaleString('fr-FR')}
                            </span>
                            <button
                              onClick={() => copyTextToClipboard(Math.round(form.totalAPayer).toString(), 'g_3517_56')}
                              className="inline-flex items-center justify-center h-6 w-6 rounded hover:bg-muted transition-colors"
                              title="Copier"
                            >
                              {copiedField === 'g_3517_56' ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3 text-muted-foreground" />}
                            </button>
                          </div>
                        </div>
                      </div>

                      <Separator />

                      {/* Acomptes section */}
                      <div>
                        <p className="text-xs font-semibold uppercase text-gray-500 mb-2">Acomptes — Base de calcul pour l&apos;année suivante</p>
                        {renderGuideAmountField('Ligne 57 — TVA : base de calcul des acomptes', form.totalTVABrute, 'g_3517_57')}
                        {renderGuideLabel('Ligne 58 — 1er acompte (Juillet) — cochez si applicable', 'Non coché', 'gray')}
                        {renderGuideLabel('Ligne 58 — 2e acompte (Décembre) — cochez si applicable', 'Non coché', 'gray')}
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>

              {/* ===================== Récapitulatif TVA calculé ===================== */}
              <Card className="border-amber-200 bg-amber-50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-amber-800">Récapitulatif TVA calculé</CardTitle>
                  <p className="text-xs text-amber-700">
                    Résumé des valeurs calculées automatiquement à partir de vos données.
                  </p>
                </CardHeader>
                <CardContent className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-amber-700">Total base HT</span>
                    <span className="font-mono font-bold text-amber-900">{Math.round(form.totalBaseHT).toLocaleString('fr-FR')} EUR</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-amber-700">Total TVA collectée (ligne 19)</span>
                    <span className="font-mono font-bold text-amber-900">{Math.round(form.totalTVABrute).toLocaleString('fr-FR')} EUR</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-amber-700">Total TVA déductible (ligne 26)</span>
                    <span className="font-mono text-amber-900">{Math.round(form.totalDeductions).toLocaleString('fr-FR')} EUR</span>
                  </div>
                  <div className="flex justify-between font-bold border-t border-amber-200 pt-1 mt-1">
                    <span className="text-amber-900">TVA nette (ligne 28)</span>
                    <span className="font-mono text-amber-900">{Math.round(form.tvaNette).toLocaleString('fr-FR')} EUR</span>
                  </div>
                  {form.tvaNetteDue > 0 && (
                    <div className="flex justify-between font-bold border-t border-amber-300 pt-1 mt-1">
                      <span className="text-red-800">Solde à payer (ligne 56)</span>
                      <span className="font-mono text-red-800">{Math.round(form.totalAPayer).toLocaleString('fr-FR')} EUR</span>
                    </div>
                  )}
                  {form.creditTVA > 0 && (
                    <div className="flex justify-between font-bold border-t border-amber-300 pt-1 mt-1">
                      <span className="text-emerald-800">Crédit de TVA (ligne 34)</span>
                      <span className="font-mono text-emerald-800">{Math.round(form.creditTVA).toLocaleString('fr-FR')} EUR</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
