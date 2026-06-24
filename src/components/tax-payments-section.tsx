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
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Receipt, Loader2, Plus, Euro, Calendar, CreditCard,
  Paperclip, Trash2, AlertCircle, CheckCircle, Info,
  Link2, Banknote, History
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

interface TaxPayment {
  id: string
  taxType: string
  declarationId: string | null
  year: number
  period: string
  label: string
  amount: number
  paymentDate: string
  dueDate: string | null
  paymentMethod: string | null
  reference: string | null
  status: string
  transactionId: string | null
  receiptUrl: string | null
  notes: string | null
  isHistorical: boolean
  createdAt: string
  updatedAt: string
  declaration: { id: string; type: string; year: number; period: string; status: string } | null
  transaction: { id: string; date: string; amount: number; description: string } | null
}

interface BankTransaction {
  id: string
  date: string
  amount: number
  description: string
  type: string
  categoryId: string | null
  category: { id: string; name: string; color: string } | null
}

interface TaxPaymentsSectionProps {
  settings: Settings | null
}

const TAX_TYPES = [
  { value: 'IS', label: 'IS (Impôt sur les Sociétés)' },
  { value: 'TVA', label: 'TVA (Taxe sur la Valeur Ajoutée)' },
  { value: 'CFE', label: 'CFE (Cotisation Foncière des Entreprises)' },
  { value: 'TVS', label: 'TVS (Taxe sur les Véhicules de Société)' },
  { value: 'CIR', label: 'CIR (Crédit d\'Impôt Recherche)' },
  { value: 'CII', label: 'CII (Crédit d\'Impôt Innovation)' },
  { value: 'CVA', label: 'CVA (Cotisation sur la Valeur Ajoutée)' },
  { value: 'DAS2', label: 'DAS2 (Déclaration des Salaires)' },
  { value: 'OTHER', label: 'Autre' },
]

const PAYMENT_METHODS = [
  { value: 'telepaiement', label: 'Télépaiement' },
  { value: 'virement', label: 'Virement' },
  { value: 'prelevement', label: 'Prélèvement automatique' },
  { value: 'cheque', label: 'Chèque' },
  { value: 'autre', label: 'Autre' },
]

const TAX_TYPE_COLORS: Record<string, string> = {
  IS: 'bg-blue-100 text-blue-800 border-blue-200',
  TVA: 'bg-amber-100 text-amber-800 border-amber-200',
  CFE: 'bg-purple-100 text-purple-800 border-purple-200',
  TVS: 'bg-rose-100 text-rose-800 border-rose-200',
  CIR: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  CII: 'bg-teal-100 text-teal-800 border-teal-200',
  CVA: 'bg-orange-100 text-orange-800 border-orange-200',
  DAS2: 'bg-cyan-100 text-cyan-800 border-cyan-200',
  OTHER: 'bg-gray-100 text-gray-800 border-gray-200',
}

function getAutoPeriod(taxType: string, year: number): string {
  const now = new Date()
  const currentMonth = now.getMonth() + 1 // 1-12
  switch (taxType) {
    case 'IS': {
      // Determine which quarter
      if (currentMonth <= 3) return `IS-Q1-${year}`
      if (currentMonth <= 6) return `IS-Q2-${year}`
      if (currentMonth <= 9) return `IS-Q3-${year}`
      return `IS-Q4-${year}`
    }
    case 'TVA':
      return `CA12-${year}`
    case 'CFE':
      return `CFE-${year}`
    case 'TVS':
      return `TVS-${year}`
    case 'CIR':
      return `CIR-${year}`
    case 'CII':
      return `CII-${year}`
    case 'CVA':
      return `CVA-${year}`
    case 'DAS2':
      return `DAS2-${year}`
    default:
      return `AUTRE-${year}`
  }
}

function getAutoLabel(taxType: string, period: string): string {
  switch (taxType) {
    case 'IS':
      return `Acompte IS ${period}`
    case 'TVA':
      return `TVA ${period}`
    case 'CFE':
      return `Cotisation Foncière des Entreprises ${period}`
    case 'TVS':
      return `Taxe sur les Véhicules ${period}`
    case 'CIR':
      return `Crédit d'Impôt Recherche ${period}`
    case 'CII':
      return `Crédit d'Impôt Innovation ${period}`
    default:
      return `${taxType} ${period}`
  }
}

export function TaxPaymentsSection({ settings }: TaxPaymentsSectionProps) {
  const [payments, setPayments] = useState<TaxPayment[]>([])
  const [bankTransactions, setBankTransactions] = useState<BankTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [activeTab, setActiveTab] = useState('record')

  // Form state
  const [formTaxType, setFormTaxType] = useState('IS')
  const [formYear, setFormYear] = useState(new Date().getFullYear())
  const [formPeriod, setFormPeriod] = useState('')
  const [formLabel, setFormLabel] = useState('')
  const [formAmount, setFormAmount] = useState('')
  const [formPaymentDate, setFormPaymentDate] = useState('')
  const [formDueDate, setFormDueDate] = useState('')
  const [formPaymentMethod, setFormPaymentMethod] = useState('telepaiement')
  const [formReference, setFormReference] = useState('')
  const [formNotes, setFormNotes] = useState('')
  const [formIsHistorical, setFormIsHistorical] = useState(false)

  // Delete confirmation
  const [deleteId, setDeleteId] = useState<string | null>(null)

  // Linking state for bank reconciliation
  const [linkingPaymentId, setLinkingPaymentId] = useState<string | null>(null)
  const [linkingTransactionId, setLinkingTransactionId] = useState<string | null>(null)

  useEffect(() => {
    fetchPayments()
    fetchBankTransactions()
  }, [])

  const fetchPayments = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/tax-payments')
      const data = await res.json()
      setPayments(data.payments || [])
    } catch (error) {
      console.error('Error fetching tax payments:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchBankTransactions = async () => {
    try {
      const res = await fetch('/api/transactions')
      const data = await res.json()
      const allTransactions = data.transactions || []
      // Filter for tax-related transactions (Impôts et taxes category)
      const taxTransactions = allTransactions.filter(
        (t: BankTransaction) =>
          t.type === 'expense' &&
          t.amount < 0 &&
          t.category?.name?.toLowerCase().includes('impôt') ||
          t.category?.name?.toLowerCase().includes('taxe') ||
          t.description?.toLowerCase().includes('impot') ||
          t.description?.toLowerCase().includes('impôt') ||
          t.description?.toLowerCase().includes('dgfip')
      )
      // Filter out transactions already linked to a tax payment
      const linkedTxIds = new Set<string>()
      // We'll check against existing payments' transactionIds
      setBankTransactions(taxTransactions.slice(0, 50)) // Limit for performance
    } catch (error) {
      console.error('Error fetching bank transactions:', error)
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-100">Payé</Badge>
      case 'pending':
        return <Badge className="bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100">En attente</Badge>
      case 'cancelled':
        return <Badge className="bg-red-100 text-red-800 border-red-200 hover:bg-red-100">Annulé</Badge>
      case 'adjusted':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-100">Ajusté</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const getPaymentMethodLabel = (method: string | null) => {
    if (!method) return '-'
    const found = PAYMENT_METHODS.find(m => m.value === method)
    return found ? found.label : method
  }

  // Summary calculations
  const currentYear = new Date().getFullYear()
  const totalPaidThisYear = payments
    .filter(p => p.year === currentYear && p.status === 'completed')
    .reduce((sum, p) => sum + p.amount, 0)
  const totalPaidLastYear = payments
    .filter(p => p.year === currentYear - 1 && p.status === 'completed')
    .reduce((sum, p) => sum + p.amount, 0)

  // Find next upcoming payment (pending, closest future)
  const upcomingPayments = payments
    .filter(p => p.status === 'pending')
    .sort((a, b) => new Date(a.paymentDate).getTime() - new Date(b.paymentDate).getTime())
  const nextPayment = upcomingPayments[0]

  // Handle tax type change - auto-fill period and label
  const handleTaxTypeChange = (taxType: string) => {
    setFormTaxType(taxType)
    const period = getAutoPeriod(taxType, formYear)
    setFormPeriod(period)
    setFormLabel(getAutoLabel(taxType, period))
  }

  const handleYearChange = (year: number) => {
    setFormYear(year)
    const period = getAutoPeriod(formTaxType, year)
    setFormPeriod(period)
    setFormLabel(getAutoLabel(formTaxType, period))
  }

  // Submit payment
  const handleSubmit = async () => {
    // Validation
    if (!formTaxType) { toast.error('Veuillez sélectionner le type d\'impôt'); return }
    if (!formYear) { toast.error('Veuillez indiquer l\'année fiscale'); return }
    if (!formPeriod.trim()) { toast.error('Veuillez indiquer la période'); return }
    if (!formLabel.trim()) { toast.error('Veuillez indiquer un libellé'); return }
    if (!formAmount || parseFloat(formAmount) <= 0) { toast.error('Le montant doit être positif'); return }
    if (!formPaymentDate) { toast.error('Veuillez indiquer la date de paiement'); return }

    setSubmitting(true)
    try {
      const res = await fetch('/api/tax-payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taxType: formTaxType,
          year: formYear,
          period: formPeriod,
          label: formLabel,
          amount: parseFloat(formAmount),
          paymentDate: new Date(formPaymentDate).toISOString(),
          dueDate: formDueDate ? new Date(formDueDate).toISOString() : null,
          paymentMethod: formPaymentMethod || null,
          reference: formReference || null,
          notes: formNotes || null,
          isHistorical: formIsHistorical,
        })
      })
      const data = await res.json()

      if (data.success) {
        toast.success(data.message)
        // Reset form
        setFormPeriod('')
        setFormLabel('')
        setFormAmount('')
        setFormPaymentDate('')
        setFormDueDate('')
        setFormReference('')
        setFormNotes('')
        setFormIsHistorical(false)
        fetchPayments()
      } else {
        toast.error(data.error || 'Erreur lors de l\'enregistrement')
        if (data.details) console.error('Details:', data.details)
      }
    } catch (error) {
      console.error('Error creating tax payment:', error)
      toast.error('Erreur de connexion au serveur')
    } finally {
      setSubmitting(false)
    }
  }

  // Delete payment
  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/tax-payments?id=${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.success) {
        toast.success('Paiement supprimé')
        fetchPayments()
      } else {
        toast.error(data.error || 'Erreur lors de la suppression')
      }
    } catch (error) {
      console.error('Error deleting tax payment:', error)
      toast.error('Erreur de connexion')
    } finally {
      setDeleteId(null)
    }
  }

  // Link transaction to payment
  const handleLinkTransaction = async (paymentId: string, transactionId: string) => {
    try {
      const res = await fetch('/api/tax-payments', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: paymentId, transactionId })
      })
      const data = await res.json()
      if (data.success) {
        toast.success('Transaction liée au paiement')
        setLinkingPaymentId(null)
        setLinkingTransactionId(null)
        fetchPayments()
        fetchBankTransactions()
      } else {
        toast.error(data.error || 'Erreur lors du rapprochement')
      }
    } catch (error) {
      console.error('Error linking transaction:', error)
      toast.error('Erreur de connexion')
    }
  }

  // Get linked transaction IDs from existing payments
  const linkedTransactionIds = new Set(
    payments.filter(p => p.transactionId).map(p => p.transactionId!)
  )
  const unmatchedBankTransactions = bankTransactions.filter(
    (t) => !linkedTransactionIds.has(t.id)
  )

  // Year options
  const yearOptions = []
  for (let y = currentYear + 2; y >= currentYear - 5; y--) {
    yearOptions.push(y)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-200">
        <CardContent className="py-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-emerald-900 flex items-center gap-2">
                <Receipt className="h-5 w-5" />
                Paiements d&apos;impôts
              </h2>
              <p className="text-sm text-emerald-700">
                Enregistrez et suivez vos paiements effectifs auprès de l&apos;administration fiscale
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-l-4 border-l-emerald-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total payé {currentYear}
            </CardTitle>
            <Euro className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{formatCurrency(totalPaidThisYear)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {payments.filter(p => p.year === currentYear && p.status === 'completed').length} paiement(s)
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-slate-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total payé {currentYear - 1}
            </CardTitle>
            <History className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-600">{formatCurrency(totalPaidLastYear)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {payments.filter(p => p.year === currentYear - 1 && p.status === 'completed').length} paiement(s)
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Prochain paiement
            </CardTitle>
            <Calendar className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            {nextPayment ? (
              <>
                <div className="text-2xl font-bold text-amber-600">{formatCurrency(nextPayment.amount)}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {nextPayment.label} — {formatDate(nextPayment.paymentDate)}
                </p>
              </>
            ) : (
              <>
                <div className="text-2xl font-bold text-muted-foreground">-</div>
                <p className="text-xs text-muted-foreground mt-1">Aucun paiement en attente</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="record">
            <Plus className="h-4 w-4 mr-1.5" />
            Enregistrer un paiement
          </TabsTrigger>
          <TabsTrigger value="history">
            <Receipt className="h-4 w-4 mr-1.5" />
            Historique
          </TabsTrigger>
          <TabsTrigger value="reconciliation">
            <Link2 className="h-4 w-4 mr-1.5" />
            Rapprochement bancaire
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Enregistrer un paiement */}
        <TabsContent value="record" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Nouveau paiement d&apos;impôt
              </CardTitle>
              <CardDescription>
                Enregistrez un paiement effectué sur impots.gouv.fr ou un paiement antérieur
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-2">
                {/* Tax Type */}
                <div className="space-y-2">
                  <Label htmlFor="taxType">Type d&apos;impôt *</Label>
                  <Select value={formTaxType} onValueChange={handleTaxTypeChange}>
                    <SelectTrigger id="taxType">
                      <SelectValue placeholder="Sélectionnez le type" />
                    </SelectTrigger>
                    <SelectContent>
                      {TAX_TYPES.map(t => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Year */}
                <div className="space-y-2">
                  <Label htmlFor="year">Année fiscale *</Label>
                  <Select
                    value={formYear.toString()}
                    onValueChange={(v) => handleYearChange(parseInt(v))}
                  >
                    <SelectTrigger id="year">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {yearOptions.map(y => (
                        <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Period */}
                <div className="space-y-2">
                  <Label htmlFor="period">Période *</Label>
                  <Input
                    id="period"
                    value={formPeriod}
                    onChange={(e) => setFormPeriod(e.target.value)}
                    placeholder="ex: IS-Q1-2025, CA12-2025, CFE-2025"
                  />
                </div>

                {/* Label */}
                <div className="space-y-2">
                  <Label htmlFor="label">Libellé *</Label>
                  <Input
                    id="label"
                    value={formLabel}
                    onChange={(e) => setFormLabel(e.target.value)}
                    placeholder="ex: Acompte IS Q1 2025"
                  />
                </div>

                {/* Amount */}
                <div className="space-y-2">
                  <Label htmlFor="amount">Montant (€) *</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formAmount}
                    onChange={(e) => setFormAmount(e.target.value)}
                    placeholder="0.00"
                  />
                </div>

                {/* Payment Date */}
                <div className="space-y-2">
                  <Label htmlFor="paymentDate">Date de paiement *</Label>
                  <Input
                    id="paymentDate"
                    type="date"
                    value={formPaymentDate}
                    onChange={(e) => setFormPaymentDate(e.target.value)}
                  />
                </div>

                {/* Due Date */}
                <div className="space-y-2">
                  <Label htmlFor="dueDate">Date d&apos;échéance (optionnel)</Label>
                  <Input
                    id="dueDate"
                    type="date"
                    value={formDueDate}
                    onChange={(e) => setFormDueDate(e.target.value)}
                  />
                </div>

                {/* Payment Method */}
                <div className="space-y-2">
                  <Label htmlFor="paymentMethod">Mode de paiement</Label>
                  <Select value={formPaymentMethod} onValueChange={setFormPaymentMethod}>
                    <SelectTrigger id="paymentMethod">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PAYMENT_METHODS.map(m => (
                        <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Reference */}
                <div className="space-y-2">
                  <Label htmlFor="reference">Référence impots.gouv.fr</Label>
                  <Input
                    id="reference"
                    value={formReference}
                    onChange={(e) => setFormReference(e.target.value)}
                    placeholder="N° de télé-règlement"
                  />
                </div>

                {/* Notes - full width */}
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                    placeholder="Notes complémentaires..."
                    rows={3}
                  />
                </div>

                {/* Historical checkbox */}
                <div className="md:col-span-2">
                  <div className="flex items-center space-x-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <Checkbox
                      id="isHistorical"
                      checked={formIsHistorical}
                      onCheckedChange={(checked) => setFormIsHistorical(checked === true)}
                    />
                    <Label htmlFor="isHistorical" className="text-sm font-medium text-amber-800 cursor-pointer">
                      Paiement antérieur (effectué avant l&apos;utilisation de l&apos;application)
                    </Label>
                  </div>
                </div>
              </div>

              <Separator className="my-6" />

              <div className="flex justify-end">
                <Button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="min-w-[200px]"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Enregistrement...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Enregistrer le paiement
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Historique */}
        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5" />
                Historique des paiements
              </CardTitle>
              <CardDescription>
                {payments.length} paiement(s) enregistré(s)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : payments.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Receipt className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">Aucun paiement enregistré</p>
                  <p className="text-sm mt-2">
                    Commencez par enregistrer vos paiements d&apos;impôts pour les suivre ici
                  </p>
                </div>
              ) : (
                <div className="rounded-md border max-h-[500px] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="sticky top-0 bg-background">Date</TableHead>
                        <TableHead className="sticky top-0 bg-background">Type</TableHead>
                        <TableHead className="sticky top-0 bg-background">Période</TableHead>
                        <TableHead className="sticky top-0 bg-background">Libellé</TableHead>
                        <TableHead className="sticky top-0 bg-background text-right">Montant</TableHead>
                        <TableHead className="sticky top-0 bg-background">Méthode</TableHead>
                        <TableHead className="sticky top-0 bg-background">Réf.</TableHead>
                        <TableHead className="sticky top-0 bg-background">Statut</TableHead>
                        <TableHead className="sticky top-0 bg-background">Justif.</TableHead>
                        <TableHead className="sticky top-0 bg-background text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payments.map((p) => (
                        <TableRow key={p.id} className={p.isHistorical ? 'bg-amber-50/50' : ''}>
                          <TableCell className="font-mono text-sm whitespace-nowrap">
                            {formatDate(p.paymentDate)}
                            {p.isHistorical && (
                              <span className="ml-1 text-xs text-amber-600" title="Paiement antérieur">
                                *
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={TAX_TYPE_COLORS[p.taxType] || TAX_TYPE_COLORS.OTHER}
                            >
                              {p.taxType}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono text-sm">{p.period}</TableCell>
                          <TableCell className="max-w-[200px] truncate" title={p.label}>
                            {p.label}
                          </TableCell>
                          <TableCell className="font-mono font-semibold text-right whitespace-nowrap">
                            {formatCurrency(p.amount)}
                          </TableCell>
                          <TableCell className="text-sm whitespace-nowrap">
                            {getPaymentMethodLabel(p.paymentMethod)}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground max-w-[80px] truncate" title={p.reference || ''}>
                            {p.reference || '-'}
                          </TableCell>
                          <TableCell>{getStatusBadge(p.status)}</TableCell>
                          <TableCell>
                            {p.receiptUrl ? (
                              <Paperclip className="h-4 w-4 text-blue-600" />
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {p.status !== 'cancelled' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setDeleteId(p.id)}
                                className="text-red-500 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {payments.some(p => p.isHistorical) && (
                <p className="text-xs text-muted-foreground mt-3">
                  * Paiement antérieur (enregistré après coup)
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: Rapprochement bancaire */}
        <TabsContent value="reconciliation" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Link2 className="h-5 w-5" />
                Rapprochement bancaire
              </CardTitle>
              <CardDescription>
                Associez vos transactions bancaires aux paiements d&apos;impôts enregistrés
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Alert className="mb-6">
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Cette section affiche les transactions bancaires potentiellement liées à des impôts.
                  Vous pouvez les associer manuellement à un paiement enregistré.
                </AlertDescription>
              </Alert>

              {/* Payments without linked transaction */}
              <div className="mb-8">
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <Banknote className="h-4 w-4" />
                  Paiements sans transaction bancaire associée
                </h4>
                {payments.filter(p => p.status === 'completed' && !p.transactionId).length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm border rounded-lg bg-muted/50">
                    <CheckCircle className="h-8 w-8 mx-auto mb-2 text-emerald-500" />
                    Tous les paiements sont rapprochés
                  </div>
                ) : (
                  <div className="rounded-md border max-h-[300px] overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Libellé</TableHead>
                          <TableHead className="text-right">Montant</TableHead>
                          <TableHead className="text-right">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {payments
                          .filter(p => p.status === 'completed' && !p.transactionId)
                          .map((p) => (
                            <TableRow key={p.id}>
                              <TableCell className="font-mono text-sm">{formatDate(p.paymentDate)}</TableCell>
                              <TableCell>
                                <Badge
                                  variant="outline"
                                  className={TAX_TYPE_COLORS[p.taxType] || TAX_TYPE_COLORS.OTHER}
                                >
                                  {p.taxType}
                                </Badge>
                              </TableCell>
                              <TableCell>{p.label}</TableCell>
                              <TableCell className="font-mono font-semibold text-right">
                                {formatCurrency(p.amount)}
                              </TableCell>
                              <TableCell className="text-right">
                                <Select
                                  value={linkingPaymentId === p.id ? (linkingTransactionId || '') : ''}
                                  onOpenChange={(open) => {
                                    if (!open) { setLinkingPaymentId(null); setLinkingTransactionId(null) }
                                    else setLinkingPaymentId(p.id)
                                  }}
                                >
                                  <SelectTrigger className="w-[200px]">
                                    <SelectValue placeholder="Lier une transaction..." />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {unmatchedBankTransactions
                                      .filter(t => Math.abs(Math.abs(t.amount) - p.amount) < 1) // Match amount within 1€
                                      .map((t) => (
                                        <SelectItem
                                          key={t.id}
                                          value={t.id}
                                          onSelect={() => handleLinkTransaction(p.id, t.id)}
                                        >
                                          {formatDate(t.date)} — {t.description.slice(0, 30)} — {formatCurrency(Math.abs(t.amount))}
                                        </SelectItem>
                                      ))
                                    }
                                    {unmatchedBankTransactions.filter(t => Math.abs(Math.abs(t.amount) - p.amount) < 1).length === 0 && (
                                      <div className="px-2 py-1.5 text-sm text-muted-foreground">
                                        Aucune transaction correspondante trouvée
                                      </div>
                                    )}
                                  </SelectContent>
                                </Select>
                              </TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>

              <Separator className="my-4" />

              {/* Unmatched bank transactions */}
              <div>
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  Transactions bancaires non rapprochées (impôts)
                </h4>
                {unmatchedBankTransactions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm border rounded-lg bg-muted/50">
                    <CheckCircle className="h-8 w-8 mx-auto mb-2 text-emerald-500" />
                    Aucune transaction fiscale non rapprochée
                  </div>
                ) : (
                  <div className="rounded-md border max-h-[300px] overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead className="text-right">Montant</TableHead>
                          <TableHead>Catégorie</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {unmatchedBankTransactions.slice(0, 20).map((t) => (
                          <TableRow key={t.id}>
                            <TableCell className="font-mono text-sm">{formatDate(t.date)}</TableCell>
                            <TableCell className="max-w-[250px] truncate" title={t.description}>
                              {t.description}
                            </TableCell>
                            <TableCell className="font-mono font-semibold text-right text-red-600">
                              {formatCurrency(t.amount)}
                            </TableCell>
                            <TableCell>
                              {t.category ? (
                                <Badge variant="outline" style={{ borderColor: t.category.color, color: t.category.color }}>
                                  {t.category.name}
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground">Non catégorisé</span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Delete Confirmation Dialog */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-2">Confirmer la suppression</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Voulez-vous vraiment supprimer ce paiement ? Cette action est irréversible.
              Si le paiement était lié à une déclaration, celle-ci sera remise en attente.
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setDeleteId(null)}>
                Annuler
              </Button>
              <Button
                variant="destructive"
                onClick={() => handleDelete(deleteId)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Supprimer
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
