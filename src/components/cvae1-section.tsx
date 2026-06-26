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
  AlertCircle,
} from 'lucide-react'
import { toast } from 'sonner'

interface Settings {
  companyName: string
  companySIRET: string
  companySIREN: string
  companyTVA: string | null
  companyAddress: string
  vatRegime: string
}

interface CVAE1SectionProps {
  settings: Settings | null
}

interface CVAE1Calculation {
  chiffreAffaires: number
  servicesExterieurs: number
  valeurAjoutee: number
  effectifsSalaries: number
  chargesExclues: number
  nombreTransactions: number
  periodeLabel: string
}

interface CVAE1Data {
  fyEndYear: number
  periodeLabel: string
  calculation: CVAE1Calculation
  dueDate: string
  daysUntilDue: number
  isOverdue: boolean
  declaration: {
    id: string
    status: string
    reference: string | null
    filedAt: string | null
    amount: number
  } | null
}

export function CVAE1Section({ settings }: CVAE1SectionProps) {
  const currentYear = new Date().getFullYear()
  // Default to the FY whose CVAE1 deadline is most recent (upcoming or just passed).
  // CVAE1 for FY ending Nov 30, YYYY is due May 5 of YYYY+1.
  // So for currentYear 2026, FY 2025's deadline is May 5, 2026 (most recent). → default = currentYear - 1
  const [selectedYear, setSelectedYear] = useState(currentYear - 1)
  const [data, setData] = useState<CVAE1Data | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [effectifs, setEffectifs] = useState(0)
  const [vaOverride, setVaOverride] = useState<string>('')
  const [reference, setReference] = useState('')
  const [filedAt, setFiledAt] = useState(new Date().toISOString().split('T')[0])

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/declarations/cvae1?fyEndYear=${selectedYear}`)
      if (!res.ok) throw new Error('Erreur API')
      const d: CVAE1Data = await res.json()
      setData(d)
      setEffectifs(d.calculation.effectifsSalaries || 0)
      setVaOverride(d.calculation.valeurAjoutee?.toString() || '')
      setReference(d.declaration?.reference || '')
      setFiledAt(
        d.declaration?.filedAt
          ? d.declaration.filedAt.split('T')[0]
          : new Date().toISOString().split('T')[0]
      )
    } catch (e) {
      console.error(e)
      toast.error('Impossible de charger les données CVAE1')
    } finally {
      setLoading(false)
    }
  }, [selectedYear])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const formatEuro = (n: number) =>
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n || 0)

  const formatDate = (s: string) =>
    new Date(s).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    })

  // Use override if provided and valid, otherwise use calculated VA
  const effectiveVA =
    vaOverride !== '' && !isNaN(parseFloat(vaOverride))
      ? parseFloat(vaOverride)
      : data?.calculation.valeurAjoutee || 0

  const isFiled = data?.declaration?.status === 'filed'

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/declarations/cvae1', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fyEndYear: selectedYear,
          action: 'save',
          effectifsSalaries: effectifs,
          valeurAjouteeOverride:
            vaOverride !== '' && !isNaN(parseFloat(vaOverride))
              ? parseFloat(vaOverride)
              : undefined,
        }),
      })
      const d = await res.json()
      if (d.success) {
        toast.success(d.message || 'Valeurs enregistrées')
        fetchData()
      } else {
        toast.error(d.error || 'Erreur lors de la sauvegarde')
      }
    } catch (e) {
      console.error(e)
      toast.error('Erreur réseau')
    } finally {
      setSaving(false)
    }
  }

  const handleFile = async () => {
    if (!reference.trim()) {
      toast.error("Veuillez saisir la référence de l'accusé de réception télétransmis")
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/declarations/cvae1', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fyEndYear: selectedYear,
          action: 'file',
          effectifsSalaries: effectifs,
          reference: reference.trim(),
          filedAt,
          valeurAjouteeOverride:
            vaOverride !== '' && !isNaN(parseFloat(vaOverride))
              ? parseFloat(vaOverride)
              : undefined,
        }),
      })
      const d = await res.json()
      if (d.success) {
        toast.success(d.message || 'Déclaration marquée comme télétransmise')
        fetchData()
      } else {
        toast.error(d.error || 'Erreur lors du télétransmission')
      }
    } catch (e) {
      console.error(e)
      toast.error('Erreur réseau')
    } finally {
      setSaving(false)
    }
  }

  const statusBadge = () => {
    if (!data?.declaration) {
      return (
        <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-300">
          <Clock className="h-3 w-3 mr-1" />À préparer
        </Badge>
      )
    }
    if (data.declaration.status === 'filed') {
      return (
        <Badge variant="default" className="bg-emerald-600 hover:bg-emerald-600">
          <CheckCircle className="h-3 w-3 mr-1" />
          Télétransmis le {data.declaration.filedAt ? formatDate(data.declaration.filedAt) : ''}
        </Badge>
      )
    }
    return (
      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300">
        <Save className="h-3 w-3 mr-1" />
        Prêt à télétransmettre
      </Badge>
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
                CVAE1 — Déclaration 1330-SAFE
              </CardTitle>
              <CardDescription className="mt-1">
                Déclaration de la valeur ajoutée et des effectifs salariés
                <br />
                <span className="text-xs">
                  Formulaire 1330-CVAE · Art. 1586 octies II.1 du CGI
                </span>
              </CardDescription>
            </div>
            <div className="flex flex-col gap-2 items-start md:items-end">
              {statusBadge()}
              <Select
                value={selectedYear.toString()}
                onValueChange={(v) => setSelectedYear(parseInt(v))}
              >
                <SelectTrigger className="w-[180px]">
                  <Calendar className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Exercice" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: currentYear - 2022 + 2 }, (_, i) => 2022 + i).map((y) => (
                    <SelectItem key={y} value={y.toString()}>
                      Exercice {y} (01/12/{y - 1} → 30/11/{y})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Critical alert: mise en demeure / overdue */}
      {data?.isOverdue && !isFiled && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>
            {data.daysUntilDue < 0
              ? `Échéance dépassée depuis ${Math.abs(data.daysUntilDue)} jour(s)`
              : `Échéance imminente dans ${data.daysUntilDue} jour(s)`}
          </AlertTitle>
          <AlertDescription>
            <strong>Date limite :</strong> {formatDate(data.dueDate)}.
            Le défaut de dépôt de la déclaration 1330-SAFE expose à une amende de{' '}
            <strong>150&nbsp;€</strong> (art. 1729 B du CGI), pouvant aller jusqu'à{' '}
            <strong>1&nbsp;500&nbsp;€</strong> dans certains cas.
            <br />
            Régularisez sans délai sur{' '}
            <a
              href="https://impots.gouv.fr"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold underline inline-flex items-center"
            >
              impots.gouv.fr <ExternalLink className="h-3 w-3 ml-0.5" />
            </a>{' '}
            (espace professionnel → messagerie/déclarations), puis renseignez la référence
            ci-dessous.
          </AlertDescription>
        </Alert>
      )}

      {/* Info: CVAE abolished but declaration still mandatory */}
      {!data?.isOverdue && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            <strong>Bon à savoir :</strong> La taxe CVAE est supprimée depuis le 01/01/2024,
            mais la <strong>déclaration 1330-SAFE reste obligatoire</strong>. Elle sert au
            plafonnement de la CFE et à la déclaration des effectifs salariés (seuils TVA,
            formation continue, etc.). Aucun impôt à payer — déclaration uniquement.
          </AlertDescription>
        </Alert>
      )}

      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {!loading && data && (
        <>
          {/* Calcul de la valeur ajoutée */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5 text-blue-600" />
                Calcul de la valeur ajoutée
              </CardTitle>
              <CardDescription>
                Période : {data.periodeLabel} · Calculé automatiquement à partir de vos
                transactions ({data.calculation.nombreTransactions} transactions)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* CA */}
              <div className="grid md:grid-cols-2 gap-4">
                <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingUp className="h-4 w-4 text-emerald-600" />
                    <span className="text-sm font-medium text-emerald-800">
                      Chiffre d&apos;affaires (produits)
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-emerald-700">
                    {formatEuro(data.calculation.chiffreAffaires)}
                  </p>
                </div>
                <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                  <div className="flex items-center gap-2 mb-1">
                    <Calculator className="h-4 w-4 text-amber-600" />
                    <span className="text-sm font-medium text-amber-800">
                      Services extérieurs &amp; achats (déductibles)
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-amber-700">
                    {formatEuro(data.calculation.servicesExterieurs)}
                  </p>
                </div>
              </div>

              {/* VA result */}
              <div className="p-6 bg-blue-50 rounded-lg border-2 border-blue-300">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-800">
                      Valeur ajoutée (VA) — art. 1586 nonies CGI
                    </p>
                    <p className="text-xs text-blue-600 mt-0.5">
                      CA − services extérieurs − achats
                    </p>
                  </div>
                  <p className="text-3xl font-bold text-blue-700">
                    {formatEuro(effectiveVA)}
                  </p>
                </div>
              </div>

              {/* Override VA */}
              <div className="space-y-2">
                <Label htmlFor="va-override" className="text-sm">
                  Valeur ajoutée (ajustement manuel — laisser vide pour utiliser le calcul
                  automatique)
                </Label>
                <Input
                  id="va-override"
                  type="number"
                  step="0.01"
                  value={vaOverride}
                  onChange={(e) => setVaOverride(e.target.value)}
                  placeholder={data.calculation.valeurAjoutee?.toFixed(2)}
                  className="max-w-xs"
                />
                <p className="text-xs text-muted-foreground">
                  Ajustez si votre expert-comptable a calculé une VA différente (retraitements
                  fiscaux, produits exceptionnels, etc.).
                </p>
              </div>

              <Separator />

              {/* Effectifs */}
              <div className="space-y-2">
                <Label htmlFor="effectifs" className="flex items-center gap-2 text-sm">
                  <Users className="h-4 w-4" />
                  Effectifs salariés (moyenne annuelle)
                </Label>
                <Input
                  id="effectifs"
                  type="number"
                  min="0"
                  step="1"
                  value={effectifs}
                  onChange={(e) => setEffectifs(parseInt(e.target.value) || 0)}
                  className="max-w-xs"
                />
                <p className="text-xs text-muted-foreground">
                  Nombre moyen de salariés sur l&apos;exercice (utilisée pour les seuils TVA,
                  la formation continue, etc.). Pour un dirigeant non salarié (président SAS),
                  saisir 0.
                </p>
              </div>

              {/* Charges exclues (info) */}
              {data.calculation.chargesExclues > 0 && (
                <div className="text-xs text-muted-foreground p-3 bg-muted rounded">
                  <Info className="h-3 w-3 inline mr-1" />
                  Charges non déductibles de la VA (rémunérations, cotisations, impôts,
                  amortissements) : {formatEuro(data.calculation.chargesExclues)}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Télétransmission */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="h-5 w-5 text-purple-600" />
                Télétransmission sur impots.gouv.fr
              </CardTitle>
              <CardDescription>
                La déclaration doit obligatoirement être télétransmise depuis votre espace
                professionnel sur impots.gouv.fr.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Procédure :</strong>
                  <ol className="list-decimal list-inside mt-2 space-y-1 text-sm">
                    <li>
                      Connectez-vous à{' '}
                      <a
                        href="https://impots.gouv.fr"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 underline inline-flex items-center"
                      >
                        impots.gouv.fr <ExternalLink className="h-3 w-3 ml-0.5" />
                      </a>{' '}
                      (espace professionnel)
                    </li>
                    <li>
                      Ouvrez la déclaration <strong>1330-SAFE</strong> pour la période{' '}
                      {data.periodeLabel}
                    </li>
                    <li>
                      Saisissez la valeur ajoutée (<strong>{formatEuro(effectiveVA)}</strong>) et
                      les effectifs (<strong>{effectifs}</strong>)
                    </li>
                    <li>Télétransmettez et notez la référence de l&apos;accusé de réception</li>
                    <li>Saisissez cette référence ci-dessous pour archiver</li>
                  </ol>
                </AlertDescription>
              </Alert>

              {isFiled ? (
                <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200 space-y-2">
                  <div className="flex items-center gap-2 text-emerald-700 font-semibold">
                    <CheckCircle className="h-5 w-5" />
                    Déclaration télétransmise
                  </div>
                  <div className="text-sm space-y-1">
                    <p>
                      <strong>Référence :</strong> {data.declaration?.reference || '—'}
                    </p>
                    <p>
                      <strong>Date :</strong>{' '}
                      {data.declaration?.filedAt ? formatDate(data.declaration.filedAt) : '—'}
                    </p>
                    <p>
                      <strong>Valeur ajoutée déclarée :</strong> {formatEuro(effectiveVA)}
                    </p>
                    <p>
                      <strong>Effectifs déclarés :</strong> {effectifs}
                    </p>
                  </div>
                  <Button variant="outline" size="sm" onClick={fetchData} className="mt-2">
                    Modifier
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="reference">Référence accusé de réception</Label>
                      <Input
                        id="reference"
                        value={reference}
                        onChange={(e) => setReference(e.target.value)}
                        placeholder="ex: 2026_06_906143"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="filedAt">Date de télétransmission</Label>
                      <Input
                        id="filedAt"
                        type="date"
                        value={filedAt}
                        onChange={(e) => setFiledAt(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button onClick={handleSave} disabled={saving} variant="outline">
                      {saving ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4 mr-2" />
                      )}
                      Enregistrer (prêt à télétransmettre)
                    </Button>
                    <Button onClick={handleFile} disabled={saving}>
                      {saving ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <CheckCircle className="h-4 w-4 mr-2" />
                      )}
                      Marquer comme télétransmis
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
            <CardFooter className="text-xs text-muted-foreground border-t pt-4">
              <p>
                Référence légale : art. 1586 octies II.1 du CGI · Amende 150 € (art. 1729 B CGI)
                · Télétransmission obligatoire (art. 1649 quater B quater CGI)
              </p>
            </CardFooter>
          </Card>
        </>
      )}
    </div>
  )
}
