'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { 
  AlertCircle, Calendar, Upload, FileText, Settings, TrendingUp, 
  TrendingDown, Euro, Clock, CheckCircle, XCircle, Plus, Download,
  Bell, Building2, ChevronRight, Loader2
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
  const [activeTab, setActiveTab] = useState('dashboard')
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [deadlines, setDeadlines] = useState<Deadline[]>([])
  const [settings, setSettings] = useState<Settings | null>(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  // Fetch initial data
  useEffect(() => {
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
  const totalIncome = transactions
    .filter(t => t.amount > 0)
    .reduce((sum, t) => sum + t.amount, 0)
  
  const totalExpenses = Math.abs(transactions
    .filter(t => t.amount < 0)
    .reduce((sum, t) => sum + t.amount, 0))
  
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
    } catch (error) {
      console.error('Error updating settings:', error)
    }
  }

  // Get urgency color
  const getUrgencyColor = (daysUntil: number) => {
    if (daysUntil < 0) return 'bg-red-500'
    if (daysUntil <= 7) return 'bg-red-500'
    if (daysUntil <= 30) return 'bg-yellow-500'
    return 'bg-green-500'
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            {settings?.companyName || 'Mon Gestionnaire Fiscal'}
          </h1>
          <p className="text-gray-600 mt-1">
            Gérez votre SASU simplement
          </p>
        </div>

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5 mb-8">
            <TabsTrigger value="dashboard">Tableau de bord</TabsTrigger>
            <TabsTrigger value="transactions">Transactions</TabsTrigger>
            <TabsTrigger value="calendar">Échéances</TabsTrigger>
            <TabsTrigger value="invoices">Factures</TabsTrigger>
            <TabsTrigger value="settings">Paramètres</TabsTrigger>
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-6">
            {/* Alert for unlabeled transactions */}
            {unlabeledCount > 0 && (
              <Alert className="border-yellow-500 bg-yellow-50">
                <AlertCircle className="h-4 w-4 text-yellow-600" />
                <AlertDescription className="text-yellow-800">
                  Vous avez {unlabeledCount} transaction(s) non catégorisée(s). 
                  <Button 
                    variant="link" 
                    className="p-0 ml-2 text-yellow-800 underline"
                    onClick={() => setActiveTab('transactions')}
                  >
                    Catégoriser maintenant
                  </Button>
                </AlertDescription>
              </Alert>
            )}

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Revenus</CardDescription>
                  <CardTitle className="text-2xl text-green-600">
                    {formatCurrency(totalIncome)}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center text-sm text-green-600">
                    <TrendingUp className="w-4 h-4 mr-1" />
                    {transactions.filter(t => t.amount > 0).length} transactions
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Dépenses</CardDescription>
                  <CardTitle className="text-2xl text-red-600">
                    {formatCurrency(totalExpenses)}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center text-sm text-red-600">
                    <TrendingDown className="w-4 h-4 mr-1" />
                    {transactions.filter(t => t.amount < 0).length} transactions
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Résultat Net</CardDescription>
                  <CardTitle className={`text-2xl ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(netProfit)}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center text-sm text-gray-600">
                    <Euro className="w-4 h-4 mr-1" />
                    Base IS: {formatCurrency(netProfit * 0.75)}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>IS Estimé</CardDescription>
                  <CardTitle className="text-2xl text-blue-600">
                    {formatCurrency(netProfit > 42500 
                      ? (42500 * 0.15) + ((netProfit - 42500) * 0.25)
                      : netProfit * 0.15
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center text-sm text-gray-600">
                    <Building2 className="w-4 h-4 mr-1" />
                    {netProfit > 42500 ? '15% + 25%' : '15%'}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Upcoming Deadlines */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Bell className="w-5 h-5 mr-2" />
                  Prochaines Échéances Fiscales
                </CardTitle>
                <CardDescription>
                  Vos déclarations à venir dans les 90 jours
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {deadlines.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">
                      Aucune échéance à venir
                    </p>
                  ) : (
                    deadlines.slice(0, 5).map((deadline) => {
                      const days = getDaysUntil(deadline.dueDate)
                      return (
                        <div 
                          key={deadline.id}
                          className="flex items-center justify-between p-4 rounded-lg border bg-white"
                        >
                          <div className="flex items-center space-x-4">
                            <div className={`w-3 h-3 rounded-full ${getUrgencyColor(days)}`} />
                            <div>
                              <p className="font-medium">{deadline.name}</p>
                              <p className="text-sm text-gray-500">
                                {formatDate(deadline.dueDate)}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-4">
                            <Badge variant={days < 0 ? 'destructive' : days <= 7 ? 'destructive' : 'secondary'}>
                              {days < 0 
                                ? `En retard de ${Math.abs(days)} jours`
                                : days === 0 
                                  ? "Aujourd'hui"
                                  : `Dans ${days} jours`
                              }
                            </Badge>
                            <Badge variant="outline">
                              {deadline.type}
                            </Badge>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setActiveTab('transactions')}>
                <CardContent className="pt-6">
                  <div className="flex items-center space-x-4">
                    <div className="p-3 bg-blue-100 rounded-lg">
                      <Upload className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium">Importer CSV</p>
                      <p className="text-sm text-gray-500">Télécharger vos transactions bancaires</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400 ml-auto" />
                  </div>
                </CardContent>
              </Card>

              <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setActiveTab('invoices')}>
                <CardContent className="pt-6">
                  <div className="flex items-center space-x-4">
                    <div className="p-3 bg-green-100 rounded-lg">
                      <FileText className="w-6 h-6 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium">Créer une facture</p>
                      <p className="text-sm text-gray-500">Générer et envoyer une facture</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400 ml-auto" />
                  </div>
                </CardContent>
              </Card>

              <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setActiveTab('calendar')}>
                <CardContent className="pt-6">
                  <div className="flex items-center space-x-4">
                    <div className="p-3 bg-purple-100 rounded-lg">
                      <Calendar className="w-6 h-6 text-purple-600" />
                    </div>
                    <div>
                      <p className="font-medium">Calendrier fiscal</p>
                      <p className="text-sm text-gray-500">Voir toutes vos échéances</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400 ml-auto" />
                  </div>
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
                <CardDescription>
                  Téléchargez un fichier CSV de votre banque
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-4">
                  <Input
                    type="file"
                    accept=".csv"
                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                    className="flex-1"
                  />
                  <Button 
                    onClick={handleUpload} 
                    disabled={!selectedFile || uploading}
                  >
                    {uploading ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <Upload className="w-4 h-4 mr-2" />
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
                    <Download className="w-4 h-4 mr-2" />
                    Exporter
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Montant</TableHead>
                      <TableHead>Catégorie</TableHead>
                      <TableHead>Type</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.slice(0, 20).map((t) => (
                      <TableRow key={t.id} className={!t.labeled ? 'bg-yellow-50' : ''}>
                        <TableCell>{formatDate(t.date)}</TableCell>
                        <TableCell className="max-w-xs truncate">{t.description}</TableCell>
                        <TableCell className={t.amount >= 0 ? 'text-green-600' : 'text-red-600'}>
                          {formatCurrency(t.amount)}
                        </TableCell>
                        <TableCell>
                          <Select
                            value={t.categoryId || ''}
                            onValueChange={(value) => labelTransaction(t.id, value, t.type)}
                          >
                            <SelectTrigger className="w-40">
                              <SelectValue placeholder="Sélectionner..." />
                            </SelectTrigger>
                            <SelectContent>
                              {categories
                                .filter(c => t.amount >= 0 ? c.type === 'income' : c.type === 'expense')
                                .map((c) => (
                                  <SelectItem key={c.id} value={c.id}>
                                    <div className="flex items-center">
                                      <div 
                                        className="w-3 h-3 rounded-full mr-2"
                                        style={{ backgroundColor: c.color }}
                                      />
                                      {c.name}
                                    </div>
                                  </SelectItem>
                                ))
                              }
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Select
                            value={t.type}
                            onValueChange={(value) => labelTransaction(t.id, t.categoryId || '', value)}
                          >
                            <SelectTrigger className="w-32">
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
              </CardContent>
            </Card>
          </TabsContent>

          {/* Calendar Tab */}
          <TabsContent value="calendar" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Calendrier Fiscal {new Date().getFullYear()}</CardTitle>
                <CardDescription>
                  Toutes vos échéances fiscales pour votre SASU
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
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
                      <div key={type} className="space-y-2">
                        <h3 className="font-semibold text-lg">{typeNames[type]}</h3>
                        {typeDeadlines.map((d) => {
                          const days = getDaysUntil(d.dueDate)
                          return (
                            <div 
                              key={d.id}
                              className="flex items-center justify-between p-4 rounded-lg border bg-white"
                            >
                              <div className="flex items-center space-x-4">
                                <div className={`w-3 h-3 rounded-full ${getUrgencyColor(days)}`} />
                                <div>
                                  <p className="font-medium">{d.name}</p>
                                  <p className="text-sm text-gray-500">
                                    Échéance: {formatDate(d.dueDate)}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Badge variant={d.status === 'done' ? 'default' : 'secondary'}>
                                  {d.status === 'done' ? (
                                    <CheckCircle className="w-3 h-3 mr-1" />
                                  ) : (
                                    <Clock className="w-3 h-3 mr-1" />
                                  )}
                                  {d.status === 'done' ? 'Effectué' : 'En attente'}
                                </Badge>
                                <span className="text-sm font-medium">
                                  {days < 0 
                                    ? `En retard de ${Math.abs(days)} jours`
                                    : days === 0 
                                      ? "Aujourd'hui"
                                      : `Dans ${days} jours`
                                  }
                                </span>
                              </div>
                            </div>
                          )
                        })}
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
                    <CardDescription>
                      Créez et gérez vos factures clients
                    </CardDescription>
                  </div>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Nouvelle facture
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-gray-500">
                  <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>Aucune facture pour le moment</p>
                  <p className="text-sm mt-2">
                    Créez votre première facture en cliquant sur "Nouvelle facture"
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Informations de l'entreprise</CardTitle>
                <CardDescription>
                  Ces informations apparaîtront sur vos factures et déclarations
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={updateSettings} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="companyName">Nom de l'entreprise</Label>
                      <Input 
                        id="companyName" 
                        name="companyName"
                        defaultValue={settings?.companyName || ''} 
                      />
                    </div>
                    <div>
                      <Label htmlFor="companySIREN">SIREN</Label>
                      <Input 
                        id="companySIREN" 
                        name="companySIREN"
                        defaultValue={settings?.companySIREN || ''} 
                      />
                    </div>
                    <div>
                      <Label htmlFor="companySIRET">SIRET</Label>
                      <Input 
                        id="companySIRET" 
                        name="companySIRET"
                        defaultValue={settings?.companySIRET || ''} 
                      />
                    </div>
                    <div>
                      <Label htmlFor="companyTVA">Numéro TVA (optionnel)</Label>
                      <Input 
                        id="companyTVA" 
                        name="companyTVA"
                        defaultValue={settings?.companyTVA || ''} 
                        placeholder="FR XX XXXXXXXXX"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="companyAddress">Adresse</Label>
                    <Textarea 
                      id="companyAddress" 
                      name="companyAddress"
                      defaultValue={settings?.companyAddress || ''} 
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
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
                    <div>
                      <Label htmlFor="email">Email pour les rappels</Label>
                      <Input 
                        id="email" 
                        name="email"
                        type="email"
                        defaultValue={settings?.email || ''} 
                      />
                    </div>
                  </div>

                  <Button type="submit">
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Enregistrer les paramètres
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
