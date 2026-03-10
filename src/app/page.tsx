'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { 
  AlertCircle, Calendar, Upload, FileText, Settings, TrendingUp, 
  TrendingDown, Euro, Clock, CheckCircle, Plus, Download,
  Bell, Building2, Loader2, Receipt, PiggyBank, CreditCard,
  ArrowUpRight, ArrowDownRight, Minus, Paperclip, X, Eye,
  BarChart3, LineChart, PieChart, Wallet, Percent
} from 'lucide-react'
import { LiasseFiscaleSection } from '@/components/liasse-fiscale-section'
import { DeclarationsSection } from '@/components/declarations-section'
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart'
import { Bar, BarChart, XAxis, YAxis, CartesianGrid, Line, LineChart as RechartsLineChart, ResponsiveContainer, Area, AreaChart } from 'recharts'

// Types
interface Transaction {
  id: string
  date: string
  amount: number
  description: string
  type: string
  labeled: boolean
  categoryId: string | null
  category: { id: string; name: string; color: string } | null
  receiptUrl: string | null
  receiptName: string | null
  notes: string | null
}

interface Category {
  id: string
  name: string
  type: string
  color: string
  icon: string | null
  taxDeductible: boolean
}

interface Deadline {
  id: string
  name: string
  type: string
  dueDate: string
  status: string
  amount: number | null
  notes: string | null
}

interface Settings {
  id: string
  companyName: string
  companyAddress: string
  companySIRET: string
  companySIREN: string
  companyTVA: string | null
  presidentName: string | null
  vatRegime: string
  email: string
}

interface Invoice {
  id: string
  invoiceNumber: string
  date: string
  dueDate: string
  clientName: string
  totalTTC: number
  status: string
}

interface InvoiceItem {
  description: string
  quantity: number
  unitPrice: number
}

// Main component
export default function TaxDashboard() {
  const [activeTab, setActiveTab] = useState('overview')
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [deadlines, setDeadlines] = useState<Deadline[]>([])
  const [settings, setSettings] = useState<Settings | null>(null)
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [showInvoiceForm, setShowInvoiceForm] = useState(false)
  const [invoiceItems, setInvoiceItems] = useState<InvoiceItem[]>([
    { description: '', quantity: 1, unitPrice: 0 }
  ])
  const [invoiceClient, setInvoiceClient] = useState({
    name: '',
    address: '',
    siret: '',
    tva: '',
  })
  const [invoiceTvaRate, setInvoiceTvaRate] = useState(20)
  const [exporting, setExporting] = useState(false)
  const [selectedBank, setSelectedBank] = useState('blank') // Blank.app bank
  const [autoCategorizing, setAutoCategorizing] = useState(false)
  const [uploadingReceiptFor, setUploadingReceiptFor] = useState<string | null>(null)
  const [showReceiptModal, setShowReceiptModal] = useState<{ id: string; url: string; name: string } | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 100
  const [selectedFiscalYear, setSelectedFiscalYear] = useState<number | null>(null)

  // Fetch initial data
  useEffect(() => {
    // Check URL params for tab
    const params = new URLSearchParams(window.location.search)
    const tab = params.get('tab')
    if (tab) {
      if (tab === 'transactions') setActiveTab('transactions')
      else if (tab === 'calendar') setActiveTab('deadlines')
      else if (tab === 'invoices') setActiveTab('invoices')
      else if (tab === 'settings') setActiveTab('settings')
    }
    
    fetchAllData()
  }, [])

  const fetchAllData = async () => {
    setLoading(true)
    try {
      const [transRes, catRes, deadRes, setRes, invRes] = await Promise.all([
        fetch('/api/transactions'),
        fetch('/api/categories'),
        fetch('/api/deadlines?upcoming=90'),
        fetch('/api/settings'),
        fetch('/api/invoices'),
      ])
      
      const [transData, catData, deadData, setData, invData] = await Promise.all([
        transRes.json(),
        catRes.json(),
        deadRes.json(),
        setRes.json(),
        invRes.json(),
      ])
      
      setTransactions(transData.transactions || [])
      setCategories(catData.categories || [])
      setDeadlines(deadData.deadlines || [])
      setSettings(setData.settings || null)
      setInvoices(invData.invoices || [])
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  // Get available fiscal years from transactions
  const getAvailableFiscalYears = () => {
    const years = new Set<number>()
    const currentYear = new Date().getFullYear()
    
    // Always show current and next fiscal years
    years.add(currentYear)
    years.add(currentYear + 1)
    years.add(currentYear - 1)
    
    // Also add years from transactions
    transactions.forEach(t => {
      const date = new Date(t.date)
      const year = date.getFullYear()
      const month = date.getMonth() + 1 // 1-12
      
      // If month is December, it's start of next fiscal year
      if (month === 12) {
        years.add(year + 1)
      } else {
        years.add(year)
      }
    })
    
    return Array.from(years).sort((a, b) => b - a)
  }

  // Filter transactions by fiscal year (Dec 1 to Nov 30)
  const filteredTransactions = selectedFiscalYear 
    ? transactions.filter(t => {
        const date = new Date(t.date)
        const year = date.getFullYear()
        const month = date.getMonth() + 1 // 1-12
        
        // Fiscal year YYYY runs from Dec 1 (YYYY-1) to Nov 30 (YYYY)
        // e.g., FY 2026 = Dec 1, 2025 to Nov 30, 2026
        if (month === 12) {
          // December belongs to FY (year + 1)
          return (year + 1) === selectedFiscalYear
        } else {
          // Jan-Nov belongs to FY year
          return year === selectedFiscalYear
        }
      })
    : transactions

  // Get fiscal year label
  const getFiscalYearLabel = (fy: number) => {
    return `01 déc. ${fy - 1} - 30 nov. ${fy}`
  }

  // Calculate totals based on filtered transactions
  const totalIncome = filteredTransactions.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0)
  const totalExpenses = Math.abs(filteredTransactions.filter(t => t.amount < 0).reduce((sum, t) => sum + t.amount, 0))
  const netProfit = totalIncome - totalExpenses
  const unlabeledCount = transactions.filter(t => !t.labeled).length
  const filteredUnlabeledCount = filteredTransactions.filter(t => !t.labeled).length

  // Calculate monthly data for charts
  const getMonthlyData = () => {
    const months: { [key: string]: { month: string; ca: number; charges: number; resultat: number; tresorerie: number } } = {}
    const monthNames = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc']
    
    filteredTransactions.forEach(t => {
      const date = new Date(t.date)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      const monthLabel = monthNames[date.getMonth()]
      
      if (!months[monthKey]) {
        months[monthKey] = { month: monthLabel, ca: 0, charges: 0, resultat: 0, tresorerie: 0 }
      }
      
      if (t.amount > 0) {
        months[monthKey].ca += t.amount
      } else {
        months[monthKey].charges += Math.abs(t.amount)
      }
      months[monthKey].resultat = months[monthKey].ca - months[monthKey].charges
    })
    
    // Calculate cumulative tresorerie
    let cumulative = 0
    const sortedMonths = Object.keys(months).sort()
    sortedMonths.forEach(key => {
      cumulative += months[key].resultat
      months[key].tresorerie = cumulative
    })
    
    return sortedMonths.map(key => months[key])
  }

  // Calculate charges breakdown by category
  const getChargesBreakdown = () => {
    const breakdown: { [key: string]: number } = {}
    
    filteredTransactions
      .filter(t => t.amount < 0 && t.category)
      .forEach(t => {
        const catName = t.category!.name
        breakdown[catName] = (breakdown[catName] || 0) + Math.abs(t.amount)
      })
    
    return Object.entries(breakdown)
      .map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8) // Top 8 categories
  }

  const monthlyData = getMonthlyData()
  const chargesBreakdown = getChargesBreakdown()

  // Chart configs
  const chartConfig = {
    ca: { label: "Chiffre d'affaires", color: "#22C55E" },
    charges: { label: "Charges", color: "#EF4444" },
    resultat: { label: "Résultat", color: "#3B82F6" },
    tresorerie: { label: "Trésorerie", color: "#8B5CF6" },
  } satisfies ChartConfig

  // Pagination
  const totalPages = Math.ceil(transactions.length / itemsPerPage)
  const paginatedTransactions = transactions.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  // Handle CSV upload
  const handleUpload = async () => {
    if (!selectedFile) return
    
    setUploading(true)
    const formData = new FormData()
    formData.append('file', selectedFile)
    formData.append('bankName', selectedBank)
    
    try {
      const res = await fetch('/api/transactions/upload', {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()
      
      if (data.success) {
        const message = `Importé ${data.imported} transactions. ${data.skipped} ignorées.`
        if (data.parseErrors && data.parseErrors.length > 0) {
          console.log('Parse errors:', data.parseErrors)
        }
        alert(message)
        fetchAllData()
      } else {
        // Show detailed error message
        let errorMsg = data.error || 'Erreur inconnue'
        if (data.details) {
          errorMsg += `\n\nDétails: ${data.details}`
        }
        if (data.parseErrors && data.parseErrors.length > 0) {
          errorMsg += `\n\nErreurs de parsing:\n${data.parseErrors.slice(0, 5).join('\n')}`
        }
        alert(errorMsg)
        console.error('Upload failed:', data)
      }
    } catch (error) {
      console.error('Upload error:', error)
      alert('Erreur de connexion au serveur')
    } finally {
      setUploading(false)
      setSelectedFile(null)
    }
  }

  // Label transaction
  const labelTransaction = async (id: string, categoryId: string, type: string) => {
    try {
      await fetch('/api/transactions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, categoryId, type }),
      })
      fetchAllData()
    } catch (error) {
      console.error('Error labeling transaction:', error)
    }
  }

  // Auto-categorize transactions
  const autoCategorize = async () => {
    setAutoCategorizing(true)
    try {
      const res = await fetch('/api/transactions/auto-categorize', {
        method: 'POST',
      })
      const data = await res.json()
      if (data.success) {
        alert(`${data.categorized} transactions catégorisées automatiquement sur ${data.total}`)
        fetchAllData()
      } else {
        alert('Erreur: ' + (data.error || 'Erreur inconnue'))
      }
    } catch (error) {
      console.error('Auto-categorize error:', error)
      alert('Erreur de connexion')
    } finally {
      setAutoCategorizing(false)
    }
  }

  // Upload receipt for transaction
  const uploadReceipt = async (transactionId: string, file: File) => {
    setUploadingReceiptFor(transactionId)
    try {
      const formData = new FormData()
      formData.append('transactionId', transactionId)
      formData.append('file', file)
      
      const res = await fetch('/api/transactions/receipt', {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()
      
      if (data.success) {
        fetchAllData()
      } else {
        alert('Erreur: ' + (data.error || 'Erreur inconnue'))
      }
    } catch (error) {
      console.error('Receipt upload error:', error)
      alert('Erreur lors du téléchargement')
    } finally {
      setUploadingReceiptFor(null)
    }
  }

  // Delete receipt
  const deleteReceipt = async (transactionId: string) => {
    if (!confirm('Supprimer ce justificatif ?')) return
    
    try {
      const res = await fetch(`/api/transactions/receipt?transactionId=${transactionId}`, {
        method: 'DELETE',
      })
      const data = await res.json()
      
      if (data.success) {
        fetchAllData()
        setShowReceiptModal(null)
      } else {
        alert('Erreur: ' + (data.error || 'Erreur inconnue'))
      }
    } catch (error) {
      console.error('Receipt delete error:', error)
    }
  }

  // Update settings
  const updateSettings = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    
    try {
      await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: formData.get('companyName'),
          companyAddress: formData.get('companyAddress'),
          companySIRET: formData.get('companySIRET'),
          companySIREN: formData.get('companySIREN'),
          companyTVA: formData.get('companyTVA'),
          presidentName: formData.get('presidentName'),
          vatRegime: formData.get('vatRegime'),
          email: formData.get('email'),
        }),
      })
      fetchAllData()
      alert('Paramètres enregistrés!')
    } catch (error) {
      console.error('Error updating settings:', error)
    }
  }

  // Get days until deadline
  const getDaysUntil = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    now.setHours(0, 0, 0, 0)
    date.setHours(0, 0, 0, 0)
    return Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  }

  // Format date
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  }

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount)
  }

  // Calculate IS
  const calculateIS = (profit: number) => {
    if (profit <= 0) return 0
    if (profit <= 42500) return profit * 0.15
    return (42500 * 0.15) + ((profit - 42500) * 0.25)
  }

  // Add invoice item
  const addInvoiceItem = () => {
    setInvoiceItems([...invoiceItems, { description: '', quantity: 1, unitPrice: 0 }])
  }

  // Update invoice item
  const updateInvoiceItem = (index: number, field: keyof InvoiceItem, value: string | number) => {
    const newItems = [...invoiceItems]
    newItems[index] = { ...newItems[index], [field]: value }
    setInvoiceItems(newItems)
  }

  // Remove invoice item
  const removeInvoiceItem = (index: number) => {
    if (invoiceItems.length > 1) {
      setInvoiceItems(invoiceItems.filter((_, i) => i !== index))
    }
  }

  // Calculate invoice totals
  const calculateInvoiceTotals = () => {
    const subtotal = invoiceItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0)
    const tva = subtotal * (invoiceTvaRate / 100)
    const total = subtotal + tva
    return { subtotal, tva, total }
  }

  // Create invoice
  const createInvoice = async () => {
    if (!invoiceClient.name) {
      alert('Veuillez entrer le nom du client')
      return
    }
    if (invoiceItems.some(item => !item.description || item.unitPrice <= 0)) {
      alert('Veuillez remplir tous les articles')
      return
    }

    try {
      const res = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientName: invoiceClient.name,
          clientAddress: invoiceClient.address,
          clientSIRET: invoiceClient.siret,
          clientTVA: invoiceClient.tva,
          items: invoiceItems,
          tvaRate: invoiceTvaRate,
        }),
      })
      const data = await res.json()
      if (data.invoice) {
        alert(`Facture ${data.invoice.invoiceNumber} créée!`)
        setShowInvoiceForm(false)
        setInvoiceItems([{ description: '', quantity: 1, unitPrice: 0 }])
        setInvoiceClient({ name: '', address: '', siret: '', tva: '' })
        fetchAllData()
      }
    } catch (error) {
      console.error('Error creating invoice:', error)
    }
  }

  // Download invoice PDF
  const downloadInvoicePDF = async (id: string) => {
    window.open(`/api/invoices/${id}/pdf`, '_blank')
  }

  // Mark invoice as paid
  const markInvoicePaid = async (id: string) => {
    try {
      await fetch('/api/invoices', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: 'paid', paidAt: new Date().toISOString() }),
      })
      fetchAllData()
    } catch (error) {
      console.error('Error updating invoice:', error)
    }
  }

  // Export to Excel
  const exportToExcel = async () => {
    setExporting(true)
    try {
      const year = new Date().getFullYear()
      const res = await fetch(`/api/export?year=${year}`)
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `export_${year}.xlsx`
      a.click()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error exporting:', error)
    } finally {
      setExporting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="p-6">
      {/* Alert for unlabeled transactions */}
      {unlabeledCount > 0 && (
        <Alert className="mb-6 border-amber-200 bg-amber-50">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800">
            <strong>{unlabeledCount} transaction(s)</strong> à catégoriser. 
            <Button 
              variant="link" 
              className="p-0 ml-2 h-auto text-amber-800 underline"
              onClick={() => setActiveTab('transactions')}
            >
              Catégoriser maintenant →
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="deadlines">Échéances</TabsTrigger>
          <TabsTrigger value="invoices">Factures</TabsTrigger>
          <TabsTrigger value="liasse">Liasse Fiscale</TabsTrigger>
          <TabsTrigger value="declarations">Déclarations</TabsTrigger>
          <TabsTrigger value="settings">Paramètres</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Fiscal Year Header */}
          <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
            <CardContent className="py-4">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-blue-900">Aperçu</h2>
                  <p className="text-sm text-blue-700">Suivez vos chiffres clés et votre activité en temps réel.</p>
                </div>
                <div className="flex items-center gap-3">
                  <Label className="text-sm font-medium text-blue-800">Exercice:</Label>
                  <Select 
                    value={selectedFiscalYear?.toString() || 'all'} 
                    onValueChange={(v) => setSelectedFiscalYear(v === 'all' ? null : parseInt(v))}
                  >
                    <SelectTrigger className="w-56 bg-white">
                      <SelectValue placeholder="Tous les exercices" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous les exercices</SelectItem>
                      {getAvailableFiscalYears().map(fy => (
                        <SelectItem key={fy} value={fy.toString()}>
                          {getFiscalYearLabel(fy)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* KPIs Financiers */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="border-l-4 border-l-emerald-500">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Chiffre d'affaires</CardTitle>
                <TrendingUp className="h-4 w-4 text-emerald-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-emerald-600">{formatCurrency(totalIncome)}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {filteredTransactions.filter(t => t.amount > 0).length} factures encaissées
                </p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-red-500">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Charges d'exploitation</CardTitle>
                <TrendingDown className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{formatCurrency(totalExpenses)}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {filteredTransactions.filter(t => t.amount < 0).length} dépenses
                </p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-blue-500">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Résultat d'exploitation</CardTitle>
                <Euro className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${netProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {formatCurrency(netProfit)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Marge: {totalIncome > 0 ? ((netProfit / totalIncome) * 100).toFixed(1) : 0}%
                </p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-purple-500">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Solde de trésorerie</CardTitle>
                <Wallet className="h-4 w-4 text-purple-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-600">
                  {formatCurrency(monthlyData.length > 0 ? monthlyData[monthlyData.length - 1].tresorerie : 0)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Cumul exercice
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Charts Row 1: CA & Charges par mois */}
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-blue-500" />
                  Chiffre d'affaires et Charges par mois
                </CardTitle>
                <CardDescription>Évolution mensuelle de votre activité</CardDescription>
              </CardHeader>
              <CardContent>
                {monthlyData.length > 0 ? (
                  <ChartContainer config={chartConfig} className="h-[250px] w-full">
                    <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                      <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}€`} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="ca" name="ca" fill="#22C55E" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="charges" name="charges" fill="#EF4444" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ChartContainer>
                ) : (
                  <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                    Aucune donnée pour cet exercice
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <LineChart className="h-5 w-5 text-purple-500" />
                  Flux de trésorerie
                </CardTitle>
                <CardDescription>Évolution cumulée de votre trésorerie</CardDescription>
              </CardHeader>
              <CardContent>
                {monthlyData.length > 0 ? (
                  <ChartContainer config={chartConfig} className="h-[250px] w-full">
                    <AreaChart data={monthlyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                      <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}€`} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Area type="monotone" dataKey="tresorerie" name="tresorerie" stroke="#8B5CF6" fill="#8B5CF6" fillOpacity={0.2} strokeWidth={2} />
                    </AreaChart>
                  </ChartContainer>
                ) : (
                  <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                    Aucune donnée pour cet exercice
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Répartition des charges - BAR CHART */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-red-500" />
                Répartition des charges
              </CardTitle>
              <CardDescription>Vos principales catégories de dépenses</CardDescription>
            </CardHeader>
            <CardContent>
              {chargesBreakdown.length > 0 ? (
                <div className="space-y-3">
                  {chargesBreakdown.map((item, index) => {
                    const percentage = totalExpenses > 0 ? (item.value / totalExpenses) * 100 : 0
                    const colors = ['#EF4444', '#F97316', '#EAB308', '#22C55E', '#06B6D4', '#3B82F6', '#8B5CF6', '#EC4899']
                    return (
                      <div key={item.name} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium">{item.name}</span>
                          <span className="text-muted-foreground">{formatCurrency(item.value)} ({percentage.toFixed(1)}%)</span>
                        </div>
                        <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                          <div 
                            className="h-full rounded-full transition-all duration-500"
                            style={{ 
                              width: `${percentage}%`, 
                              backgroundColor: colors[index % colors.length] 
                            }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                  Aucune charge catégorisée
                </div>
              )}
            </CardContent>
          </Card>

          {/* Taxes & Impôts Section */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* TVA Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Percent className="h-5 w-5 text-amber-500" />
                  Suivi de votre TVA
                </CardTitle>
                <CardDescription>
                  {settings?.vatRegime === 'franchise' 
                    ? 'Vous êtes en franchise en base de TVA' 
                    : 'Régime de TVA simplifié - Déclaration CA12 annuelle'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {settings?.vatRegime === 'franchise' ? (
                  <div className="space-y-4">
                    <Alert className="border-emerald-200 bg-emerald-50">
                      <CheckCircle className="h-4 w-4 text-emerald-600" />
                      <AlertDescription className="text-emerald-800">
                        <strong>Franchise en base</strong> - Pas de TVA à déclarer
                      </AlertDescription>
                    </Alert>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Seuil prestations 2025</span>
                        <span className="font-medium">37 500 €</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Votre CA actuel</span>
                        <span className="font-medium text-emerald-600">{formatCurrency(totalIncome)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Marge restante</span>
                        <span className="font-medium text-blue-600">{formatCurrency(Math.max(0, 37500 - totalIncome))}</span>
                      </div>
                    </div>
                    <Progress value={(totalIncome / 37500) * 100} className="h-2" />
                  </div>
                ) : (
                  <div className="space-y-4">
                    <Alert className="border-amber-200 bg-amber-50">
                      <AlertCircle className="h-4 w-4 text-amber-600" />
                      <AlertDescription className="text-amber-800">
                        <strong>Régime simplifié</strong> - TVA à déclarer annuellement via CA12
                      </AlertDescription>
                    </Alert>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-3 bg-red-50 rounded-lg">
                        <p className="text-xs text-muted-foreground">TVA collectée (20%)</p>
                        <p className="text-lg font-bold text-red-600">{formatCurrency(totalIncome * 0.20)}</p>
                        <p className="text-xs text-muted-foreground mt-1">Sur {formatCurrency(totalIncome)} HT</p>
                      </div>
                      <div className="p-3 bg-green-50 rounded-lg">
                        <p className="text-xs text-muted-foreground">TVA déductible</p>
                        <p className="text-lg font-bold text-green-600">{formatCurrency(totalExpenses * 0.20)}</p>
                        <p className="text-xs text-muted-foreground mt-1">Sur {formatCurrency(totalExpenses)} HT</p>
                      </div>
                    </div>
                    
                    <Separator />
                    
                    <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                      <span className="text-sm font-medium">TVA nette à payer</span>
                      <span className="text-lg font-bold text-amber-600">
                        {formatCurrency(Math.max(0, (totalIncome * 0.20) - (totalExpenses * 0.20)))}
                      </span>
                    </div>
                    
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Échéance CA12</p>
                      <div className="flex justify-between items-center p-2 bg-amber-50 border border-amber-200 rounded">
                        <span className="text-sm">Déclaration CA12</span>
                        <Badge variant="outline" className="bg-amber-100">
                          {(() => {
                            const now = new Date()
                            const currentYear = now.getFullYear()
                            const deadline = new Date(currentYear + 1, 4, 3) // May 3rd of next year
                            const days = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
                            return days > 0 ? `${days} jours` : 'À rendre'
                          })()}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        La déclaration CA12 couvre l'année civile précédente et doit être déposée avant le 3 mai.
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* IS Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PiggyBank className="h-5 w-5 text-blue-500" />
                  Suivi de votre Impôt sur les Sociétés (IS)
                </CardTitle>
                <CardDescription>L'IS est calculé à partir de vos bénéfices</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <p className="text-xs text-muted-foreground">Bénéfice fiscal</p>
                      <p className={`text-lg font-bold ${netProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {formatCurrency(netProfit)}
                      </p>
                    </div>
                    <div className="p-3 bg-purple-50 rounded-lg">
                      <p className="text-xs text-muted-foreground">IS estimé</p>
                      <p className="text-lg font-bold text-purple-600">{formatCurrency(calculateIS(netProfit))}</p>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Prochains paiements d'IS</p>
                    <div className="space-y-2 text-sm">
                      {netProfit > 0 && (
                        <>
                          <div className="flex justify-between items-center p-2 bg-muted rounded">
                            <span>Acompte Q1 (15 mars)</span>
                            <span className="font-mono">{formatCurrency(calculateIS(netProfit) / 4)}</span>
                          </div>
                          <div className="flex justify-between items-center p-2 bg-muted rounded">
                            <span>Acompte Q2 (15 juin)</span>
                            <span className="font-mono">{formatCurrency(calculateIS(netProfit) / 4)}</span>
                          </div>
                          <div className="flex justify-between items-center p-2 bg-muted rounded">
                            <span>Acompte Q3 (15 sept.)</span>
                            <span className="font-mono">{formatCurrency(calculateIS(netProfit) / 4)}</span>
                          </div>
                          <div className="flex justify-between items-center p-2 bg-muted rounded">
                            <span>Acompte Q4 (15 déc.)</span>
                            <span className="font-mono">{formatCurrency(calculateIS(netProfit) / 4)}</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="p-3 bg-blue-50 rounded-lg text-sm">
                    <p className="font-medium text-blue-800">Barème IS 2025</p>
                    <p className="text-blue-700 text-xs mt-1">
                      15% jusqu'à 42 500 € de bénéfice, puis 25% au-delà
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Prochaines échéances & Actions rapides */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Upcoming Deadlines */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Prochaines Échéances
                </CardTitle>
                <CardDescription>Vos déclarations fiscales à venir</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {deadlines.slice(0, 5).map((deadline) => {
                    const days = getDaysUntil(deadline.dueDate)
                    const isUrgent = days <= 7
                    const isWarning = days <= 30 && days > 7
                    
                    return (
                      <div key={deadline.id} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`h-2 w-2 rounded-full ${
                            days < 0 ? 'bg-red-500' : 
                            isUrgent ? 'bg-red-500' : 
                            isWarning ? 'bg-amber-500' : 'bg-emerald-500'
                          }`} />
                          <div>
                            <p className="text-sm font-medium leading-none">{deadline.name}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {formatDate(deadline.dueDate)}
                            </p>
                          </div>
                        </div>
                        <Badge variant={days < 0 ? 'destructive' : isUrgent ? 'destructive' : 'secondary'}>
                          {days < 0 ? `${Math.abs(days)}j retard` : `${days}j`}
                        </Badge>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
              <CardFooter>
                <Button variant="ghost" className="w-full" onClick={() => setActiveTab('deadlines')}>
                  Voir toutes les échéances
                </Button>
              </CardFooter>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Actions Rapides</CardTitle>
                <CardDescription>Accès rapide aux fonctions principales</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4">
                <Button variant="outline" className="justify-start h-auto py-4" onClick={() => setActiveTab('transactions')}>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Upload className="h-4 w-4 text-blue-600" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium">Importer des transactions</p>
                      <p className="text-xs text-muted-foreground">Télécharger un fichier CSV bancaire</p>
                    </div>
                  </div>
                </Button>
                
                <Button variant="outline" className="justify-start h-auto py-4" onClick={() => setActiveTab('invoices')}>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-100 rounded-lg">
                      <Receipt className="h-4 w-4 text-emerald-600" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium">Créer une facture</p>
                      <p className="text-xs text-muted-foreground">Générer une nouvelle facture client</p>
                    </div>
                  </div>
                </Button>

                <Button variant="outline" className="justify-start h-auto py-4" onClick={() => setActiveTab('liasse')}>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <FileText className="h-4 w-4 text-purple-600" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium">Générer la Liasse Fiscale</p>
                      <p className="text-xs text-muted-foreground">Préparer votre déclaration annuelle</p>
                    </div>
                  </div>
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Transactions Tab */}
        <TabsContent value="transactions" className="space-y-6">
          {/* Upload Section */}
          <Card>
            <CardHeader>
              <CardTitle>Importer des transactions</CardTitle>
              <CardDescription>Téléchargez un fichier CSV de votre banque</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <Label className="text-sm text-muted-foreground mb-1 block">Votre banque</Label>
                  <select 
                    className="w-full p-2 border rounded-md"
                    value={selectedBank}
                    onChange={(e) => setSelectedBank(e.target.value)}
                  >
                    <option value="blank">Blank.app</option>
                    <option value="bnpparibas">BNP Paribas</option>
                    <option value="creditagricole">Crédit Agricole</option>
                    <option value="lcl">LCL</option>
                    <option value="societegenerale">Société Générale</option>
                    <option value="revolut">Revolut</option>
                    <option value="default">Autre (format automatique)</option>
                  </select>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <Input
                  type="file"
                  accept=".csv"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  className="flex-1"
                />
                <Button onClick={handleUpload} disabled={!selectedFile || uploading}>
                  {uploading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Upload className="h-4 w-4 mr-2" />
                  )}
                  Importer
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Transactions List */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Transactions</CardTitle>
                  <CardDescription>
                    {transactions.length} transactions • {unlabeledCount} à catégoriser
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  {unlabeledCount > 0 && (
                    <Button variant="default" size="sm" onClick={autoCategorize} disabled={autoCategorizing}>
                      {autoCategorizing ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <CheckCircle className="h-4 w-4 mr-2" />
                      )}
                      Auto-catégoriser
                    </Button>
                  )}
                  <Button variant="outline" size="sm" onClick={exportToExcel} disabled={exporting}>
                    {exporting ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Download className="h-4 w-4 mr-2" />
                    )}
                    Exporter Excel
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {transactions.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Aucune transaction</p>
                  <p className="text-sm mt-2">Importez un fichier CSV pour commencer</p>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-right">Montant</TableHead>
                        <TableHead>Catégorie</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Justificatif</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedTransactions.map((t) => (
                        <TableRow key={t.id} className={!t.labeled ? 'bg-amber-50/50' : ''}>
                          <TableCell className="font-mono text-sm">{formatDate(t.date)}</TableCell>
                          <TableCell className="max-w-xs truncate">{t.description}</TableCell>
                          <TableCell className={`text-right font-mono ${t.amount >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                            {t.amount >= 0 ? '+' : ''}{formatCurrency(t.amount)}
                          </TableCell>
                          <TableCell>
                            <Select
                              value={t.categoryId || ''}
                              onValueChange={(value) => labelTransaction(t.id, value, t.type)}
                            >
                              <SelectTrigger className="w-40">
                                <SelectValue placeholder="Catégorie..." />
                              </SelectTrigger>
                              <SelectContent>
                                {categories
                                  .filter(c => t.amount >= 0 ? c.type === 'income' : c.type === 'expense')
                                  .map((c) => (
                                    <SelectItem key={c.id} value={c.id}>
                                      <div className="flex items-center gap-2">
                                        <div className="h-2 w-2 rounded-full" style={{ backgroundColor: c.color }} />
                                        {c.name}
                                      </div>
                                    </SelectItem>
                                  ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Select
                              value={t.type}
                              onValueChange={(value) => labelTransaction(t.id, t.categoryId || '', value)}
                            >
                              <SelectTrigger className="w-28">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="income">Revenu</SelectItem>
                                <SelectItem value="expense">Dépense</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {t.receiptUrl ? (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setShowReceiptModal({ id: t.id, url: t.receiptUrl!, name: t.receiptName || 'Justificatif' })}
                                    title="Voir le justificatif"
                                  >
                                    <Eye className="h-4 w-4 text-blue-600" />
                                  </Button>
                                  <span className="text-xs text-green-600">✓</span>
                                </>
                              ) : (
                                <label className="cursor-pointer">
                                  <input
                                    type="file"
                                    accept="image/*,.pdf"
                                    className="hidden"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0]
                                      if (file) uploadReceipt(t.id, file)
                                    }}
                                    disabled={uploadingReceiptFor === t.id}
                                  />
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    disabled={uploadingReceiptFor === t.id}
                                    title="Ajouter un justificatif"
                                    onClick={(e) => e.preventDefault()}
                                    asChild
                                  >
                                    <span>
                                      {uploadingReceiptFor === t.id ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                      ) : (
                                        <Paperclip className="h-4 w-4 text-gray-400" />
                                      )}
                                    </span>
                                  </Button>
                                </label>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  
                  {/* Pagination Controls */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between mt-4 pt-4 border-t">
                      <div className="text-sm text-muted-foreground">
                        Affichage {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, transactions.length)} sur {transactions.length} transactions
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                          disabled={currentPage === 1}
                        >
                          Précédent
                        </Button>
                        <span className="flex items-center px-3 text-sm">
                          Page {currentPage} / {totalPages}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                          disabled={currentPage === totalPages}
                        >
                          Suivant
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Deadlines Tab */}
        <TabsContent value="deadlines" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Calendrier Fiscal {new Date().getFullYear()}</CardTitle>
              <CardDescription>Toutes vos échéances fiscales pour votre SASU</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {['IS', 'TVA', 'CFE', 'LIASSE', 'DAS2'].map((type) => {
                  const typeDeadlines = deadlines.filter(d => d.type === type)
                  if (typeDeadlines.length === 0) return null
                  
                  const typeNames: Record<string, string> = {
                    IS: 'Impôt sur les Sociétés',
                    TVA: 'TVA',
                    CFE: 'Cotisation Foncière des Entreprises',
                    LIASSE: 'Liasse Fiscale',
                    DAS2: 'Déclaration DAS2',
                  }
                  
                  return (
                    <div key={type} className="space-y-3">
                      <h3 className="font-semibold text-lg flex items-center gap-2">
                        <Badge variant="outline">{type}</Badge>
                        {typeNames[type]}
                      </h3>
                      <div className="rounded-md border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Échéance</TableHead>
                              <TableHead>Date</TableHead>
                              <TableHead>Statut</TableHead>
                              <TableHead>Jours restants</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {typeDeadlines.map((d) => {
                              const days = getDaysUntil(d.dueDate)
                              return (
                                <TableRow key={d.id}>
                                  <TableCell className="font-medium">{d.name}</TableCell>
                                  <TableCell className="font-mono">{formatDate(d.dueDate)}</TableCell>
                                  <TableCell>
                                    <Badge variant={d.status === 'done' ? 'default' : 'secondary'}>
                                      {d.status === 'done' ? (
                                        <><CheckCircle className="h-3 w-3 mr-1" /> Effectué</>
                                      ) : (
                                        <><Clock className="h-3 w-3 mr-1" /> En attente</>
                                      )}
                                    </Badge>
                                  </TableCell>
                                  <TableCell>
                                    <span className={days <= 7 ? 'text-red-600 font-medium' : days <= 30 ? 'text-amber-600' : ''}>
                                      {days < 0 ? `${Math.abs(days)} jours de retard` : days === 0 ? "Aujourd'hui" : `${days} jours`}
                                    </span>
                                  </TableCell>
                                </TableRow>
                              )
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Invoices Tab */}
        <TabsContent value="invoices" className="space-y-6">
          {/* Invoice Form */}
          {showInvoiceForm && (
            <Card>
              <CardHeader>
                <CardTitle>Nouvelle Facture</CardTitle>
                <CardDescription>Créez une facture pour votre client</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Client Info */}
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Nom du client *</Label>
                    <Input
                      value={invoiceClient.name}
                      onChange={(e) => setInvoiceClient({ ...invoiceClient, name: e.target.value })}
                      placeholder="Nom de l'entreprise"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>SIRET client</Label>
                    <Input
                      value={invoiceClient.siret}
                      onChange={(e) => setInvoiceClient({ ...invoiceClient, siret: e.target.value })}
                      placeholder="123 456 789 00012"
                    />
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Adresse</Label>
                    <Input
                      value={invoiceClient.address}
                      onChange={(e) => setInvoiceClient({ ...invoiceClient, address: e.target.value })}
                      placeholder="Adresse du client"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>N° TVA client</Label>
                    <Input
                      value={invoiceClient.tva}
                      onChange={(e) => setInvoiceClient({ ...invoiceClient, tva: e.target.value })}
                      placeholder="FR XX XXXXXXXXX"
                    />
                  </div>
                </div>

                {/* Invoice Items */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>Articles</Label>
                    <Button variant="outline" size="sm" onClick={addInvoiceItem}>
                      <Plus className="h-4 w-4 mr-1" /> Ajouter
                    </Button>
                  </div>
                  {invoiceItems.map((item, index) => (
                    <div key={index} className="grid gap-2 md:grid-cols-4 items-end">
                      <div className="md:col-span-2">
                        <Label className="text-xs text-muted-foreground">Description</Label>
                        <Input
                          value={item.description}
                          onChange={(e) => updateInvoiceItem(index, 'description', e.target.value)}
                          placeholder="Description du service"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Quantité</Label>
                        <Input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateInvoiceItem(index, 'quantity', parseInt(e.target.value) || 0)}
                          min="1"
                        />
                      </div>
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <Label className="text-xs text-muted-foreground">Prix unitaire €</Label>
                          <Input
                            type="number"
                            value={item.unitPrice}
                            onChange={(e) => updateInvoiceItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                            min="0"
                            step="0.01"
                          />
                        </div>
                        {invoiceItems.length > 1 && (
                          <Button variant="ghost" size="icon" onClick={() => removeInvoiceItem(index)} className="mt-6">
                            <span className="text-red-500">×</span>
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* TVA Rate */}
                <div className="flex items-center gap-4">
                  <Label>Taux TVA</Label>
                  <Select value={invoiceTvaRate.toString()} onValueChange={(v) => setInvoiceTvaRate(parseInt(v))}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">0%</SelectItem>
                      <SelectItem value="5.5">5.5%</SelectItem>
                      <SelectItem value="10">10%</SelectItem>
                      <SelectItem value="20">20%</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Totals */}
                <div className="border-t pt-4 space-y-2">
                  <div className="flex justify-between">
                    <span>Sous-total HT</span>
                    <span className="font-mono">{formatCurrency(calculateInvoiceTotals().subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>TVA ({invoiceTvaRate}%)</span>
                    <span className="font-mono">{formatCurrency(calculateInvoiceTotals().tva)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg">
                    <span>Total TTC</span>
                    <span className="font-mono">{formatCurrency(calculateInvoiceTotals().total)}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-4">
                  <Button onClick={createInvoice} className="flex-1">
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Créer la facture
                  </Button>
                  <Button variant="outline" onClick={() => setShowInvoiceForm(false)}>
                    Annuler
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Invoice List */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Factures</CardTitle>
                  <CardDescription>{invoices.length} facture(s)</CardDescription>
                </div>
                <Button onClick={() => setShowInvoiceForm(!showInvoiceForm)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nouvelle facture
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {invoices.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Aucune facture pour le moment</p>
                  <p className="text-sm mt-2">Créez votre première facture</p>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>N° Facture</TableHead>
                        <TableHead>Client</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Montant TTC</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead className="text-center">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invoices.map((invoice) => (
                        <TableRow key={invoice.id}>
                          <TableCell className="font-mono font-medium">{invoice.invoiceNumber}</TableCell>
                          <TableCell>{invoice.clientName}</TableCell>
                          <TableCell>{formatDate(invoice.date)}</TableCell>
                          <TableCell className="text-right font-mono">{formatCurrency(invoice.totalTTC)}</TableCell>
                          <TableCell>
                            <Badge variant={invoice.status === 'paid' ? 'default' : invoice.status === 'sent' ? 'secondary' : 'outline'}>
                              {invoice.status === 'paid' ? 'Payée' : invoice.status === 'sent' ? 'Envoyée' : 'Brouillon'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-center gap-2">
                              <Button variant="ghost" size="sm" onClick={() => downloadInvoicePDF(invoice.id)}>
                                <Download className="h-4 w-4" />
                              </Button>
                              {invoice.status !== 'paid' && (
                                <Button variant="ghost" size="sm" onClick={() => markInvoicePaid(invoice.id)}>
                                  <CheckCircle className="h-4 w-4 text-emerald-600" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Liasse Fiscale Tab */}
        <TabsContent value="liasse" className="space-y-6">
          <LiasseFiscaleSection settings={settings} transactions={transactions} />
        </TabsContent>

        {/* Declarations Tab - TVA & IS */}
        <TabsContent value="declarations" className="space-y-6">
          <DeclarationsSection settings={settings} />
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Informations de l'entreprise</CardTitle>
              <CardDescription>Ces informations apparaîtront sur vos factures et déclarations</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={updateSettings} className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="companyName">Nom de l'entreprise</Label>
                    <Input 
                      id="companyName" 
                      name="companyName"
                      defaultValue={settings?.companyName || ''} 
                      placeholder="Ma SASU"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="companySIREN">SIREN</Label>
                    <Input 
                      id="companySIREN" 
                      name="companySIREN"
                      defaultValue={settings?.companySIREN || ''} 
                      placeholder="123 456 789"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="companySIRET">SIRET</Label>
                    <Input 
                      id="companySIRET" 
                      name="companySIRET"
                      defaultValue={settings?.companySIRET || ''} 
                      placeholder="123 456 789 00012"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="companyTVA">Numéro TVA (optionnel)</Label>
                    <Input 
                      id="companyTVA" 
                      name="companyTVA"
                      defaultValue={settings?.companyTVA || ''} 
                      placeholder="FR XX XXXXXXXXX"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="presidentName">Nom du président</Label>
                    <Input 
                      id="presidentName" 
                      name="presidentName"
                      defaultValue={settings?.presidentName || ''} 
                      placeholder="Jean Dupont"
                    />
                    <p className="text-xs text-muted-foreground">Requis pour la liasse fiscale</p>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="companyAddress">Adresse</Label>
                  <Textarea 
                    id="companyAddress" 
                    name="companyAddress"
                    defaultValue={settings?.companyAddress || ''} 
                    placeholder="123 Rue Example&#10;75001 Paris"
                    rows={3}
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="vatRegime">Régime TVA</Label>
                    <Select name="vatRegime" defaultValue={settings?.vatRegime || 'franchise'}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="franchise">Franchise en base</SelectItem>
                        <SelectItem value="reel_simplifie">Réel simplifié</SelectItem>
                        <SelectItem value="reel_normal">Réel normal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email pour les rappels</Label>
                    <Input 
                      id="email" 
                      name="email"
                      type="email"
                      defaultValue={settings?.email || ''} 
                      placeholder="contact@masasu.fr"
                    />
                  </div>
                </div>

                <Button type="submit">
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Enregistrer les paramètres
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Category Management */}
          <Card>
            <CardHeader>
              <CardTitle>Gestion des catégories</CardTitle>
              <CardDescription>Supprimez les catégories inutilisées</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {categories.filter(c => c.type === 'expense').map((cat) => {
                  const usageCount = transactions.filter(t => t.categoryId === cat.id).length
                  return (
                    <div key={cat.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="h-3 w-3 rounded-full" style={{ backgroundColor: cat.color }} />
                        <div>
                          <p className="font-medium">{cat.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {usageCount} transaction{usageCount !== 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>
                      {usageCount === 0 && !cat.taxDeductible && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={async () => {
                            if (!confirm(`Supprimer la catégorie "${cat.name}" ?`)) return
                            try {
                              const res = await fetch('/api/categories/delete-unused', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ name: cat.name })
                              })
                              const data = await res.json()
                              if (data.success) {
                                alert(`Catégorie "${cat.name}" supprimée`)
                                fetchAllData()
                              } else {
                                alert(data.error || 'Erreur')
                              }
                            } catch (error) {
                              console.error('Error:', error)
                            }
                          }}
                        >
                          <X className="h-4 w-4 mr-1" />
                          Supprimer
                        </Button>
                      )}
                    </div>
                  )
                })}
              </div>
              <p className="text-xs text-muted-foreground mt-4">
                💡 Seules les catégories inutilisées et non déductibles peuvent être supprimées
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Receipt View Modal */}
      {showReceiptModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-semibold">{showReceiptModal.name}</h3>
              <div className="flex items-center gap-2">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => deleteReceipt(showReceiptModal.id)}
                >
                  <X className="h-4 w-4 mr-1" />
                  Supprimer
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setShowReceiptModal(null)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="p-4 overflow-auto flex-1">
              {showReceiptModal.url.endsWith('.pdf') ? (
                <iframe
                  src={showReceiptModal.url}
                  className="w-full h-[70vh]"
                  title="Receipt PDF"
                />
              ) : (
                <img
                  src={showReceiptModal.url}
                  alt="Receipt"
                  className="max-w-full max-h-[70vh] mx-auto object-contain"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
