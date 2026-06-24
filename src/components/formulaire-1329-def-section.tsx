'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  FileText,
  Loader2,
  Calculator,
  CheckCircle,
  Info,
  AlertTriangle,
  Calendar,
  ExternalLink,
  Save,
  Send,
  Users,
  TrendingUp,
  Clock,
  Euro,
  Sparkles,
  RefreshCw,
  Copy,
  Check,
  PencilLine,
  Lock,
  FileSearch,
  Receipt,
  Building2,
  ArrowRight,
} from 'lucide-react'
import { toast } from 'sonner'

interface Formulaire1329DEFSectionProps {
  settings: { companyName: string; companySIRET: string; companySIREN: string; vatRegime: string } | null
}

interface CVAEResult {
  ligne01_CA: number
  ligne04_pourcentage_VA: number
  ligne05_VA_produite: number
  ligne05b_VA_plafonnee: number
  ligne06_limitation_non_applicable: boolean
  ligne07_CVAE_brute: number
  ligne08_cotisation_avant_reduction: number
  ligne09_exonerations: number
  ligne10_reduction_supplementaire: number
  ligne11_CVAE_due: number
  ligne12_acomptes_CVAE: number
  ligne13_solde_CVAE_payer: number
  ligne14_excedent_CVAE: number
  ligne15_taxe_add_due: number
  ligne16_acomptes_taxe_add: number
  ligne17_solde_taxe_add_payer: number
  ligne18_excedent_taxe_add: number
  ligne20_contrib_compl_due: number
  ligne21_acompte_contrib_compl: number
  ligne22_solde_contrib_payer: number
  ligne23_excedent_contrib: number
  ligne24_total_acomptes: number
  ligne25_total_payer: number
  ligne26_total_excedents: number
  ligne27_CVAE_DUE_paiement: number
  ligne28_excedent_versement: number
  taux_effectif: number
  franchise_appliquee: boolean
  degrevement_applique: boolean
  cessation_2026: boolean
  exonere_taxe_additionnelle: boolean
}

interface AutoCalc {
  chiffreAffaires: number
  servicesExterieurs: number
  valeurAjoutee: number
  chargesExclues: number
  nombreTransactions: number
  periodeLabel: string
}

interface Data {
  year: number
  calculation: CVAEResult
  inputs: {
    caHT: number
    valeurAjoutee: number
    effectifsSalaries: number
    cessation2026: boolean
    limitationVANonApplicable: boolean
    exonereTaxeAdditionnelle: boolean
    exonerations: number
    acomptesCVAE: number
    acomptesTaxeAdd: number
    acompteContribCompl: number
  }
  form: { id: string; status: string; reference: string | null; filedAt: string | null } | null
  deadline: { dueDate: string; daysUntilDue: number; isOverdue: boolean }
  autoCalc: AutoCalc | null
}

export function Formulaire1329DEFSection({ settings }: Formulaire1329DEFSectionProps) {
  const currentYear = new Date().getFullYear()
  const [year, setYear] = useState(currentYear - 1)
  const [data, setData] = useState<Data | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [copiedLine, setCopiedLine] = useState<string | null>(null)

  // À SAISIR fields
  const [caHT, setCaHT] = useState('')
  const [va, setVa] = useState('')
  const [acomptesCVAE, setAcomptesCVAE] = useState('')
  const [acomptesTaxeAdd, setAcomptesTaxeAdd] = useState('')
  const [acompteContrib, setAcompteContrib] = useState('')
  // Optional
  const [effectifs, setEffectifs] = useState(0)
  const [cessation, setCessation] = useState(false)
  const [limitationVA, setLimitationVA] = useState(false)
  const [exonereTaxeAdd, setExonereTaxeAdd] = useState(false)
  const [exonerations, setExonerations] = useState('')
  const [reference, setReference] = useState('')
  const [filedAt, setFiledAt] = useState(new Date().toISOString().split('T')[0])
  const [autoFilled, setAutoFilled] = useState(true)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/declarations/1329-def?year=${year}`)
      if (!res.ok) throw new Error('Erreur API')
      const d: Data = await res.json()
      setData(d)
      const autoCA = d.autoCalc?.chiffreAffaires ?? 0
      const autoVA = d.autoCalc?.valeurAjoutee ?? 0
      const useCA = d.form ? (d.inputs.caHT ?? 0) : autoCA
      const useVA = d.form ? (d.inputs.valeurAjoutee ?? 0) : autoVA
      setCaHT(useCA ? useCA.toString() : '')
      setVa(useVA ? useVA.toString() : '')
      setAutoFilled(!d.form)
      setAcomptesCVAE(d.inputs.acomptesCVAE?.toString() || '')
      setAcomptesTaxeAdd(d.inputs.acomptesTaxeAdd?.toString() || '')
      setAcompteContrib(d.inputs.acompteContribCompl?.toString() || '')
      setEffectifs(d.inputs.effectifsSalaries || 0)
      setCessation(d.inputs.cessation2026 || false)
      setLimitationVA(d.inputs.limitationVANonApplicable || false)
      setExonereTaxeAdd(d.inputs.exonereTaxeAdditionnelle || false)
      setExonerations(d.inputs.exonerations?.toString() || '')
      setReference(d.form?.reference || '')
      setFiledAt(d.form?.filedAt ? d.form.filedAt.split('T')[0] : new Date().toISOString().split('T')[0])
    } catch (e) {
      console.error(e)
      toast.error('Impossible de charger le formulaire 1329-DEF')
    } finally {
      setLoading(false)
    }
  }, [year])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const fmt = (n: number) =>
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n || 0)
  const fmtPlain = (n: number) => new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n || 0)
  const fmtDate = (s: string) => new Date(s).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
  const num = (s: string) => (s === '' || isNaN(parseFloat(s)) ? 0 : parseFloat(s))

  const copyValue = async (line: string, value: number | string) => {
    try {
      await navigator.clipboard.writeText(String(value))
      setCopiedLine(line)
      toast.success(`Ligne ${line} copiée : ${value}`)
      setTimeout(() => setCopiedLine(null), 2000)
    } catch {
      toast.error('Copie impossible')
    }
  }

  const recalcFromTransactions = () => {
    if (data?.autoCalc) {
      const ac = data.autoCalc
      setCaHT(ac.chiffreAffaires ? ac.chiffreAffaires.toString() : '')
      setVa(ac.valeurAjoutee ? ac.valeurAjoutee.toString() : '')
      setAutoFilled(true)
      toast.success(`Recalculé depuis ${ac.nombreTransactions} transactions (${ac.periodeLabel})`)
    } else {
      toast.info('Aucune transaction trouvée pour cet exercice')
    }
  }

  const handleSave = async (action: 'save' | 'file') => {
    if (action === 'file' && !reference.trim()) {
      toast.error("Veuillez saisir la référence de l'accusé de réception")
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/declarations/1329-def', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          year,
          action,
          inputs: {
            caHT: num(caHT), valeurAjoutee: num(va), effectifsSalaries: effectifs,
            cessation2026: cessation, limitationVANonApplicable: limitationVA,
            exonereTaxeAdditionnelle: exonereTaxeAdd, exonerations: num(exonerations),
            acomptesCVAE: num(acomptesCVAE), acomptesTaxeAdd: num(acomptesTaxeAdd),
            acompteContribCompl: num(acompteContrib),
          },
          reference: reference.trim(), filedAt,
        }),
      })
      const d = await res.json()
      if (d.success) { toast.success(d.message); fetchData() }
      else toast.error(d.error || 'Erreur')
    } catch (e) { console.error(e); toast.error('Erreur réseau') }
    finally { setSaving(false) }
  }

  const isFiled = data?.form?.status === 'filed'
  const calc = data?.calculation
  const overdue = data?.deadline?.isOverdue
  const autoCalc = data?.autoCalc
  const caNum = num(caHT)
  const isEligible = caNum > 500000
  const mustFile = caNum > 152500

  // Field row component — mirrors the PDF structure
  // "type" controls the visual: 'saisir' = you type it, 'auto' = impots.gouv.fr calculates it
  const FormLine = ({
    line,
    label,
    value,
    type, // 'saisir' | 'auto'
    where,
    children,
    highlight,
  }: {
    line: string
    label: string
    value?: number
    type: 'saisir' | 'auto'
    where?: string
    children?: React.ReactNode
    highlight?: 'result' | 'zero'
  }) => {
    const isCopied = copiedLine === line
    return (
      <div className={`border rounded-lg p-4 transition-all ${
        type === 'saisir' ? 'border-blue-300 bg-blue-50/30' : 'border-border bg-card'
      } ${highlight === 'result' ? 'ring-2 ring-rose-300 border-rose-300' : ''} ${highlight === 'zero' ? 'opacity-60' : ''}`}>
        <div className="flex items-start gap-3">
          {/* Line number badge */}
          <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm ${
            type === 'saisir' ? 'bg-blue-500 text-white' : 'bg-muted text-muted-foreground'
          }`}>
            {line}
          </div>
          {/* Label + where to find */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-medium">{label}</p>
              {type === 'saisir' ? (
                <Badge variant="outline" className="text-[10px] bg-blue-100 text-blue-700 border-blue-400">
                  <PencilLine className="h-3 w-3 mr-0.5" />À SAISIR
                </Badge>
              ) : (
                <Badge variant="outline" className="text-[10px] bg-slate-100 text-slate-500 border-slate-300">
                  <Lock className="h-3 w-3 mr-0.5" />AUTO sur impots.gouv.fr
                </Badge>
              )}
            </div>
            {where && (
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                <FileSearch className="h-3 w-3" />
                {where}
              </p>
            )}
            {children && <div className="mt-2">{children}</div>}
          </div>
          {/* Value + copy button (only for auto fields or computed) */}
          {value !== undefined && (
            <div className="flex-shrink-0 flex items-center gap-2">
              <div className="text-right">
                <p className={`font-mono font-bold ${highlight === 'result' ? 'text-2xl text-rose-600' : 'text-lg'}`}>
                  {fmt(value)}
                </p>
              </div>
              {value !== 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 w-8 p-0"
                  onClick={() => copyValue(line, fmtPlain(value))}
                  title="Copier cette valeur"
                >
                  {isCopied ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2 text-xl">
                <FileText className="h-5 w-5 text-rose-600" />
                Formulaire 1329-DEF — Aide au remplissage
              </CardTitle>
              <CardDescription className="mt-1">
                Suivez les valeurs ci-dessous pour remplir le formulaire sur impots.gouv.fr
                <br />
                <span className="text-xs">Loi de finances 2025 · Échéance : 5 mai {year + 1}</span>
              </CardDescription>
            </div>
            <div className="flex flex-col gap-2 items-start md:items-end">
              {isFiled ? (
                <Badge variant="default" className="bg-emerald-600 hover:bg-emerald-600">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Télétransmis {data?.form?.filedAt ? `le ${fmtDate(data.form.filedAt)}` : ''}
                </Badge>
              ) : overdue ? (
                <Badge variant="destructive">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  En retard de {Math.abs(data?.deadline?.daysUntilDue || 0)} jour(s)
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300">
                  <Clock className="h-3 w-3 mr-1" />
                  Dans {data?.deadline?.daysUntilDue || 0} jour(s)
                </Badge>
              )}
              <Select value={year.toString()} onValueChange={(v) => setYear(parseInt(v))}>
                <SelectTrigger className="w-[180px]">
                  <Calendar className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[currentYear - 2, currentYear - 1, currentYear, currentYear + 1].map((y) => (
                    <SelectItem key={y} value={y.toString()}>
                      Exercice {y} (dépôt {y + 1})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* How to use */}
      <Alert className="border-blue-200 bg-blue-50/50">
        <Info className="h-4 w-4 text-blue-600" />
        <AlertDescription>
          <strong>Comment remplir le formulaire sur impots.gouv.fr :</strong>
          <ol className="list-decimal list-inside mt-2 space-y-1 text-sm">
            <li>Les champs en <Badge variant="outline" className="text-[10px] bg-blue-100 text-blue-700 border-blue-400 mx-1"><PencilLine className="h-3 w-3 inline mr-0.5" />À SAISIR</Badge> sont les seuls que vous tapez sur impots.gouv.fr</li>
            <li>Les champs en <Badge variant="outline" className="text-[10px] bg-slate-100 text-slate-500 border-slate-300 mx-1"><Lock className="h-3 w-3 inline mr-0.5" />AUTO</Badge> sont calculés automatiquement par impots.gouv.fr — ne les tapez pas</li>
            <li>Utilisez le bouton <Copy className="h-3 w-3 inline mx-1" /> pour copier chaque valeur et la coller dans impots.gouv.fr</li>
            <li>Vérifiez toujours avec votre expert-comptable avant de télétransmettre</li>
          </ol>
        </AlertDescription>
      </Alert>

      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {!loading && calc && (
        <>
          {/* Eligibility check */}
          <Card className={mustFile ? 'border-amber-300' : 'border-emerald-300'}>
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                {mustFile ? (
                  <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                ) : (
                  <CheckCircle className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                )}
                <div className="text-sm">
                  <p className="font-semibold">
                    {caNum === 0
                      ? 'Saisissez votre chiffre d\'affaires (ligne 01) pour vérifier votre éligibilité'
                      : mustFile
                      ? `CA = ${fmt(caNum)} → Vous êtes redevable (CA > 152 500 €). Dépôt de la 1329-DEF obligatoire.`
                      : `CA = ${fmt(caNum)} → Vous n'êtes pas redevable (CA ≤ 152 500 €). Aucune déclaration à déposer.`}
                  </p>
                  {isEligible && (
                    <p className="text-xs text-muted-foreground mt-1">
                      CA &gt; 500 000 € → imposition effective. Le dépôt reste obligatoire même si le montant final est 0 €.
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Auto-calc summary */}
          {autoCalc && autoCalc.nombreTransactions > 0 && (
            <Card className="border-blue-200 bg-blue-50/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Sparkles className="h-5 w-5 text-blue-600" />
                  Valeurs calculées depuis vos transactions
                </CardTitle>
                <CardDescription>
                  Période : <strong>{autoCalc.periodeLabel}</strong> · {autoCalc.nombreTransactions} transactions analysées
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-4 mb-4">
                  <div className="p-3 bg-white rounded-lg border border-emerald-200">
                    <div className="flex items-center gap-2 mb-1">
                      <TrendingUp className="h-4 w-4 text-emerald-600" />
                      <span className="text-xs font-medium text-emerald-800">CA HT → Ligne 01</span>
                    </div>
                    <p className="text-xl font-bold text-emerald-700">{fmt(autoCalc.chiffreAffaires)}</p>
                  </div>
                  <div className="p-3 bg-white rounded-lg border border-amber-200">
                    <div className="flex items-center gap-2 mb-1">
                      <Calculator className="h-4 w-4 text-amber-600" />
                      <span className="text-xs font-medium text-amber-800">Services extérieurs</span>
                    </div>
                    <p className="text-xl font-bold text-amber-700">{fmt(autoCalc.servicesExterieurs)}</p>
                  </div>
                  <div className="p-3 bg-white rounded-lg border-2 border-blue-400">
                    <div className="flex items-center gap-2 mb-1">
                      <Euro className="h-4 w-4 text-blue-600" />
                      <span className="text-xs font-medium text-blue-800">VA → Ligne 05</span>
                    </div>
                    <p className="text-xl font-bold text-blue-700">{fmt(autoCalc.valeurAjoutee)}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    ⚠️ Vérifiez la VA avec votre <strong>2059-E ligne SA</strong> (ou 2033-E ligne 117)
                  </p>
                  <Button variant="outline" size="sm" onClick={recalcFromTransactions} disabled={loading}>
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Recalculer
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* === THE FORM — mirroring the PDF structure === */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5 text-rose-600" />
                Formulaire 1329-DEF — Ligne par ligne
              </CardTitle>
              <CardDescription>
                Taux effectif : <strong>{calc.taux_effectif}%</strong>
                {calc.degrevement_applique && (
                  <Badge variant="outline" className="ml-2 bg-blue-50 text-blue-700 border-blue-300">
                    Dégrèvement 125 € (CA &lt; 2 M€)
                  </Badge>
                )}
                {calc.franchise_appliquee && (
                  <Badge variant="outline" className="ml-2 bg-emerald-50 text-emerald-700 border-emerald-300">
                    Franchise 63 € appliquée
                  </Badge>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Section I */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-foreground uppercase tracking-wide border-b pb-2">
                  I — Données de chiffre d'affaires
                </h3>
                <FormLine
                  line="01"
                  label="Montant du chiffre d'affaires de la période de référence"
                  type="saisir"
                  where="Liasse fiscale 2025 / déclaration de résultat · Période 01/12/{year-1} → 30/11/{year}".replace('{year}', String(year)).replace('{year-1}', String(year - 1))}
                >
                  <Input
                    type="number"
                    step="0.01"
                    value={caHT}
                    onChange={(e) => { setCaHT(e.target.value); setAutoFilled(false) }}
                    placeholder={autoCalc?.chiffreAffaires ? autoCalc.chiffreAffaires.toString() : '0'}
                    className={`h-10 text-lg font-mono ${autoFilled && autoCalc?.chiffreAffaires ? 'border-blue-300 bg-blue-50/30' : ''}`}
                  />
                  {autoCalc?.chiffreAffaires ? (
                    <p className="text-xs text-blue-600 mt-1">Auto-calculé : {fmt(autoCalc.chiffreAffaires)}</p>
                  ) : null}
                </FormLine>
                <FormLine
                  line="04"
                  label="Pourcentage de la valeur ajoutée correspondante"
                  value={calc.ligne04_pourcentage_VA}
                  type="auto"
                  where="Calculé automatiquement par impots.gouv.fr (VA / CA, +1/4 si cessation 2026)"
                />
              </div>

              {/* Section II */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-foreground uppercase tracking-wide border-b pb-2">
                  II — Données de valeur ajoutée
                </h3>
                <FormLine
                  line="05"
                  label="Valeur ajoutée produite"
                  type="saisir"
                  where="⚠️ Reprenez EXACTEMENT la ligne SA du 2059-E (ou ligne 117 du 2033-E). Ne recalculez pas à la main."
                >
                  <Input
                    type="number"
                    step="0.01"
                    value={va}
                    onChange={(e) => { setVa(e.target.value); setAutoFilled(false) }}
                    placeholder={autoCalc?.valeurAjoutee ? autoCalc.valeurAjoutee.toString() : '0'}
                    className={`h-10 text-lg font-mono ${autoFilled && autoCalc?.valeurAjoutee ? 'border-blue-300 bg-blue-50/30' : ''}`}
                  />
                  {autoCalc?.valeurAjoutee ? (
                    <p className="text-xs text-blue-600 mt-1">Auto-calculé : {fmt(autoCalc.valeurAjoutee)}</p>
                  ) : null}
                </FormLine>
                <FormLine
                  line="06"
                  label="Limitation de la valeur ajoutée (case à cocher)"
                  type="saisir"
                  where="Cochez UNIQUEMENT si la limitation ne s'applique pas (entreprises financières). Ne cochez pas pour une activité commerciale."
                >
                  <div className="flex items-center space-x-2">
                    <Checkbox id="l06" checked={limitationVA} onCheckedChange={(v) => setLimitationVA(v === true)} />
                    <Label htmlFor="l06" className="text-sm cursor-pointer">
                      La limitation de la VA ne s'applique pas à mon entreprise
                    </Label>
                  </div>
                </FormLine>
                <FormLine
                  line="07"
                  label="Montant de la CVAE brute"
                  value={calc.ligne07_CVAE_brute}
                  type="auto"
                  where="Calculé : VA plafonnée (80% ou 85% du CA) × taux effectif"
                />
              </div>

              {/* Section III */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-foreground uppercase tracking-wide border-b pb-2">
                  III — Calcul de la cotisation sur la valeur ajoutée
                </h3>
                <FormLine
                  line="08"
                  label="Cotisation avant réduction"
                  value={calc.ligne08_cotisation_avant_reduction}
                  type="auto"
                  where="= Ligne 07 (auto)"
                />
                <FormLine
                  line="09"
                  label="Exonérations (de plein droit)"
                  type="saisir"
                  where="Uniquement si vous bénéficiez d'une exonération de plein droit. Sinon, laissez vide."
                >
                  <Input
                    type="number"
                    step="0.01"
                    value={exonerations}
                    onChange={(e) => setExonerations(e.target.value)}
                    placeholder="0 (laissez vide si non applicable)"
                    className="h-10 font-mono"
                  />
                </FormLine>
                <FormLine
                  line="10"
                  label="Réduction supplémentaire (dégrèvement)"
                  value={calc.ligne10_reduction_supplementaire}
                  type="auto"
                  where={calc.degrevement_applique ? "Dégrèvement de 125 € (CA < 2 M€ en 2025) — calculé automatiquement" : "Aucun dégrèvement (CA ≥ 2 M€)"}
                />
                <FormLine
                  line="11"
                  label="CVAE due (08 - 09 - 10)"
                  value={calc.ligne11_CVAE_due}
                  type="auto"
                  where={calc.franchise_appliquee ? "≤ 63 € → franchise appliquée (CVAE = 0 €)" : "Base pour les lignes 15 et 20"}
                  highlight={calc.ligne11_CVAE_due > 0 ? 'result' : 'zero'}
                />
                <FormLine
                  line="12"
                  label="Acomptes de CVAE versés (juin + septembre)"
                  type="saisir"
                  where="Relevés 1329-AC de juin et septembre 2025. Si vous n'aviez pas d'acomptes à verser (CVAE 2024 ≤ 1 500 €), laissez à 0."
                >
                  <Input
                    type="number"
                    step="0.01"
                    value={acomptesCVAE}
                    onChange={(e) => setAcomptesCVAE(e.target.value)}
                    placeholder="0"
                    className="h-10 font-mono"
                  />
                </FormLine>
                <FormLine line="13" label="Solde de CVAE à payer (11 - 12)" value={calc.ligne13_solde_CVAE_payer} type="auto" />
                <FormLine line="14" label="Excédent de CVAE constaté (12 - 11)" value={calc.ligne14_excedent_CVAE} type="auto" />
              </div>

              {/* Taxe additionnelle */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-foreground uppercase tracking-wide border-b pb-2">
                  Taxe additionnelle (frais CCI)
                </h3>
                <FormLine
                  line="—"
                  label="Exonéré du paiement de la taxe additionnelle"
                  type="saisir"
                  where="Cochez si artisan non CCI, coopérative agricole, activité non commerciale. Ne cochez pas pour une activité commerciale."
                >
                  <div className="flex items-center space-x-2">
                    <Checkbox id="exo-tax" checked={exonereTaxeAdd} onCheckedChange={(v) => setExonereTaxeAdd(v === true)} />
                    <Label htmlFor="exo-tax" className="text-sm cursor-pointer">
                      Je suis exonéré du paiement de la taxe additionnelle
                    </Label>
                  </div>
                </FormLine>
                <FormLine
                  line="15"
                  label={`Taxe additionnelle due (${cessation ? '9,23' : '13,84'}% de la ligne 11)${exonereTaxeAdd ? ' — exonéré' : ''}`}
                  value={calc.ligne15_taxe_add_due}
                  type="auto"
                  where={exonereTaxeAdd ? "0 € car exonéré" : "13,84% de la ligne 11 (9,23% si cessation 2026)"}
                />
                <FormLine
                  line="16"
                  label="Acomptes de taxe additionnelle versés"
                  type="saisir"
                  where="Relevés 1329-AC de juin et septembre 2025"
                >
                  <Input
                    type="number"
                    step="0.01"
                    value={acomptesTaxeAdd}
                    onChange={(e) => setAcomptesTaxeAdd(e.target.value)}
                    placeholder="0"
                    className="h-10 font-mono"
                  />
                </FormLine>
                <FormLine line="17" label="Solde de taxe additionnelle à payer (15 - 16)" value={calc.ligne17_solde_taxe_add_payer} type="auto" />
                <FormLine line="18" label="Excédent de taxe additionnelle constaté (16 - 15)" value={calc.ligne18_excedent_taxe_add} type="auto" />
              </div>

              {/* Contribution complémentaire */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-foreground uppercase tracking-wide border-b pb-2">
                  Contribution complémentaire temporaire 2025 (47,4%){cessation ? ' — NON applicable (cessation)' : ''}
                </h3>
                <FormLine
                  line="20"
                  label="Contribution complémentaire due (ligne 11 × 47,4%)"
                  value={calc.ligne20_contrib_compl_due}
                  type="auto"
                  where="47,4% de la ligne 11 — dispositif exceptionnel 2025 uniquement"
                />
                <FormLine
                  line="21"
                  label="Acompte de contribution complémentaire versé (100% en sept 2025)"
                  type="saisir"
                  where="Acompte unique versé au 15 septembre 2025 (si CVAE 2024 > 1 500 €)"
                >
                  <Input
                    type="number"
                    step="0.01"
                    value={acompteContrib}
                    onChange={(e) => setAcompteContrib(e.target.value)}
                    placeholder="0"
                    className="h-10 font-mono"
                  />
                </FormLine>
                <FormLine line="22" label="Solde de contribution à payer (20 - 21)" value={calc.ligne22_solde_contrib_payer} type="auto" />
                <FormLine line="23" label="Excédent de contribution constaté (21 - 20)" value={calc.ligne23_excedent_contrib} type="auto" />
              </div>

              {/* Récapitulatif */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-foreground uppercase tracking-wide border-b pb-2">
                  Récapitulatif
                </h3>
                <FormLine line="24" label="Total des acomptes versés (12 + 16 + 21)" value={calc.ligne24_total_acomptes} type="auto" />
                <FormLine line="25" label="Total à payer (13 + 17 + 22)" value={calc.ligne25_total_payer} type="auto" />
                <FormLine line="26" label="Total des excédents (14 + 18 + 23)" value={calc.ligne26_total_excedents} type="auto" />
              </div>

              {/* Section IV — Résultat final */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-foreground uppercase tracking-wide border-b pb-2">
                  IV — Paiement ou excédent
                </h3>
                {calc.ligne27_CVAE_DUE_paiement > 0 ? (
                  <div className="p-6 bg-rose-50 rounded-lg border-2 border-rose-400 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="w-10 h-10 rounded-lg bg-rose-500 text-white font-bold flex items-center justify-center text-sm">27</span>
                        <Badge variant="outline" className="bg-rose-100 text-rose-700 border-rose-400">
                          <Lock className="h-3 w-3 mr-0.5" />AUTO
                        </Badge>
                      </div>
                      <p className="text-sm font-medium text-rose-900">CVAE DUE (à payer)</p>
                      <p className="text-xs text-rose-600">25 - 26 · Téléréglement obligatoire</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <p className="text-4xl font-bold text-rose-700">{fmt(calc.ligne27_CVAE_DUE_paiement)}</p>
                      <Button size="sm" variant="outline" className="h-10 w-10 p-0" onClick={() => copyValue('27', fmtPlain(calc.ligne27_CVAE_DUE_paiement))}>
                        {copiedLine === '27' ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                ) : calc.ligne28_excedent_versement > 0 ? (
                  <div className="p-6 bg-emerald-50 rounded-lg border-2 border-emerald-400 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="w-10 h-10 rounded-lg bg-emerald-500 text-white font-bold flex items-center justify-center text-sm">28</span>
                        <Badge variant="outline" className="bg-emerald-100 text-emerald-700 border-emerald-400">
                          <Lock className="h-3 w-3 mr-0.5" />AUTO
                        </Badge>
                      </div>
                      <p className="text-sm font-medium text-emerald-900">Excédent de versement (à rembourser)</p>
                      <p className="text-xs text-emerald-600">26 - 25 · Transmettez un RIB à votre SIE</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <p className="text-4xl font-bold text-emerald-700">{fmt(calc.ligne28_excedent_versement)}</p>
                      <Button size="sm" variant="outline" className="h-10 w-10 p-0" onClick={() => copyValue('28', fmtPlain(calc.ligne28_excedent_versement))}>
                        {copiedLine === '28' ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="p-6 bg-slate-50 rounded-lg border-2 border-slate-300 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-700">Néant — Acomptes = cotisation due</p>
                      <p className="text-xs text-slate-500">Aucun paiement, aucun remboursement</p>
                    </div>
                    <p className="text-4xl font-bold text-slate-600">0 €</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Effectifs */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Users className="h-5 w-5 text-purple-600" />
                Effectifs salariés
              </CardTitle>
              <CardDescription>Déclarés simultanément (champ séparé sur impots.gouv.fr)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="eff" className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-purple-600" />
                  Effectifs salariés (moyenne annuelle)
                </Label>
                <Input id="eff" type="number" min="0" step="1" value={effectifs} onChange={(e) => setEffectifs(parseInt(e.target.value) || 0)} className="max-w-xs h-10 text-lg font-mono" />
                <p className="text-xs text-muted-foreground">
                  0 si président non-salarié (SASU). Sinon, moyenne annuelle des salariés.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Télétransmission */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Send className="h-5 w-5 text-purple-600" />
                Télétransmission sur impots.gouv.fr
              </CardTitle>
              <CardDescription>
                Une fois le formulaire rempli sur impots.gouv.fr, archivez la référence ici.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isFiled ? (
                <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200 space-y-2">
                  <div className="flex items-center gap-2 text-emerald-700 font-semibold">
                    <CheckCircle className="h-5 w-5" />
                    Formulaire télétransmis
                  </div>
                  <div className="text-sm space-y-1">
                    <p><strong>Référence :</strong> {data?.form?.reference || '—'}</p>
                    <p><strong>Date :</strong> {data?.form?.filedAt ? fmtDate(data.form.filedAt) : '—'}</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={fetchData}>Modifier</Button>
                </div>
              ) : (
                <>
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Procédure :</strong> Connectez-vous à{' '}
                      <a href="https://impots.gouv.fr" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline inline-flex items-center">
                        impots.gouv.fr <ExternalLink className="h-3 w-3 ml-0.5" />
                      </a>{' '}
                      → espace professionnel → rubrique « Professionnels » → 1329-DEF → saisissez les valeurs → télétransmettez.
                    </AlertDescription>
                  </Alert>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="ref">Référence accusé de réception</Label>
                      <Input id="ref" value={reference} onChange={(e) => setReference(e.target.value)} placeholder="ex: 2026_06_906143" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="fdate">Date de télétransmission</Label>
                      <Input id="fdate" type="date" value={filedAt} onChange={(e) => setFiledAt(e.target.value)} />
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button onClick={() => handleSave('save')} disabled={saving} variant="outline">
                      {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                      Enregistrer les valeurs
                    </Button>
                    <Button onClick={() => handleSave('file')} disabled={saving}>
                      {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                      Marquer comme télétransmis
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
            <CardFooter className="text-xs text-muted-foreground border-t pt-4">
              <p>
                Barème 2025 : 0% (&lt;500k) → progressif → 0,19% (&gt;50M) · Dégrèvement 125 € (CA &lt; 2 M€) ·
                Franchise 63 € · Taxe add 13,84% · Contribution compl 47,4% (2025 uniquement)
              </p>
            </CardFooter>
          </Card>
        </>
      )}
    </div>
  )
}
