'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
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
  Copy,
  Check,
  Info,
  PencilLine,
  Lock,
  Calculator,
  RefreshCw,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react'
import { toast } from 'sonner'

// No props needed — component is self-contained

interface PdfLineValue {
  value: number | boolean
  line: string
  label: string
  formula?: string
  type: 'amount' | 'number' | 'boolean' | 'header' | 'text' | 'percent'
  isInput?: boolean
}

interface FormDef {
  code: string
  title: string
  mandatory: boolean
  description: string
  lines: Record<string, { label: string; type: string; formula?: string }>
  values?: Record<string, number | boolean>
}

// Line definitions (mirrors the PDF structure exactly)
const FORM_DEFS: FormDef[] = [
  {
    code: '2033-A',
    title: 'Bilan simplifié',
    mandatory: true,
    description: 'Actif (immobilisations + circulant) et Passif (capitaux propres + dettes)',
    lines: {
      AA: { label: 'Néant (si rien à déclarer, cochez)', type: 'boolean' },
      // Actif
      AB: { label: 'Immobilisations incorporelles - Fonds commercial', type: 'amount' },
      AC: { label: 'Immobilisations incorporelles - Autres', type: 'amount' },
      AD: { label: 'Immobilisations corporelles', type: 'amount' },
      AE: { label: 'Immobilisations financières', type: 'amount' },
      AF: { label: 'TOTAL I (Actif immobilisé)', type: 'amount', formula: 'AB+AC+AD+AE' },
      AH: { label: 'Stocks matières premières, approvisionnements', type: 'amount' },
      AK: { label: 'Créances clients et comptes rattachés', type: 'amount' },
      AL: { label: 'Créances autres', type: 'amount' },
      AM: { label: 'Valeurs mobilières de placement', type: 'amount' },
      AN: { label: 'Disponibilités', type: 'amount' },
      AP: { label: 'TOTAL II (Actif circulant)', type: 'amount' },
      AQ: { label: 'TOTAL GÉNÉRAL (I + II)', type: 'amount', formula: 'AF+AP' },
      // Passif
      BA: { label: 'Capital social ou individuel', type: 'amount' },
      BC: { label: 'Réserve légale', type: 'amount' },
      BE: { label: 'Autres réserves', type: 'amount' },
      BF: { label: 'Report à nouveau', type: 'amount' },
      BG: { label: 'Résultat de l\'exercice', type: 'amount' },
      BJ: { label: 'TOTAL I (Capitaux propres)', type: 'amount' },
      BM: { label: 'Emprunts et dettes auprès des établissements de crédit', type: 'amount' },
      BP: { label: 'Dettes fournisseurs et comptes rattachés', type: 'amount' },
      BQ: { label: 'Dettes fiscales et sociales', type: 'amount' },
      BS: { label: 'Autres dettes', type: 'amount' },
      BT: { label: 'TOTAL III (Dettes)', type: 'amount' },
      BU: { label: 'TOTAL GÉNÉRAL (I + II + III)', type: 'amount', formula: 'BJ+BT' },
    },
  },
  {
    code: '2033-B',
    title: 'Compte de résultat simplifié',
    mandatory: true,
    description: 'Produits, charges, résultat comptable et résultat fiscal',
    lines: {
      AA: { label: 'Néant (si rien à déclarer, cochez)', type: 'boolean' },
      AD: { label: 'Production vendue - Services', type: 'amount' },
      AF: { label: 'Production immobilisée', type: 'amount' },
      AG: { label: 'Subventions d\'exploitation reçues', type: 'amount' },
      AH: { label: 'Autres produits', type: 'amount' },
      AI: { label: 'Total des produits d\'exploitation hors TVA (I)', type: 'amount', formula: 'somme produits' },
      AJ: { label: 'Achats de marchandises', type: 'amount' },
      AL: { label: 'Achats de matières premières et approvisionnements', type: 'amount' },
      AN: { label: 'Autres charges externes', type: 'amount' },
      AO: { label: 'Impôts, taxes et versements assimilés', type: 'amount' },
      AP: { label: 'Rémunérations du personnel', type: 'amount' },
      AQ: { label: 'Charges sociales', type: 'amount' },
      AR: { label: 'Dotations aux amortissements', type: 'amount' },
      AT: { label: 'Autres charges', type: 'amount' },
      AU: { label: 'Total des charges d\'exploitation (II)', type: 'amount', formula: 'somme charges' },
      AV: { label: '1 - RÉSULTAT D\'EXPLOITATION (I - II)', type: 'amount', formula: 'AI-AU' },
      AY: { label: 'Charges financières (V)', type: 'amount' },
      BA: { label: 'Impôts sur les bénéfices (VII)', type: 'amount' },
      BB: { label: '2 - BÉNÉFICE OU PERTE', type: 'amount', formula: 'Produits - Charges' },
      BC: { label: 'Résultat comptable (bénéfice)', type: 'amount' },
      BL: { label: '1 - RÉSULTAT FISCAL AVANT DÉFICITS (bénéfice)', type: 'amount' },
      BO: { label: '2 - RÉSULTAT FISCAL APRÈS DÉFICITS (bénéfice)', type: 'amount', formula: 'BL-BN' },
    },
  },
  {
    code: '2033-E',
    title: 'Détermination de la valeur ajoutée et effectifs',
    mandatory: true,
    description: 'CET — VA + effectifs salariés (alimente le 1330-SAFE)',
    lines: {
      AA: { label: 'Néant (si rien à déclarer, cochez)', type: 'boolean' },
      AB: { label: 'Effectif moyen du personnel', type: 'number' },
      AC: { label: '- dont apprentis', type: 'number' },
      AD: { label: '- dont handicapés', type: 'number' },
      AF: { label: 'Ventes de produits, prestations de services et marchandises', type: 'amount' },
      AJ: { label: 'TOTAL 1 (CA de référence CVAE)', type: 'amount', formula: 'AF' },
      AR: { label: 'Achats', type: 'amount' },
      AT: { label: 'Services extérieurs (hors loyers et redevances)', type: 'amount' },
      AU: { label: 'Loyers et redevances', type: 'amount' },
      BA: { label: 'TOTAL 3 (Charges)', type: 'amount', formula: 'AR+AT+AU' },
      BB: { label: 'Valeur ajoutée produite (Total 1 + Total 2 - Total 3)', type: 'amount', formula: 'AJ-BA' },
    },
  },
  {
    code: '2033-C',
    title: 'Immobilisations / Amortissements / Plus-values',
    mandatory: false,
    description: 'Uniquement si vous avez des immobilisations ou plus-values',
    lines: {
      AA: { label: 'Néant (case à cocher)', type: 'boolean' },
      AB: { label: 'Immobilisations incorporelles', type: 'amount' },
      AC: { label: 'Immobilisations corporelles', type: 'amount' },
      AE: { label: 'Total immobilisations', type: 'amount' },
      AF: { label: 'Amortissements incorporels', type: 'amount' },
      AG: { label: 'Amortissements corporels', type: 'amount' },
      AH: { label: 'Total amortissements', type: 'amount' },
      AI: { label: 'Plus-values courte durée', type: 'amount' },
      AJ: { label: 'Plus-values longue durée', type: 'amount' },
      AK: { label: 'Moins-values courte durée', type: 'amount' },
      AL: { label: 'Moins-values longue durée', type: 'amount' },
    },
  },
  {
    code: '2033-D',
    title: 'Provisions / Amortissements dérogatoires / Déficits',
    mandatory: false,
    description: 'Uniquement si provisions, amortissements dérogatoires ou déficits reportables',
    lines: {
      AA: { label: 'Néant (case à cocher)', type: 'boolean' },
      AE: { label: 'Provisions réglementées (fin d\'année)', type: 'amount' },
      AI: { label: 'Provisions pour risques et charges (fin)', type: 'amount' },
      AM: { label: 'Amortissements dérogatoires (fin)', type: 'amount' },
      AQ: { label: 'Déficits reportables (fin d\'année)', type: 'amount' },
    },
  },
  {
    code: '2033-F',
    title: 'Composition du capital social',
    mandatory: false,
    description: 'Uniquement si associés détenant ≥ 10% du capital',
    lines: {
      AA: { label: 'Néant (case à cocher)', type: 'boolean' },
      AB: { label: 'Nombre d\'associés/porteurs de parts', type: 'number' },
      AC: { label: 'Nombre de personnes physiques', type: 'number' },
      AD: { label: 'Nombre de personnes morales', type: 'number' },
      AE: { label: 'Capital social total', type: 'amount' },
    },
  },
  {
    code: '2033-G',
    title: 'Filiales et participations',
    mandatory: false,
    description: 'Uniquement si vous avez des filiales/participations',
    lines: {
      AA: { label: 'Néant (case à cocher)', type: 'boolean' },
      AB: { label: 'Nombre total de filiales/participations', type: 'number' },
    },
  },
  {
    code: '2065-BIS',
    title: 'Annexe 2065 (distributions, prêts associés)',
    mandatory: false,
    description: 'Uniquement si dividendes distribués ou prêts aux associés',
    lines: {
      AA: { label: 'Néant (case à cocher)', type: 'boolean' },
      AB: { label: 'Distributions versées (brut)', type: 'amount' },
      AD: { label: 'Distributions nettes', type: 'amount' },
      AE: { label: 'Rémunérations sans bénéficiaire désigné', type: 'amount' },
      AF: { label: 'Prêts/avances aux associés', type: 'amount' },
    },
  },
]

export function LiassePDFFiller() {
  const currentYear = new Date().getFullYear()
  const [year, setYear] = useState(currentYear - 1)
  const [pdfLines, setPdfLines] = useState<Record<string, Record<string, number | boolean>> | null>(null)
  const [loading, setLoading] = useState(false)
  const [copiedLine, setCopiedLine] = useState<string | null>(null)
  const [neantChecked, setNeantChecked] = useState<Record<string, boolean>>({})

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/liasse?year=${year}`)
      if (!res.ok) throw new Error('Erreur API')
      const d = await res.json()
      setPdfLines(d.pdfLines || null)
    } catch (e) {
      console.error(e)
      toast.error('Impossible de charger les données de la liasse')
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

  const copyValue = async (formCode: string, line: string, value: number | boolean | string) => {
    try {
      await navigator.clipboard.writeText(String(value))
      setCopiedLine(`${formCode}-${line}`)
      toast.success(`${formCode} ligne ${line} copiée : ${value}`)
      setTimeout(() => setCopiedLine(null), 2000)
    } catch {
      toast.error('Copie impossible')
    }
  }

  const generateLiasse = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/liasse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ year }),
      })
      const d = await res.json()
      if (d.liasse) {
        toast.success(`Liasse générée pour l'exercice ${year}`)
        fetchData()
      } else {
        toast.error(d.error || 'Erreur lors de la génération')
      }
    } catch (e) {
      console.error(e)
      toast.error('Erreur réseau')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2 text-xl">
                <FileText className="h-5 w-5 text-blue-600" />
                Liasse fiscale — Aide au remplissage PDF
              </CardTitle>
              <CardDescription className="mt-1">
                Copiez chaque valeur dans le formulaire correspondant sur impots.gouv.fr
                <br />
                <span className="text-xs">8 formulaires (2033-A à 2033-G + 2065-BIS) · Régime simplifié</span>
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Select value={year.toString()} onValueChange={(v) => setYear(parseInt(v))}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[currentYear - 2, currentYear - 1, currentYear, currentYear + 1].map((y) => (
                    <SelectItem key={y} value={y.toString()}>
                      Exercice {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={generateLiasse} disabled={loading}>
                <RefreshCw className="h-3 w-3 mr-1" />
                Générer
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* How to use */}
      <Alert className="border-blue-200 bg-blue-50/50">
        <Info className="h-4 w-4 text-blue-600" />
        <AlertDescription>
          <strong>Comment utiliser cette aide :</strong>
          <ol className="list-decimal list-inside mt-2 space-y-1 text-sm">
            <li>Sur impots.gouv.fr, ouvrez chaque formulaire (2033-A, 2033-B, 2033-E, etc.)</li>
            <li>Pour chaque ligne ci-dessous, cliquez sur <Copy className="h-3 w-3 inline mx-1" /> pour copier la valeur</li>
            <li>Collez-la dans la case correspondante sur impots.gouv.fr</li>
            <li>Pour les formulaires <strong>non obligatoires</strong> (C, D, F, G, 2065-BIS), cochez « néant » si non applicable</li>
          </ol>
        </AlertDescription>
      </Alert>

      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Forms list */}
      {!loading && FORM_DEFS.map((form) => {
        const values = pdfLines?.[form.code] || {}
        const hasValues = Object.keys(values).length > 0
        const isNeant = neantChecked[form.code]

        return (
          <Card key={form.code} className={form.mandatory ? 'border-blue-300' : 'border-slate-200'}>
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <span className="px-2 py-0.5 rounded bg-primary/10 text-primary text-sm font-mono">
                      {form.code}
                    </span>
                    {form.title}
                  </CardTitle>
                  <CardDescription className="mt-1">{form.description}</CardDescription>
                </div>
                {form.mandatory ? (
                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-400">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Obligatoire
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-slate-50 text-slate-500 border-slate-300">
                    Optionnel
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-1">
              {/* Néant checkbox for optional forms */}
              {!form.mandatory && (
                <div className="mb-3 p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center space-x-2">
                  <Checkbox
                    id={`neant-${form.code}`}
                    checked={isNeant || false}
                    onCheckedChange={(v) => setNeantChecked({ ...neantChecked, [form.code]: v === true })}
                  />
                  <label htmlFor={`neant-${form.code}`} className="text-sm cursor-pointer">
                    Je n'ai rien à déclarer sur ce formulaire (cochez « néant » sur impots.gouv.fr)
                  </label>
                </div>
              )}

              {/* Lines */}
              {!isNeant && Object.entries(form.lines).map(([lineCode, lineDef]) => {
                if (lineDef.type === 'header') return null
                const value = values[lineCode]
                const hasValue = value !== undefined && value !== null
                const isBoolean = lineDef.type === 'boolean'
                const isTotal = lineDef.formula !== undefined
                const isCopied = copiedLine === `${form.code}-${lineCode}`

                return (
                  <div
                    key={lineCode}
                    className={`flex items-center gap-3 py-2 px-3 border-b border-border/50 last:border-0 ${
                      isTotal ? 'bg-muted/50 font-semibold' : ''
                    } ${isBoolean ? 'bg-amber-50/30' : ''}`}
                  >
                    {/* Line code */}
                    <div className="flex-shrink-0 w-10 h-8 rounded bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">
                      {lineCode}
                    </div>
                    {/* Label */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">{lineDef.label}</p>
                      {lineDef.formula && (
                        <p className="text-xs text-muted-foreground font-mono">{lineDef.formula}</p>
                      )}
                    </div>
                    {/* Value + copy */}
                    <div className="flex-shrink-0 flex items-center gap-2">
                      {isBoolean ? (
                        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300">
                          Case à cocher
                        </Badge>
                      ) : hasValue ? (
                        <>
                          <span className="font-mono text-sm font-medium">
                            {lineDef.type === 'number' ? value : fmt(value as number)}
                          </span>
                          {(value as number) !== 0 && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 w-7 p-0"
                              onClick={() => copyValue(form.code, lineCode, lineDef.type === 'number' ? value : fmtPlain(value as number))}
                              title="Copier cette valeur"
                            >
                              {isCopied ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                            </Button>
                          )}
                        </>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">
                          {form.mandatory ? 'À calculer' : '0 (néant)'}
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}

              {isNeant && (
                <div className="p-4 bg-slate-50 rounded-lg text-center text-sm text-muted-foreground">
                  ✓ Formulaire « néant » — cochez simplement la case néant sur impots.gouv.fr
                </div>
              )}

              {/* If no values and mandatory, show warning */}
              {!hasValues && form.mandatory && !loading && (
                <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-sm text-amber-800">
                  <AlertTriangle className="h-4 w-4 inline mr-1" />
                  Aucune donnée. Cliquez sur « Générer » pour calculer les valeurs depuis vos transactions.
                </div>
              )}
            </CardContent>
          </Card>
        )
      })}

      {/* Summary card */}
      <Card className="border-emerald-200 bg-emerald-50/30">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Sparkles className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-semibold text-emerald-900">Récapitulatif de votre liasse</p>
              <p className="text-emerald-700 mt-1">
                Pour SAS PARFAIT SERVICES avec un CA ~5 064 € et un bénéfice de 454 € :
              </p>
              <ul className="list-disc list-inside mt-2 space-y-1 text-emerald-800">
                <li><strong>2033-A</strong> (Bilan) — Obligatoire</li>
                <li><strong>2033-B</strong> (Compte de résultat) — Obligatoire, montre bénéfice 454 €</li>
                <li><strong>2033-E</strong> (VA + effectifs) — Obligatoire, VA = 2 167,93 €</li>
                <li><strong>2033-C, D, F, G</strong> — Cochez « néant » (rien à déclarer)</li>
                <li><strong>2065-BIS</strong> — Cochez « néant » (pas de dividendes)</li>
              </ul>
              <p className="text-emerald-700 mt-2 text-xs">
                ⚠️ Vérifiez toujours avec votre expert-comptable avant de télétransmettre.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
