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
  cessation_2026: boolean
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
    exonerations: number
    reductionSupplementaire: number
    acomptesCVAE: number
    acomptesTaxeAdd: number
    acompteContribCompl: number
  }
  form: { id: string; status: string; reference: string | null; filedAt: string | null } | null
  deadline: { dueDate: string; daysUntilDue: number; isOverdue: boolean }
}

export function Formulaire1329DEFSection({ settings }: Formulaire1329DEFSectionProps) {
  const [year, setYear] = useState(2025)
  const [data, setData] = useState<Data | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  const [caHT, setCaHT] = useState('')
  const [va, setVa] = useState('')
  const [effectifs, setEffectifs] = useState(0)
  const [cessation, setCessation] = useState(false)
  const [limitationVA, setLimitationVA] = useState(false)
  const [exonerations, setExonerations] = useState('')
  const [reduction, setReduction] = useState('')
  const [acomptesCVAE, setAcomptesCVAE] = useState('')
  const [acomptesTaxeAdd, setAcomptesTaxeAdd] = useState('')
  const [acompteContrib, setAcompteContrib] = useState('')
  const [reference, setReference] = useState('')
  const [filedAt, setFiledAt] = useState(new Date().toISOString().split('T')[0])

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/declarations/1329-def?year=${year}`)
      if (!res.ok) throw new Error('Erreur API')
      const d: Data = await res.json()
      setData(d)
      setCaHT(d.inputs.caHT?.toString() || '')
      setVa(d.inputs.valeurAjoutee?.toString() || '')
      setEffectifs(d.inputs.effectifsSalaries || 0)
      setCessation(d.inputs.cessation2026 || false)
      setLimitationVA(d.inputs.limitationVANonApplicable || false)
      setExonerations(d.inputs.exonerations?.toString() || '')
      setReduction(d.inputs.reductionSupplementaire?.toString() || '')
      setAcomptesCVAE(d.inputs.acomptesCVAE?.toString() || '')
      setAcomptesTaxeAdd(d.inputs.acomptesTaxeAdd?.toString() || '')
      setAcompteContrib(d.inputs.acompteContribCompl?.toString() || '')
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
            exonerations: num(exonerations),
            reductionSupplementaire: num(reduction),
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

  const Line = ({
    num: n,
    label,
    value,
    formula,
    input,
    bold,
  }: {
    num: string
    label: string
    value?: number
    formula?: string
    input?: React.ReactNode
    bold?: boolean
  }) => (
    <div className={`flex items-center gap-3 py-2 px-3 ${bold ? 'bg-muted/50 font-semibold' : ''} border-b border-border/50 last:border-0`}>
      <div className="flex-shrink-0 w-8 h-8 rounded bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">
        {n}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm">{label}</p>
        {formula && <p className="text-xs text-muted-foreground">{formula}</p>}
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
                <SelectTrigger className="w-[160px]">
                  <Calendar className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[2024, 2025, 2026].map((y) => (
                    <SelectItem key={y} value={y.toString()}>
                      CVAE {y} (dépôt {y + 1})
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
          <strong>⚠️ La CVAE n'est PAS supprimée.</strong> Suppression reportée à <strong>2030</strong>.
          Taux maximal 2025 : <strong>0,19 %</strong> (barème progressif selon le CA).
          Contribution complémentaire <strong>47,4 %</strong> (2025 uniquement). Franchise : ≤ 63 €.
        </AlertDescription>
      </Alert>

      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {!loading && calc && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Calculator className="h-5 w-5 text-blue-600" />
                Données d'entrée
              </CardTitle>
              <CardDescription>Saisissez vos chiffres. Le calcul se fait automatiquement.</CardDescription>
            </CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ca" className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-emerald-600" />
                  Chiffre d'affaires HT (ligne 01)
                </Label>
                <Input id="ca" type="number" step="0.01" value={caHT} onChange={(e) => setCaHT(e.target.value)} placeholder="0" />
                <p className="text-xs text-muted-foreground">CA période 01/12/{year - 1} → 30/11/{year}</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="va" className="flex items-center gap-2">
                  <Euro className="h-4 w-4 text-blue-600" />
                  Valeur ajoutée produite (ligne 05)
                </Label>
                <Input id="va" type="number" step="0.01" value={va} onChange={(e) => setVa(e.target.value)} placeholder="0" />
                <p className="text-xs text-muted-foreground">VA = CA − services extérieurs − achats</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="eff" className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-purple-600" />
                  Effectifs salariés
                </Label>
                <Input id="eff" type="number" min="0" step="1" value={effectifs} onChange={(e) => setEffectifs(parseInt(e.target.value) || 0)} />
                <p className="text-xs text-muted-foreground">0 si président non-salarié</p>
              </div>
              <div className="flex items-center gap-6 pt-6">
                <div className="flex items-center space-x-2">
                  <Checkbox id="cessation" checked={cessation} onCheckedChange={(v) => setCessation(v === true)} />
                  <Label htmlFor="cessation" className="text-sm cursor-pointer">Cessation en {year + 1}</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="limitation" checked={limitationVA} onCheckedChange={(v) => setLimitationVA(v === true)} />
                  <Label htmlFor="limitation" className="text-sm cursor-pointer">L06: Plafond VA non applicable</Label>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Calcul du formulaire 1329-DEF</CardTitle>
              <CardDescription>
                Taux effectif : <strong>{calc.taux_effectif}%</strong>
                {calc.franchise_appliquee && (
                  <Badge variant="outline" className="ml-2 bg-emerald-50 text-emerald-700 border-emerald-300">
                    Franchise 63 € appliquée
                  </Badge>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-1">
              <div className="text-xs font-bold text-muted-foreground uppercase tracking-wide pt-2 pb-1">Section I — Chiffre d'affaires</div>
              <Line num="01" label="CA de la période de référence" value={calc.ligne01_CA} />
              <Line num="04" label="% de valeur ajoutée correspondante" value={calc.ligne04_pourcentage_VA} formula="VA / CA (+1/4 si cessation)" />

              <div className="text-xs font-bold text-muted-foreground uppercase tracking-wide pt-4 pb-1">Section II — Valeur ajoutée</div>
              <Line num="05" label="Valeur ajoutée produite" value={calc.ligne05_VA_produite} />
              {calc.ligne05b_VA_plafonnee !== calc.ligne05_VA_produite && (
                <Line num="05b" label="VA plafonnée (80% CA services / 85% autres)" value={calc.ligne05b_VA_plafonnee} />
              )}
              <Line num="07" label="CVAE brute (VA plafonnée × taux effectif)" value={calc.ligne07_CVAE_brute} />

              <div className="text-xs font-bold text-muted-foreground uppercase tracking-wide pt-4 pb-1">Section III — Cotisation</div>
              <Line num="08" label="Cotisation avant réduction" value={calc.ligne08_cotisation_avant_reduction} />
              <Line num="09" label="Exonérations" input={<InputLine value={exonerations} onChange={setExonerations} />} />
              <Line num="10" label="Réduction supplémentaire" input={<InputLine value={reduction} onChange={setReduction} />} />
              <Line
                num="11"
                label="CVAE due (08 - 09 - 10)"
                value={calc.ligne11_CVAE_due}
                formula={calc.franchise_appliquee ? '≤ 63 € → franchise (CVAE = 0)' : undefined}
                bold
              />
              <Line num="12" label="Acomptes CVAE versés (juin + septembre)" input={<InputLine value={acomptesCVAE} onChange={setAcomptesCVAE} />} />
              <Line num="13" label="Solde CVAE à payer (11 - 12)" value={calc.ligne13_solde_CVAE_payer} />
              <Line num="14" label="Excédent CVAE constaté (12 - 11)" value={calc.ligne14_excedent_CVAE} />

              <div className="text-xs font-bold text-muted-foreground uppercase tracking-wide pt-4 pb-1">Taxe additionnelle (frais CCI)</div>
              <Line num="15" label={`Taxe additionnelle due (${cessation ? '9,23' : '13,84'}% de L11)`} value={calc.ligne15_taxe_add_due} />
              <Line num="16" label="Acomptes taxe additionnelle versés" input={<InputLine value={acomptesTaxeAdd} onChange={setAcomptesTaxeAdd} />} />
              <Line num="17" label="Solde taxe add à payer (15 - 16)" value={calc.ligne17_solde_taxe_add_payer} />
              <Line num="18" label="Excédent taxe add constaté (16 - 15)" value={calc.ligne18_excedent_taxe_add} />

              <div className="text-xs font-bold text-muted-foreground uppercase tracking-wide pt-4 pb-1">
                Contribution complémentaire 2025 (47,4%){cessation ? ' — NON applicable (cessation)' : ''}
              </div>
              <Line num="20" label="Contribution complémentaire due (11 × 47,4%)" value={calc.ligne20_contrib_compl_due} />
              <Line num="21" label="Acompte contrib. versé (100% en sept 2025)" input={<InputLine value={acompteContrib} onChange={setAcompteContrib} />} />
              <Line num="22" label="Solde contrib. à payer (20 - 21)" value={calc.ligne22_solde_contrib_payer} />
              <Line num="23" label="Excédent contrib. constaté (21 - 20)" value={calc.ligne23_excedent_contrib} />

              <div className="text-xs font-bold text-muted-foreground uppercase tracking-wide pt-4 pb-1">Section IV — Paiement ou excédent</div>
              <Line num="24" label="Total acomptes versés (12 + 16 + 21)" value={calc.ligne24_total_acomptes} />
              <Line num="25" label="Total à payer (13 + 17 + 22)" value={calc.ligne25_total_payer} />
              <Line num="26" label="Total excédents (14 + 18 + 23)" value={calc.ligne26_total_excedents} />

              {calc.ligne27_CVAE_DUE_paiement > 0 ? (
                <div className="mt-4 p-4 bg-rose-50 rounded-lg border-2 border-rose-300 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-rose-800">Ligne 27 — CVAE DUE (à payer)</p>
                    <p className="text-xs text-rose-600">25 - 26</p>
                  </div>
                  <p className="text-3xl font-bold text-rose-700">{fmt(calc.ligne27_CVAE_DUE_paiement)}</p>
                </div>
              ) : calc.ligne28_excedent_versement > 0 ? (
                <div className="mt-4 p-4 bg-emerald-50 rounded-lg border-2 border-emerald-300 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-emerald-800">Ligne 28 — Excédent de versement (à rembourser)</p>
                    <p className="text-xs text-emerald-600">26 - 25 · Joindre un RIB au SIE</p>
                  </div>
                  <p className="text-3xl font-bold text-emerald-700">{fmt(calc.ligne28_excedent_versement)}</p>
                </div>
              ) : (
                <div className="mt-4 p-4 bg-slate-50 rounded-lg border-2 border-slate-300 flex items-center justify-between">
                  <p className="text-sm font-medium text-slate-700">Néant — acomptes = cotisation due</p>
                  <p className="text-2xl font-bold text-slate-600">0 €</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Send className="h-5 w-5 text-purple-600" />
                Télétransmission
              </CardTitle>
              <CardDescription>Déposez le formulaire sur impots.gouv.fr, puis archivez la référence.</CardDescription>
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
              <p>Formulaire 1329-DEF · Loi de finances 2025 (loi n° 2025-127) · CVAE non supprimée (2030)</p>
            </CardFooter>
          </Card>
        </>
      )}
    </div>
  )
}
