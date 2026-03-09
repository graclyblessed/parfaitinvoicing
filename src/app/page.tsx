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
  ArrowUpRight, ArrowDownRight, Minus
} from 'lucide-react'

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
  vatRegime: string
  email: string
}

// Main component
export default function TaxDashboard() {
  const [activeTab, setActiveTab] = useState('overview')
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [deadlines, setDeadlines] = useState<Deadline[]>([])
  const [settings, setSettings] = useState<Settings | null>(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

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
      const [transRes, catRes, deadRes, setRes] = await Promise.all([
        fetch('/api/transactions'),
        fetch('/api/categories'),
        fetch('/api/deadlines?upcoming=90'),
        fetch('/api/settings'),
      ])
      
      const [transData, catData, deadData, setData] = await Promise.all([
        transRes.json(),
        catRes.json(),
        deadRes.json(),
        setRes.json(),
      ])
      
      setTransactions(transData.transactions || [])
      setCategories(catData.categories || [])
      setDeadlines(deadData.deadlines || [])
      setSettings(setData.settings || null)
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  // Calculate totals
  const totalIncome = transactions.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0)
  const totalExpenses = Math.abs(transactions.filter(t => t.amount < 0).reduce((sum, t) => sum + t.amount, 0))
  const netProfit = totalIncome - totalExpenses
  const unlabeledCount = transactions.filter(t => !t.labeled).length

  // Handle CSV upload
  const handleUpload = async () => {
    if (!selectedFile) return
    
    setUploading(true)
    const formData = new FormData()
    formData.append('file', selectedFile)
    formData.append('bankName', 'default')
    
    try {
      const res = await fetch('/api/transactions/upload', {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()
      if (data.success) {
        alert(`Importé ${data.imported} transactions. ${data.skipped} ignorées.`)
        fetchAllData()
      }
    } catch (error) {
      console.error('Upload error:', error)
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
          <TabsTrigger value="settings">Paramètres</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Stats Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Revenus</CardTitle>
                <TrendingUp className="h-4 w-4 text-emerald-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-emerald-600">{formatCurrency(totalIncome)}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {transactions.filter(t => t.amount > 0).length} transactions
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Dépenses</CardTitle>
                <TrendingDown className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{formatCurrency(totalExpenses)}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {transactions.filter(t => t.amount < 0).length} transactions
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Résultat Net</CardTitle>
                <Euro className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${netProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {formatCurrency(netProfit)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Base taxable: {formatCurrency(netProfit * 0.75)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">IS Estimé</CardTitle>
                <PiggyBank className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {formatCurrency(calculateIS(netProfit))}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {netProfit > 42500 ? '15% + 25%' : '15%'}
                </p>
              </CardContent>
            </Card>
          </div>

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

                <Button variant="outline" className="justify-start h-auto py-4" onClick={() => setActiveTab('settings')}>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <Building2 className="h-4 w-4 text-purple-600" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium">Paramètres entreprise</p>
                      <p className="text-xs text-muted-foreground">Configurer vos informations</p>
                    </div>
                  </div>
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* IS Breakdown */}
          {netProfit > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Détail de l'Impôt sur les Sociétés</CardTitle>
                <CardDescription>Calcul selon le barème progressif</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Bénéfice fiscal estimé</span>
                    <span className="font-mono">{formatCurrency(netProfit * 0.75)}</span>
                  </div>
                  <Separator />
                  
                  {netProfit > 42500 ? (
                    <>
                      <div className="flex justify-between items-center text-sm">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">15%</Badge>
                          <span>Tranche 0 - 42 500 €</span>
                        </div>
                        <span className="font-mono">{formatCurrency(42500 * 0.15)}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">25%</Badge>
                          <span>Tranche &gt; 42 500 €</span>
                        </div>
                        <span className="font-mono">{formatCurrency((netProfit - 42500) * 0.25)}</span>
                      </div>
                      <Separator />
                      <div className="flex justify-between items-center font-medium">
                        <span>Total IS estimé</span>
                        <span className="font-mono text-lg text-blue-600">{formatCurrency(calculateIS(netProfit))}</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex justify-between items-center text-sm">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">15%</Badge>
                          <span>Taux réduit PME</span>
                        </div>
                        <span className="font-mono">{formatCurrency(netProfit * 0.15)}</span>
                      </div>
                      <Separator />
                      <div className="flex justify-between items-center font-medium">
                        <span>Total IS estimé</span>
                        <span className="font-mono text-lg text-blue-600">{formatCurrency(calculateIS(netProfit))}</span>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Transactions Tab */}
        <TabsContent value="transactions" className="space-y-6">
          {/* Upload Section */}
          <Card>
            <CardHeader>
              <CardTitle>Importer des transactions</CardTitle>
              <CardDescription>Téléchargez un fichier CSV de votre banque</CardDescription>
            </CardHeader>
            <CardContent>
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
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Exporter Excel
                </Button>
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
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transactions.slice(0, 50).map((t) => (
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
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
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
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Factures</CardTitle>
                  <CardDescription>Créez et gérez vos factures clients</CardDescription>
                </div>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Nouvelle facture
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Aucune facture pour le moment</p>
                <p className="text-sm mt-2">Créez votre première facture en cliquant sur "Nouvelle facture"</p>
              </div>
            </CardContent>
          </Card>
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
        </TabsContent>
      </Tabs>
    </div>
  )
}
