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
  Edit3,
  Lock,
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

  // À SAISIR fields (only 5 real inputs per the official guide)
  const [caHT, setCaHT] = useState('')          // Ligne 01
  const [va, setVa] = useState('')              // Ligne 05
  const [acomptesCVAE, setAcomptesCVAE] = useState('')      // Ligne 12
  const [acomptesTaxeAdd, setAcomptesTaxeAdd] = useState('') // Ligne 16
  const [acompteContrib, setAcompteContrib] = useState('')   // Ligne 21
  // Optional fields
  const [effectifs, setEffectifs] = useState(0)
  const [cessation, setCessation] = useState(false)
  const [limitationVA, setLimitationVA] = useState(false)
  const [exonereTaxeAdd, setExonereTaxeAdd] = useState(false)
  const [exonerations, setExonerations] = useState('')  // Ligne 09 (rare)
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
      const savedCA = d.inputs.caHT ?? 0
      const savedVA = d.inputs.valeurAjoutee ?? 0

      const useCA = d.form ? savedCA : autoCA
      const useVA = d.form ? savedVA : autoVA

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
      setFiledAt(
        d.form?.filedAt
          ? d.form.filedAt.split('T')[0]
          : new Date().toISOString().split('T')[0]
      )
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

  const fmtDate = (s: string) =>
    new Date(s).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })

  const num = (s: string) => (s === '' || isNaN(parseFloat(s)) ? 0 : parseFloat(s))

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
            caHT: num(caHT),
            valeurAjoutee: num(va),
            effectifsSalaries: effectifs,
            cessation2026: cessation,
            limitationVANonApplicable: limitationVA,
            exonereTaxeAdditionnelle: exonereTaxeAdd,
            exonerations: num(exonerations),
            acomptesCVAE: num(acomptesCVAE),
            acomptesTaxeAdd: num(acomptesTaxeAdd),
            acompteContribCompl: num(acompteContrib),
          },
          reference: reference.trim(),
          filedAt,
        }),
      })
      const d = await res.json()
      if (d.success) {
        toast.success(d.message)
        fetchData()
      } else {
        toast.error(d.error || 'Erreur')
      }
    } catch (e) {
      console.error(e)
      toast.error('Erreur réseau')
    } finally {
      setSaving(false)
    }
  }

  const isFiled = data?.form?.status === 'filed'
  const calc = data?.calculation
  const overdue = data?.deadline?.isOverdue
  const autoCalc = data?.autoCalc

  // Line component: distinguishes "À SAISIR" (input) vs "Auto" (calculated)
  const Line = ({
    num: n,
    label,
    value,
    formula,
    input,
    isInput,
    bold,
    note,
  }: {
    num: string
    label: string
    value?: number
    formula?: string
    input?: React.ReactNode
    isInput?: boolean
    bold?: boolean
    note?: string
  }) => (
    <div className={`flex items-center gap-3 py-2 px-3 ${bold ? 'bg-muted/50 font-semibold' : ''} border-b border-border/50 last:border-0`}>
      <div className="flex-shrink-0 w-8 h-8 rounded bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">
        {n}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm">{label}</p>
          {isInput ? (
            <Badge variant="outline" className="text-[10px] py-0 px-1 bg-blue-50 text-blue-700 border-blue-300">
              <Edit3 className="h-2.5 w-2.5 mr-0.5" />À saisir
            </Badge>
          ) : (
            <Badge variant="outline" className="text-[10px] py-0 px-1 bg-slate-50 text-slate-500 border-slate-300">
              <Lock className="h-2.5 w-2.5 mr-0.5" />Auto
            </Badge>
          )}
        </div>
        {formula && <p className="text-xs text-muted-foreground">{formula}</p>}
        {note && <p className="text-xs text-amber-600 mt-0.5">{note}</p>}
      </div>
      <div className="flex-shrink-0 w-40 text-right">
        {input ?? <span className="font-mono text-sm">{value !== undefined ? fmt(value) : '—'}</span>}
      </div>
    </div>
  )

  const InputLine = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
    <Input
      type="number"
      step="0.01"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="0"
      className="h-8 text-right font-mono text-sm w-40"
    />
  )

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2 text-xl">
                <FileText className="h-5 w-5 text-rose-600" />
                Formulaire 1329-DEF
              </CardTitle>
              <CardDescription className="mt-1">
                Déclaration de liquidation et de régularisation de la CVAE
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

      {overdue && !isFiled && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Échéance dépassée — Mise en demeure reçue</AlertTitle>
          <AlertDescription>
            Date limite : <strong>{data ? fmtDate(data.deadline.dueDate) : '5 mai ' + (year + 1)}</strong>.
            Régularisez sur{' '}
            <a href="https://impots.gouv.fr" target="_blank" rel="noopener noreferrer" className="underline inline-flex items-center">
              impots.gouv.fr <ExternalLink className="h-3 w-3 ml-0.5" />
            </a>{' '}
            dans les 30 jours pour éviter l'amende de 150 €.
          </AlertDescription>
        </Alert>
      )}

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>Comment utiliser ce formulaire :</strong> Vous ne saisissez que{' '}
          <strong>5 champs</strong> (marqués "À saisir" : lignes 01, 05, 12, 16, 21). Tout le reste est{' '}
          <strong>calculé automatiquement</strong> selon le barème 2025 (loi de finances 2025).
          Le dégrèvement de 125 € (CA &lt; 2 M€) et la franchise de 63 € sont appliqués automatiquement.
        </AlertDescription>
      </Alert>

      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {!loading && calc && (
        <>
          {/* Auto-calculated breakdown */}
          {autoCalc && autoCalc.nombreTransactions > 0 && (
            <Card className="border-blue-200 bg-blue-50/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Sparkles className="h-5 w-5 text-blue-600" />
                  Données auto-calculées depuis vos transactions
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
                      <span className="text-xs font-medium text-emerald-800">Chiffre d'affaires HT</span>
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
                  <div className="p-3 bg-white rounded-lg border border-blue-300 border-2">
                    <div className="flex items-center gap-2 mb-1">
                      <Euro className="h-4 w-4 text-blue-600" />
                      <span className="text-xs font-medium text-blue-800">Valeur ajoutée → Ligne 05</span>
                    </div>
                    <p className="text-xl font-bold text-blue-700">{fmt(autoCalc.valeurAjoutee)}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    VA = CA − services extérieurs (art. 1586 nonies CGI).
                    ⚠️ Vérifiez avec votre <strong>2059-E ligne SA</strong> (ou 2033-E ligne 117).
                    Charges exclues : {fmt(autoCalc.chargesExclues)}
                  </p>
                  <Button variant="outline" size="sm" onClick={recalcFromTransactions} disabled={loading}>
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Recalculer
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* The form — line by line */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Formulaire 1329-DEF — Calcul automatique</CardTitle>
              <CardDescription>
                Taux effectif : <strong>{calc.taux_effectif}%</strong>
                {calc.degrevement_applique && (
                  <Badge variant="outline" className="ml-2 bg-blue-50 text-blue-700 border-blue-300">
                    Dégrèvement 125 € appliqué (CA &lt; 2 M€)
                  </Badge>
                )}
                {calc.franchise_appliquee && (
                  <Badge variant="outline" className="ml-2 bg-emerald-50 text-emerald-700 border-emerald-300">
                    Franchise 63 € appliquée
                  </Badge>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-1">
              {/* Section I */}
              <div className="text-xs font-bold text-muted-foreground uppercase tracking-wide pt-2 pb-1">
                I — Données de chiffre d'affaires
              </div>
              <Line
                num="01"
                label="Montant du chiffre d'affaires de la période de référence"
                input={
                  <Input
                    type="number"
                    step="0.01"
                    value={caHT}
                    onChange={(e) => { setCaHT(e.target.value); setAutoFilled(false) }}
                    placeholder={autoCalc?.chiffreAffaires ? autoCalc.chiffreAffaires.toString() : '0'}
                    className={`h-8 text-right font-mono text-sm w-40 ${autoFilled && autoCalc?.chiffreAffaires ? 'border-blue-300 bg-blue-50/30' : ''}`}
                  />
                }
                isInput
                note="Votre CA HT 2025 (12 mois)"
              />
              <Line num="04" label="Pourcentage de la valeur ajoutée correspondante" value={calc.ligne04_pourcentage_VA} formula="VA / CA (auto, +1/4 si cessation 2026)" />

              {/* Section II */}
              <div className="text-xs font-bold text-muted-foreground uppercase tracking-wide pt-4 pb-1">
                II — Données de valeur ajoutée
              </div>
              <Line
                num="05"
                label="Valeur ajoutée produite"
                input={
                  <Input
                    type="number"
                    step="0.01"
                    value={va}
                    onChange={(e) => { setVa(e.target.value); setAutoFilled(false) }}
                    placeholder={autoCalc?.valeurAjoutee ? autoCalc.valeurAjoutee.toString() : '0'}
                    className={`h-8 text-right font-mono text-sm w-40 ${autoFilled && autoCalc?.valeurAjoutee ? 'border-blue-300 bg-blue-50/30' : ''}`}
                  />
                }
                isInput
                note="Reprenez 2059-E ligne SA (ou 2033-E ligne 117) — ne recalculez pas à la main"
              />
              <div className="flex items-center gap-3 py-2 px-3 border-b border-border/50">
                <div className="flex-shrink-0 w-8 h-8 rounded bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">06</div>
                <div className="flex-1">
                  <p className="text-sm">Limitation de la valeur ajoutée (case à cocher)</p>
                  <p className="text-xs text-muted-foreground">
                    Ne cochez que si la limitation NE s'applique PAS (entreprises financières).
                    Plafond : 80% du CA (≤ 7,6 M€) ou 85% (&gt; 7,6 M€).
                  </p>
                </div>
                <Checkbox checked={limitationVA} onCheckedChange={(v) => setLimitationVA(v === true)} />
              </div>
              <Line num="07" label="Montant de la CVAE brute" value={calc.ligne07_CVAE_brute} formula="VA plafonnée × taux effectif (auto)" />

              {/* Section III */}
              <div className="text-xs font-bold text-muted-foreground uppercase tracking-wide pt-4 pb-1">
                III — Calcul de la cotisation sur la valeur ajoutée
              </div>
              <Line num="08" label="Cotisation avant réduction" value={calc.ligne08_cotisation_avant_reduction} formula="= Ligne 07 (auto)" />
              <Line
                num="09"
                label="Exonérations (de plein droit)"
                input={<InputLine value={exonerations} onChange={setExonerations} />}
                isInput
                note="Uniquement si exonération de plein droit — sinon laissez vide"
              />
              <Line
                num="10"
                label="Réduction supplémentaire (dégrèvement)"
                value={calc.ligne10_reduction_supplementaire}
                formula="125 € si CA < 2 M€ (2025) — auto"
              />
              <Line
                num="11"
                label="CVAE due (08 - 09 - 10)"
                value={calc.ligne11_CVAE_due}
                formula={calc.franchise_appliquee ? '≤ 63 € → franchise (CVAE = 0)' : undefined}
                bold
              />
              <Line
                num="12"
                label="Acomptes de CVAE versés (juin + septembre)"
                input={<InputLine value={acomptesCVAE} onChange={setAcomptesCVAE} />}
                isInput
                note="Relevés 1329-AC de juin et septembre 2025"
              />
              <Line num="13" label="Solde de CVAE à payer (11 - 12)" value={calc.ligne13_solde_CVAE_payer} />
              <Line num="14" label="Excédent de CVAE constaté (12 - 11)" value={calc.ligne14_excedent_CVAE} />

              {/* Taxe additionnelle */}
              <div className="text-xs font-bold text-muted-foreground uppercase tracking-wide pt-4 pb-1">
                Taxe additionnelle (frais CCI)
              </div>
              <div className="flex items-center gap-3 py-2 px-3 border-b border-border/50">
                <div className="flex-shrink-0 w-8 h-8 rounded bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">—</div>
                <div className="flex-1">
                  <p className="text-sm">Exonéré du paiement de la taxe additionnelle</p>
                  <p className="text-xs text-muted-foreground">Artisans non CCI, coopératives agricoles, etc. Ne cochez pas pour une activité commerciale.</p>
                </div>
                <Checkbox checked={exonereTaxeAdd} onCheckedChange={(v) => setExonereTaxeAdd(v === true)} />
              </div>
              <Line
                num="15"
                label={`Taxe additionnelle due (${cessation ? '9,23' : '13,84'}% de L11)${exonereTaxeAdd ? ' — exonéré' : ''}`}
                value={calc.ligne15_taxe_add_due}
              />
              <Line
                num="16"
                label="Acomptes de taxe additionnelle versés"
                input={<InputLine value={acomptesTaxeAdd} onChange={setAcomptesTaxeAdd} />}
                isInput
              />
              <Line num="17" label="Solde de taxe additionnelle à payer (15 - 16)" value={calc.ligne17_solde_taxe_add_payer} />
              <Line num="18" label="Excédent de taxe additionnelle constaté (16 - 15)" value={calc.ligne18_excedent_taxe_add} />

              {/* Contribution complémentaire */}
              <div className="text-xs font-bold text-muted-foreground uppercase tracking-wide pt-4 pb-1">
                Contribution complémentaire temporaire 2025 (47,4%){cessation ? ' — NON applicable (cessation)' : ''}
              </div>
              <Line num="20" label="Contribution complémentaire due (11 × 47,4%)" value={calc.ligne20_contrib_compl_due} />
              <Line
                num="21"
                label="Acompte de contribution complémentaire versé (100% en sept 2025)"
                input={<InputLine value={acompteContrib} onChange={setAcompteContrib} />}
                isInput
              />
              <Line num="22" label="Solde de contribution à payer (20 - 21)" value={calc.ligne22_solde_contrib_payer} />
              <Line num="23" label="Excédent de contribution constaté (21 - 20)" value={calc.ligne23_excedent_contrib} />

              {/* Récapitulatif */}
              <div className="text-xs font-bold text-muted-foreground uppercase tracking-wide pt-4 pb-1">Récapitulatif</div>
              <Line num="24" label="Total des acomptes versés (12 + 16 + 21)" value={calc.ligne24_total_acomptes} />
              <Line num="25" label="Total à payer (13 + 17 + 22)" value={calc.ligne25_total_payer} />
              <Line num="26" label="Total des excédents (14 + 18 + 23)" value={calc.ligne26_total_excedents} />

              {/* Section IV */}
              <div className="text-xs font-bold text-muted-foreground uppercase tracking-wide pt-4 pb-1">
                IV — Paiement ou excédent
              </div>
              {calc.ligne27_CVAE_DUE_paiement > 0 ? (
                <div className="mt-4 p-4 bg-rose-50 rounded-lg border-2 border-rose-300 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-rose-800">Ligne 27 — CVAE DUE (à payer)</p>
                    <p className="text-xs text-rose-600">25 - 26 · Téléréglement obligatoire</p>
                  </div>
                  <p className="text-3xl font-bold text-rose-700">{fmt(calc.ligne27_CVAE_DUE_paiement)}</p>
                </div>
              ) : calc.ligne28_excedent_versement > 0 ? (
                <div className="mt-4 p-4 bg-emerald-50 rounded-lg border-2 border-emerald-300 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-emerald-800">Ligne 28 — Excédent de versement (à rembourser)</p>
                    <p className="text-xs text-emerald-600">26 - 25 · Joignez un RIB à votre SIE</p>
                  </div>
                  <p className="text-3xl font-bold text-emerald-700">{fmt(calc.ligne28_excedent_versement)}</p>
                </div>
              ) : (
                <div className="mt-4 p-4 bg-slate-50 rounded-lg border-2 border-slate-300 flex items-center justify-between">
                  <p className="text-sm font-medium text-slate-700">Néant — acomptes = cotisation due (0 € à payer)</p>
                  <p className="text-2xl font-bold text-slate-600">0 €</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Effectifs + Télétransmission */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Users className="h-5 w-5 text-purple-600" />
                Effectifs salariés & télétransmission
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="eff" className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-purple-600" />
                  Effectifs salariés (moyenne annuelle)
                </Label>
                <Input id="eff" type="number" min="0" step="1" value={effectifs} onChange={(e) => setEffectifs(parseInt(e.target.value) || 0)} className="max-w-xs" />
                <p className="text-xs text-muted-foreground">0 si président non-salarié (SASU)</p>
              </div>
              <Separator />
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
                      Enregistrer
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
