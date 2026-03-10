'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  FileText, Download, Loader2, Plus, Trash2, Send, CheckCircle, XCircle,
  ArrowRight, Eye, Mail, Euro, Calculator
} from 'lucide-react'

interface DevisItem {
  description: string
  quantity: number
  unitPrice: number
}

interface Devis {
  id: string
  devisNumber: string
  date: string
  validUntil: string
  clientName: string
  clientAddress: string | null
  clientSIRET: string | null
  clientTVAIntra: string | null
  clientEmail: string | null
  items: string
  subtotalHT: number
  tvaRate: number
  tvaAmount: number
  totalTTC: number
  status: string
  notes: string | null
  sentAt: string | null
  acceptedAt: string | null
  convertedToInvoiceId: string | null
  createdAt: string
}

interface Settings {
  companyName: string
  companyAddress: string
  companySIRET: string
  companyTVA: string | null
  vatRegime: string
}

interface DevisSectionProps {
  settings: Settings | null
}

export function DevisSection({ settings }: DevisSectionProps) {
  const [devis, setDevis] = useState<Devis[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [converting, setConverting] = useState<string | null>(null)
  
  // Form state
  const [clientName, setClientName] = useState('')
  const [clientAddress, setClientAddress] = useState('')
  const [clientSIRET, setClientSIRET] = useState('')
  const [clientTVAIntra, setClientTVAIntra] = useState('')
  const [clientEmail, setClientEmail] = useState('')
  const [items, setItems] = useState<DevisItem[]>([{ description: '', quantity: 1, unitPrice: 0 }])
  const [tvaRate, setTvaRate] = useState(20)
  const [validUntilDays, setValidUntilDays] = useState(30)
  const [notes, setNotes] = useState('')

  useEffect(() => {
    fetchDevis()
  }, [])

  const fetchDevis = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/devis')
      const data = await res.json()
      setDevis(data.devis || [])
    } catch (error) {
      console.error('Error fetching devis:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount)
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('fr-FR')
  }

  // Calculate totals
  const subtotalHT = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0)
  const tvaAmount = subtotalHT * (tvaRate / 100)
  const totalTTC = subtotalHT + tvaAmount

  // Add item
  const addItem = () => {
    setItems([...items, { description: '', quantity: 1, unitPrice: 0 }])
  }

  // Update item
  const updateItem = (index: number, field: keyof DevisItem, value: string | number) => {
    const newItems = [...items]
    newItems[index] = { ...newItems[index], [field]: value }
    setItems(newItems)
  }

  // Remove item
  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index))
    }
  }

  // Create devis
  const createDevis = async () => {
    if (!clientName) {
      alert('Veuillez entrer le nom du client')
      return
    }
    if (items.some(item => !item.description || item.unitPrice <= 0)) {
      alert('Veuillez remplir tous les articles avec un prix valide')
      return
    }

    setSaving(true)
    try {
      const res = await fetch('/api/devis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientName,
          clientAddress: clientAddress || null,
          clientSIRET: clientSIRET || null,
          clientTVAIntra: clientTVAIntra || null,
          clientEmail: clientEmail || null,
          items,
          tvaRate,
          validUntilDays,
          notes: notes || null,
        }),
      })
      const data = await res.json()
      if (data.devis) {
        alert(`Devis ${data.devis.devisNumber} créé!`)
        setShowForm(false)
        resetForm()
        fetchDevis()
      } else {
        alert('Erreur: ' + (data.error || 'Erreur inconnue'))
      }
    } catch (error) {
      console.error('Error creating devis:', error)
      alert('Erreur lors de la création')
    } finally {
      setSaving(false)
    }
  }

  // Reset form
  const resetForm = () => {
    setClientName('')
    setClientAddress('')
    setClientSIRET('')
    setClientTVAIntra('')
    setClientEmail('')
    setItems([{ description: '', quantity: 1, unitPrice: 0 }])
    setTvaRate(20)
    setValidUntilDays(30)
    setNotes('')
  }

  // Send devis (mark as sent)
  const sendDevis = async (id: string) => {
    try {
      await fetch('/api/devis', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: 'sent', sentAt: new Date().toISOString() }),
      })
      fetchDevis()
      alert('Devis marqué comme envoyé!')
    } catch (error) {
      console.error('Error sending devis:', error)
    }
  }

  // Accept devis
  const acceptDevis = async (id: string) => {
    try {
      await fetch('/api/devis', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: 'accepted', acceptedAt: new Date().toISOString() }),
      })
      fetchDevis()
      alert('Devis accepté!')
    } catch (error) {
      console.error('Error accepting devis:', error)
    }
  }

  // Reject devis
  const rejectDevis = async (id: string) => {
    try {
      await fetch('/api/devis', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: 'rejected' }),
      })
      fetchDevis()
      alert('Devis refusé')
    } catch (error) {
      console.error('Error rejecting devis:', error)
    }
  }

  // Convert to invoice
  const convertToInvoice = async (id: string) => {
    setConverting(id)
    try {
      const res = await fetch(`/api/devis/${id}/convert`, {
        method: 'POST',
      })
      const data = await res.json()
      if (data.invoice) {
        alert(`Facture ${data.invoice.invoiceNumber} créée à partir du devis!`)
        fetchDevis()
      } else {
        alert('Erreur: ' + (data.error || 'Erreur inconnue'))
      }
    } catch (error) {
      console.error('Error converting devis:', error)
      alert('Erreur lors de la conversion')
    } finally {
      setConverting(null)
    }
  }

  // Download PDF
  const downloadPDF = (id: string) => {
    window.open(`/api/devis/${id}/pdf`, '_blank')
  }

  // Status badge
  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; className: string }> = {
      draft: { label: 'Brouillon', className: 'bg-gray-100 text-gray-800' },
      sent: { label: 'Envoyé', className: 'bg-blue-100 text-blue-800' },
      accepted: { label: 'Accepté', className: 'bg-green-100 text-green-800' },
      rejected: { label: 'Refusé', className: 'bg-red-100 text-red-800' },
      converted: { label: 'Converti', className: 'bg-purple-100 text-purple-800' },
    }
    const config = statusConfig[status] || statusConfig.draft
    return <Badge className={config.className}>{config.label}</Badge>
  }

  const isFranchise = settings?.vatRegime === 'franchise'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Devis</h2>
          <p className="text-muted-foreground">Créez et gérez vos devis clients</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Annuler' : (
            <>
              <Plus className="h-4 w-4 mr-2" />
              Nouveau devis
            </>
          )}
        </Button>
      </div>

      {/* Create Devis Form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Nouveau Devis
            </CardTitle>
            <CardDescription>Créez un devis pour votre client</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Client Info */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="clientName">Nom du client *</Label>
                <Input
                  id="clientName"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Nom de l'entreprise"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="clientEmail">Email du client</Label>
                <Input
                  id="clientEmail"
                  type="email"
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                  placeholder="client@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="clientSIRET">SIRET du client</Label>
                <Input
                  id="clientSIRET"
                  value={clientSIRET}
                  onChange={(e) => setClientSIRET(e.target.value)}
                  placeholder="123 456 789 00012"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="clientTVAIntra">TVA Intracommunautaire</Label>
                <Input
                  id="clientTVAIntra"
                  value={clientTVAIntra}
                  onChange={(e) => setClientTVAIntra(e.target.value)}
                  placeholder="FR XX XXXXXXXXX"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="clientAddress">Adresse du client</Label>
              <Textarea
                id="clientAddress"
                value={clientAddress}
                onChange={(e) => setClientAddress(e.target.value)}
                placeholder="123 Rue Example&#10;75001 Paris"
                rows={2}
              />
            </div>

            <Separator />

            {/* Items */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Articles</Label>
                <Button variant="outline" size="sm" onClick={addItem}>
                  <Plus className="h-4 w-4 mr-1" />
                  Ajouter
                </Button>
              </div>

              <div className="space-y-3">
                {items.map((item, index) => (
                  <div key={index} className="grid grid-cols-12 gap-2 items-end">
                    <div className="col-span-6">
                      <Input
                        placeholder="Description"
                        value={item.description}
                        onChange={(e) => updateItem(index, 'description', e.target.value)}
                      />
                    </div>
                    <div className="col-span-2">
                      <Input
                        type="number"
                        placeholder="Qté"
                        value={item.quantity}
                        onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 0)}
                        min="1"
                      />
                    </div>
                    <div className="col-span-3">
                      <Input
                        type="number"
                        placeholder="Prix unitaire"
                        value={item.unitPrice || ''}
                        onChange={(e) => updateItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                        min="0"
                        step="0.01"
                      />
                    </div>
                    <div className="col-span-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeItem(index)}
                        disabled={items.length === 1}
                        className="text-red-500"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* Settings */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tvaRate">Taux TVA (%)</Label>
                <Select value={tvaRate.toString()} onValueChange={(v) => setTvaRate(parseInt(v))}>
                  <SelectTrigger>
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
              <div className="space-y-2">
                <Label htmlFor="validUntil">Validité (jours)</Label>
                <Input
                  id="validUntil"
                  type="number"
                  value={validUntilDays}
                  onChange={(e) => setValidUntilDays(parseInt(e.target.value) || 30)}
                  min="1"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Conditions particulières..."
                rows={2}
              />
            </div>

            <Separator />

            {/* Totals */}
            <div className="bg-muted p-4 rounded-lg space-y-2">
              <div className="flex justify-between">
                <span>Sous-total HT</span>
                <span className="font-mono">{formatCurrency(subtotalHT)}</span>
              </div>
              <div className="flex justify-between">
                <span>TVA ({tvaRate}%)</span>
                <span className="font-mono">{formatCurrency(tvaAmount)}</span>
              </div>
              <Separator />
              <div className="flex justify-between font-bold text-lg">
                <span>Total TTC</span>
                <span className="font-mono">{formatCurrency(totalTTC)}</span>
              </div>
            </div>

            <Button onClick={createDevis} disabled={saving} className="w-full">
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <FileText className="h-4 w-4 mr-2" />
              )}
              Créer le devis
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Devis List */}
      <Card>
        <CardHeader>
          <CardTitle>Liste des devis</CardTitle>
          <CardDescription>{devis.length} devis au total</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : devis.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Aucun devis créé</p>
              <p className="text-sm mt-2">Cliquez sur "Nouveau devis" pour commencer</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>N° Devis</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Validité</TableHead>
                    <TableHead className="text-right">Total TTC</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {devis.map((d) => (
                    <TableRow key={d.id}>
                      <TableCell className="font-medium">{d.devisNumber}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{d.clientName}</p>
                          {d.clientEmail && (
                            <p className="text-xs text-muted-foreground">{d.clientEmail}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{formatDate(d.date)}</TableCell>
                      <TableCell className="font-mono text-sm">{formatDate(d.validUntil)}</TableCell>
                      <TableCell className="font-mono text-right font-semibold">
                        {formatCurrency(d.totalTTC)}
                      </TableCell>
                      <TableCell>{getStatusBadge(d.status)}</TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-1">
                          {/* Download PDF */}
                          <Button variant="ghost" size="sm" onClick={() => downloadPDF(d.id)}>
                            <Download className="h-4 w-4" />
                          </Button>

                          {/* Send (if draft) */}
                          {d.status === 'draft' && (
                            <Button variant="ghost" size="sm" onClick={() => sendDevis(d.id)} title="Marquer comme envoyé">
                              <Send className="h-4 w-4 text-blue-500" />
                            </Button>
                          )}

                          {/* Accept/Reject (if sent) */}
                          {d.status === 'sent' && (
                            <>
                              <Button variant="ghost" size="sm" onClick={() => acceptDevis(d.id)} title="Accepter">
                                <CheckCircle className="h-4 w-4 text-green-500" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => rejectDevis(d.id)} title="Refuser">
                                <XCircle className="h-4 w-4 text-red-500" />
                              </Button>
                            </>
                          )}

                          {/* Convert to Invoice (if accepted) */}
                          {d.status === 'accepted' && (
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => convertToInvoice(d.id)}
                              disabled={converting === d.id}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              {converting === d.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <>
                                  <ArrowRight className="h-4 w-4 mr-1" />
                                  Facturer
                                </>
                              )}
                            </Button>
                          )}

                          {/* Show invoice link (if converted) */}
                          {d.status === 'converted' && (
                            <Badge variant="outline" className="text-purple-600 border-purple-200">
                              Facturé
                            </Badge>
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

      {/* Info Alert */}
      {isFranchise && (
        <Alert>
          <Euro className="h-4 w-4" />
          <AlertDescription>
            <strong>Franchise en base:</strong> Vos devis doivent mentionner "TVA non applicable, art. 293B du CGI".
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}
