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
import { Progress } from '@/components/ui/progress'
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
  Calendar,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Loader2,
  RefreshCw,
  FileText,
  Building2,
  Receipt,
  FileSpreadsheet,
  Users,
  TrendingUp,
  ChevronRight,
  Sparkles,
} from 'lucide-react'
import { toast } from 'sonner'

interface AnnualObligationsSectionProps {
  onNavigate?: (tab: string) => void
}

interface Deadline {
  id: string
  name: string
  type: string
  dueDate: string
  periodStart: string | null
  periodEnd: string | null
  status: string
  amount: number | null
  notes: string | null
}

const OBLIGATION_META: Record<
  string,
  { label: string; icon: typeof FileText; color: string; tab: string; description: string }
> = {
  CVAE1: {
    label: 'CVAE1 (1330-SAFE)',
    icon: TrendingUp,
    color: 'text-rose-600',
    tab: 'cvae1',
    description: 'Valeur ajoutée + effectifs salariés',
  },
  TVA: {
    label: 'TVA (CA12)',
    icon: Receipt,
    color: 'text-amber-600',
    tab: 'formulaire-tva',
    description: 'Déclaration annuelle TVA — Régime simplifié',
  },
  LIASSE: {
    label: 'Liasse Fiscale',
    icon: FileSpreadsheet,
    color: 'text-purple-600',
    tab: 'liasse',
    description: 'Bilan + compte de résultat + annexes',
  },
  CFE: {
    label: 'CFE',
    icon: Building2,
    color: 'text-emerald-600',
    tab: 'deadlines',
    description: 'Cotisation Foncière des Entreprises',
  },
  DAS2: {
    label: 'DAS2',
    icon: Users,
    color: 'text-blue-600',
    tab: 'deadlines',
    description: 'Honoraires, commissions, ristournes versés',
  },
}

const ANNUAL_TYPES = ['CVAE1', 'TVA', 'LIASSE', 'CFE', 'DAS2']

export function AnnualObligationsSection({
  onNavigate,
}: AnnualObligationsSectionProps) {
  const currentYear = new Date().getFullYear()
  const [selectedYear, setSelectedYear] = useState(currentYear)
  const [deadlines, setDeadlines] = useState<Deadline[]>([])
  const [loading, setLoading] = useState(false)
  const [meta, setMeta] = useState<{ autoRenewed: number; overdueMarked: number } | null>(null)

  const fetchDeadlines = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/deadlines?year=${selectedYear}&renew=1`)
      if (!res.ok) throw new Error('Erreur API')
      const d = await res.json()
      setDeadlines(d.deadlines || [])
      setMeta(d.meta || null)
      if (d.meta?.autoRenewed > 0) {
        toast.info(`${d.meta.autoRenewed} nouvelle(s) échéance(s) générée(s) automatiquement`)
      }
    } catch (e) {
      console.error(e)
      toast.error('Impossible de charger les obligations')
    } finally {
      setLoading(false)
    }
  }, [selectedYear])

  useEffect(() => {
    fetchDeadlines()
  }, [fetchDeadlines])

  const formatEuro = (n: number) =>
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n || 0)

  const formatDate = (s: string) =>
    new Date(s).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })

  const getDaysUntil = (s: string) => {
    const now = new Date()
    now.setHours(0, 0, 0, 0)
    const d = new Date(s)
    d.setHours(0, 0, 0, 0)
    return Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  }

  // Filter only annual obligations for the selected year
  const annualDeadlines = deadlines.filter((d) => ANNUAL_TYPES.includes(d.type))

  // Sort by due date
  annualDeadlines.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())

  // Stats
  const total = annualDeadlines.length
  const done = annualDeadlines.filter((d) => d.status === 'done').length
  const pending = annualDeadlines.filter((d) => d.status === 'pending').length
  const overdue = annualDeadlines.filter((d) => d.status === 'overdue').length
  const progressPct = total > 0 ? Math.round((done / total) * 100) : 0

  const getStatusBadge = (d: Deadline) => {
    const days = getDaysUntil(d.dueDate)
    if (d.status === 'done') {
      return (
        <Badge variant="default" className="bg-emerald-600 hover:bg-emerald-600">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Réglée
        </Badge>
      )
    }
    if (d.status === 'overdue' || days < 0) {
      return (
        <Badge variant="destructive">
          <AlertTriangle className="h-3 w-3 mr-1" />
          En retard
        </Badge>
      )
    }
    if (days <= 7) {
      return (
        <Badge variant="destructive" className="bg-red-100 text-red-700 hover:bg-red-100">
          <Clock className="h-3 w-3 mr-1" />
          Urgent ({days}j)
        </Badge>
      )
    }
    if (days <= 30) {
      return (
        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300">
          <Clock className="h-3 w-3 mr-1" />
          Bientôt ({days}j)
        </Badge>
      )
    }
    return (
      <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-300">
        <Clock className="h-3 w-3 mr-1" />
        Dans {days}j
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
                <Calendar className="h-5 w-5 text-blue-600" />
                Obligations annuelles — {selectedYear}
              </CardTitle>
              <CardDescription className="mt-1">
                Vue d&apos;ensemble de toutes vos obligations fiscales annuelles pour
                l&apos;exercice {selectedYear}. Les échéances sont{' '}
                <strong>générées automatiquement</strong> chaque année.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Select
                value={selectedYear.toString()}
                onValueChange={(v) => setSelectedYear(parseInt(v))}
              >
                <SelectTrigger className="w-[140px]">
                  <Calendar className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[currentYear - 1, currentYear, currentYear + 1].map((y) => (
                    <SelectItem key={y} value={y.toString()}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" size="icon" onClick={fetchDeadlines} disabled={loading}>
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Auto-renewal info */}
      {meta && (meta.autoRenewed > 0 || meta.overdueMarked > 0) && (
        <Alert>
          <Sparkles className="h-4 w-4 text-blue-600" />
          <AlertDescription>
            {meta.autoRenewed > 0 && (
              <span>
                <strong>{meta.autoRenewed}</strong> nouvelle(s) échéance(s) créée(s)
                automatiquement pour {selectedYear}.{' '}
              </span>
            )}
            {meta.overdueMarked > 0 && (
              <span>
                <strong>{meta.overdueMarked}</strong> échéance(s) marquée(s) en retard.
              </span>
            )}
            Le système renouvelle vos obligations chaque année — vous ne raterez plus aucune
            échéance.
          </AlertDescription>
        </Alert>
      )}

      {/* Progress summary */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
            <div>
              <h3 className="text-lg font-semibold">Avancement de l&apos;exercice {selectedYear}</h3>
              <p className="text-sm text-muted-foreground">
                {done} réglée(s) · {pending} en cours · {overdue} en retard · {total} au total
              </p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-blue-600">{progressPct}%</p>
              <p className="text-xs text-muted-foreground">complété</p>
            </div>
          </div>
          <Progress value={progressPct} className="h-3" />
        </CardContent>
      </Card>

      {/* Overdue alert */}
      {overdue > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>{overdue} obligation(s) en retard</AlertTitle>
          <AlertDescription>
            Vous avez des obligations fiscales en retard. Régularisez sans tarder pour éviter
            les pénalités (amendes, intérêts de retard, taxation d&apos;office). Cliquez sur une
            obligation ci-dessous pour la traiter.
          </AlertDescription>
        </Alert>
      )}

      {/* Obligations list */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {annualDeadlines.map((d) => {
            const meta = OBLIGATION_META[d.type] || {
              label: d.name,
              icon: FileText,
              color: 'text-slate-600',
              tab: 'deadlines',
              description: '',
            }
            const Icon = meta.icon
            const days = getDaysUntil(d.dueDate)
            const isOverdue = d.status === 'overdue' || (d.status === 'pending' && days < 0)
            const isDone = d.status === 'done'

            return (
              <Card
                key={d.id}
                className={`cursor-pointer transition-all hover:shadow-md ${
                  isOverdue ? 'border-red-300 bg-red-50/30' : ''
                } ${isDone ? 'opacity-70' : ''}`}
                onClick={() => onNavigate?.(meta.tab)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Icon className={`h-5 w-5 ${meta.color}`} />
                      <div>
                        <CardTitle className="text-base">{meta.label}</CardTitle>
                        <CardDescription className="text-xs">{meta.description}</CardDescription>
                      </div>
                    </div>
                    {getStatusBadge(d)}
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Échéance</span>
                      <span className={`font-medium ${isOverdue ? 'text-red-600' : ''}`}>
                        {formatDate(d.dueDate)}
                      </span>
                    </div>
                    {d.periodStart && d.periodEnd && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Période</span>
                        <span className="text-xs">
                          {formatDate(d.periodStart)} → {formatDate(d.periodEnd)}
                        </span>
                      </div>
                    )}
                    {d.amount !== null && d.amount > 0 && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Montant estimé</span>
                        <span className="font-medium">{formatEuro(d.amount)}</span>
                      </div>
                    )}
                  </div>
                  <Separator className="my-3" />
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      {isDone
                        ? 'Obligation honorée'
                        : isOverdue
                        ? 'Régulariser urgemment'
                        : days === 0
                        ? "Échéance aujourd'hui"
                        : `Dans ${days} jour(s)`}
                    </span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            )
          })}

          {annualDeadlines.length === 0 && !loading && (
            <Card className="md:col-span-2">
              <CardContent className="pt-6 text-center text-muted-foreground">
                Aucune obligation annuelle pour {selectedYear}. Cliquez sur le bouton refresh
                pour générer les échéances.
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Help card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Sparkles className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm space-y-2">
              <p className="font-semibold text-foreground">Renouvellement automatique</p>
              <p className="text-muted-foreground">
                Cette liste se régénère automatiquement chaque année. Les échéances de
                l&apos;année <strong>N+1</strong> sont créées dès l&apos;année{' '}
                <strong>N</strong>, ce qui vous laisse ~12 mois d&apos;anticipation. Un email de
                rappel est envoyé 3 à 7 jours avant chaque échéance (configurable dans les
                Paramètres).
              </p>
              <p className="text-muted-foreground">
                Pour la déclaration <strong>CVAE1 (1330-SAFE)</strong>, bien que la taxe soit
                supprimée depuis 2024, la déclaration reste <strong>obligatoire</strong> et son
                oubli entraîne une amende de <strong>150&nbsp;€</strong>.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
