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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import {
  FileText, Loader2, Calculator, Building2,
  AlertCircle, CheckCircle, Info, Copy, Check, Clipboard,
  ExternalLink, RefreshCw, Save, HelpCircle
} from 'lucide-react'
import { toast } from 'sonner'

interface Settings {
  companyName: string
  companySIRET: string
  companySIREN: string
  companyTVA: string | null
  companyAddress: string
  presidentName: string | null
  vatRegime: string
}

interface Transaction {
  id: string
  date: string
  amount: number
  type: string
  labeled: boolean
}

interface Formulaire2572 {
  id: string
  year: number
  status: string
  resultatNetBenefice: number
  resultatNetDeficit: number
  baseTauxNormal: number
  isTauxNormal: number
  baseTauxReduit: number
  isTauxReduit: number
  creditImpotRecherche: number
  creditImpotInnovation: number
  creditImpotCooperation: number
  creditImpotApprentissage: number
  creditImpotFamille: number
  creditImpotMEC: number
  creditImpotCompetitivite: number
  creditImpotAgri: number
  creditImpotAutres: number
  totalCreditsImpot: number
  totalISBrut: number
  totalISNet: number
  acompte1: number
  acompte2: number
  acompte3: number
  acompte4: number
  totalAcomptes: number
  soldeAPayer: number
  excedent: number
  cfb: number
  contributionSociale: number
  impotsEtrangersCr: number
}

interface Formulaire2065 {
  id: string
  year: number
  status: string
  regimeBenefice: string
  dureeExercice: number
  dateCloture: string
  resultatComptable: number
  reintegrationNeutralite: number
  deductionsNeutralite: number
  resultatFiscal: number
  deficitAnterieurN1: number
  deficitAnterieurN2: number
  deficitAnterieurN3: number
  totalDeficits: number
  deficitUtilise: number
  baseImposableAvant: number
  baseImposable: number
  baseTauxReduit: number
  baseTauxNormal: number
  isTauxReduit: number
  isTauxNormal: number
  isTotal: number
  creditImpotRecherche: number
  creditImpotInnovation: number
  creditImpotCooperation: number
  creditImpotApprentissage: number
  creditImpotFamille: number
  creditImpotMEC: number
  creditImpotAutres: number
  totalCreditsImpot: number
  isNet: number
  contributionSociale: number
  cfb: number
  beneficeFrance: number
  beneficeEtranger: number
  totalBenefice: number
  revenusBrevets: number
  revenusPatrimoineMobilier: number
  precompteIS: number
  acomptesVerses: number
  annexesFournies: string
}

interface FormulaireISSectionProps {
  settings: Settings | null
  transactions: Transaction[]
}

// Tooltip helper component
const T = ({ text }: { text: string }) => (
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger asChild>
        <HelpCircle className="h-3.5 w-3.5 text-muted-foreground inline-block ml-1 cursor-help" />
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs text-sm">
        <p>{text}</p>
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
)

export function FormulaireISSection({ settings, transactions }: FormulaireISSectionProps) {
  const [activeTab, setActiveTab] = useState('2572')
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear() - 1)
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [copiedAll2572, setCopiedAll2572] = useState(false)
  const [copiedAll2065, setCopiedAll2065] = useState(false)

  // Form data
  const [form2572, setForm2572] = useState<Formulaire2572 | null>(null)
  const [form2572List, setForm2572List] = useState<Formulaire2572[]>([])
  const [form2065, setForm2065] = useState<Formulaire2065 | null>(null)
  const [form2065List, setForm2065List] = useState<Formulaire2065[]>([])

  // Manual credit inputs for 2572
  const [credits2572, setCredits2572] = useState({
    creditImpotRecherche: 0,
    creditImpotInnovation: 0,
    creditImpotCooperation: 0,
    creditImpotApprentissage: 0,
    creditImpotFamille: 0,
    creditImpotMEC: 0,
    creditImpotAutres: 0,
  })

  // Manual inputs for 2065
  const [inputs2065, setInputs2065] = useState({
    deficitAnterieurN1: 0,
    deficitAnterieurN2: 0,
    deficitAnterieurN3: 0,
    reintegrationNeutralite: 0,
    deductionsNeutralite: 0,
    creditImpotRecherche: 0,
    creditImpotInnovation: 0,
    creditImpotCooperation: 0,
    creditImpotApprentissage: 0,
    creditImpotFamille: 0,
    creditImpotMEC: 0,
    creditImpotAutres: 0,
  })

  const yearOptions = [2026, 2025, 2024, 2023, 2022]

  useEffect(() => {
    fetchForms()
  }, [])

  // Load the form matching the current selectedYear from the list
  const loadFormsForYear = (list2572: Formulaire2572[], list2065: Formulaire2065[], year: number) => {
    const match2572 = list2572.find(f => f.year === year)
    setForm2572(match2572 || null)
    const match2065 = list2065.find(f => f.year === year)
    setForm2065(match2065 || null)
  }

  const fetchForms = async () => {
    setLoading(true)
    try {
      const [res2572, res2065] = await Promise.all([
        fetch('/api/formulaire-2572'),
        fetch('/api/formulaire-2065'),
      ])
      const data2572 = await res2572.json()
      const data2065 = await res2065.json()
      const list2572 = data2572.formulaires || []
      const list2065 = data2065.formulaires || []
      setForm2572List(list2572)
      setForm2065List(list2065)
      // Load the form for the currently selected year (not always the first!)
      loadFormsForYear(list2572, list2065, selectedYear)
    } catch (error) {
      console.error('Error fetching forms:', error)
    } finally {
      setLoading(false)
    }
  }

  // When year changes, load the matching forms from the cached lists
  const handleYearChange = (year: number) => {
    setSelectedYear(year)
    loadFormsForYear(form2572List, form2065List, year)
  }

  const generate2572 = async () => {
    setGenerating(true)
    try {
      const res = await fetch('/api/formulaire-2572', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ year: selectedYear, credits: credits2572 }),
      })
      const data = await res.json()
      if (data.success) {
        setForm2572(data.formulaire)
        // Refresh list but keep displaying the generated form
        try {
          const listRes = await fetch('/api/formulaire-2572')
          const listData = await listRes.json()
          setForm2572List(listData.formulaires || [])
        } catch { /* ignore */ }
        toast.success(`Formulaire 2572 généré pour l'exercice ${selectedYear}!`)
      } else {
        toast.error('Erreur: ' + (data.error || 'Erreur inconnue'))
      }
    } catch (error) {
      console.error('Error generating 2572:', error)
      toast.error('Erreur lors de la génération')
    } finally {
      setGenerating(false)
    }
  }

  const generate2065 = async () => {
    setGenerating(true)
    try {
      const res = await fetch('/api/formulaire-2065', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ year: selectedYear, ...inputs2065 }),
      })
      const data = await res.json()
      if (data.success) {
        setForm2065(data.formulaire)
        // Refresh list but keep displaying the generated form
        try {
          const listRes = await fetch('/api/formulaire-2065')
          const listData = await listRes.json()
          setForm2065List(listData.formulaires || [])
        } catch { /* ignore */ }
        toast.success(`Formulaire 2065 généré pour l'exercice ${selectedYear}!`)
      } else {
        toast.error('Erreur: ' + (data.error || 'Erreur inconnue'))
      }
    } catch (error) {
      console.error('Error generating 2065:', error)
      toast.error('Erreur lors de la génération')
    } finally {
      setGenerating(false)
    }
  }

  const save2572 = async () => {
    if (!form2572) return
    setSaving(true)
    try {
      const res = await fetch('/api/formulaire-2572', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: form2572.id, ...credits2572 }),
      })
      const data = await res.json()
      if (data.success) {
        setForm2572(data.formulaire)
        toast.success('Formulaire 2572 mis à jour!')
      }
    } catch (error) {
      console.error('Error saving 2572:', error)
    } finally {
      setSaving(false)
    }
  }

  const save2065 = async () => {
    if (!form2065) return
    setSaving(true)
    try {
      const res = await fetch('/api/formulaire-2065', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: form2065.id, ...inputs2065 }),
      })
      const data = await res.json()
      if (data.success) {
        setForm2065(data.formulaire)
        toast.success('Formulaire 2065 mis à jour!')
      }
    } catch (error) {
      console.error('Error saving 2065:', error)
    } finally {
      setSaving(false)
    }
  }

  const copyToClipboard = async (value: number, fieldLabel: string) => {
    const text = Math.round(value * 100) / 100
    try {
      await navigator.clipboard.writeText(text.toString())
      setCopiedField(fieldLabel)
      setTimeout(() => setCopiedField(null), 2000)
    } catch {
      // Fallback
      const textarea = document.createElement('textarea')
      textarea.value = text.toString()
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      setCopiedField(fieldLabel)
      setTimeout(() => setCopiedField(null), 2000)
    }
  }

  const copyAll2572ForImpots = async () => {
    if (!form2572) return
    const lines = [
      `FORMULAIRE 2572-SD - RELEVE DE SOLDE IS`,
      `Exercice: 01/12/${form2572.year - 1} au 30/11/${form2572.year}`,
      `${settings?.companyName || ''} - SIREN: ${settings?.companySIREN || ''}`,
      ``,
      `RESULTAT DE L'EXERCICE (Ligne I):`,
      `  Benefice net: ${fmtVal(form2572.resultatNetBenefice)}`,
      `  Deficit: ${fmtVal(form2572.resultatNetDeficit)}`,
      ``,
      `IS AU TAUX NORMAL 25% (Ligne II):`,
      `  Base imposable: ${fmtVal(form2572.baseTauxNormal)}`,
      `  IS 25%: ${fmtVal(form2572.isTauxNormal)}`,
      ``,
      `IS AU TAUX REDUIT 15% (Ligne III):`,
      `  Base imposable: ${fmtVal(form2572.baseTauxReduit)}`,
      `  IS 15%: ${fmtVal(form2572.isTauxReduit)}`,
      ``,
      `CREDITS D'IMPOT (Ligne IV):`,
      `  CIR (Crédit impôt recherche): ${fmtVal(form2572.creditImpotRecherche)}`,
      `  CII (Crédit impôt innovation): ${fmtVal(form2572.creditImpotInnovation)}`,
      `  CCor (Coopération): ${fmtVal(form2572.creditImpotCooperation)}`,
      `  Apprentissage: ${fmtVal(form2572.creditImpotApprentissage)}`,
      `  Famille: ${fmtVal(form2572.creditImpotFamille)}`,
      `  Mécénat: ${fmtVal(form2572.creditImpotMEC)}`,
      `  CICE (ancien): ${fmtVal(form2572.creditImpotCompetitivite)}`,
      `  Agricole: ${fmtVal(form2572.creditImpotAgri)}`,
      `  Autres: ${fmtVal(form2572.creditImpotAutres)}`,
      `  TOTAL: ${fmtVal(form2572.totalCreditsImpot)}`,
      ``,
      `IS BRUT: ${fmtVal(form2572.totalISBrut)}`,
      `IS NET (après crédits): ${fmtVal(form2572.totalISNet)}`,
      ``,
      `ACOMPTES VERSES (Ligne V):`,
      `  Acompte 1 (15 mars): ${fmtVal(form2572.acompte1)}`,
      `  Acompte 2 (15 juin): ${fmtVal(form2572.acompte2)}`,
      `  Acompte 3 (15 sept.): ${fmtVal(form2572.acompte3)}`,
      `  Acompte 4 (15 déc.): ${fmtVal(form2572.acompte4)}`,
      `  Total acomptes: ${fmtVal(form2572.totalAcomptes)}`,
      ``,
      form2572.soldeAPayer > 0
        ? `SOLDE A PAYER: ${fmtVal(form2572.soldeAPayer)}`
        : `EXCEDENT A REMBOURSER: ${fmtVal(form2572.excedent)}`,
      ``,
      `CONTRIBUTIONS:`,
      `  Contribution sociale: ${fmtVal(form2572.contributionSociale)}`,
      `  CFB: ${fmtVal(form2572.cfb)}`,
      ``,
      `Généré par Parfait Invoicing le ${new Date().toLocaleDateString('fr-FR')}`,
    ]
    await navigator.clipboard.writeText(lines.join('\n'))
    setCopiedAll2572(true)
    setTimeout(() => setCopiedAll2572(false), 3000)
  }

  const copyAll2065ForImpots = async () => {
    if (!form2065) return
    const lines = [
      `FORMULAIRE 2065-SD - DECLARATION DES RESULTATS`,
      `Exercice: ${form2065.dateCloture}`,
      `Régime: ${form2065.regimeBenefice === 'RS' ? 'Réel Simplifié (RS)' : 'Réel Normal (RN)'}`,
      `Durée: ${form2065.dureeExercice} mois`,
      `${settings?.companyName || ''} - SIREN: ${settings?.companySIREN || ''}`,
      ``,
      `RESULTAT COMPTABLE (Ligne 1): ${fmtVal(form2065.resultatComptable)}`,
      `Réintégrations neutralisées: ${fmtVal(form2065.reintegrationNeutralite)}`,
      `Déductions neutralisées: ${fmtVal(form2065.deductionsNeutralite)}`,
      `RESULTAT FISCAL (Ligne 3): ${fmtVal(form2065.resultatFiscal)}`,
      ``,
      `DEFICITS REPORTABLES:`,
      `  Déficit N-1 (Ligne 4): ${fmtVal(form2065.deficitAnterieurN1)}`,
      `  Déficit N-2 (Ligne 5): ${fmtVal(form2065.deficitAnterieurN2)}`,
      `  Déficits antérieurs (Ligne 6): ${fmtVal(form2065.deficitAnterieurN3)}`,
      `  Total: ${fmtVal(form2065.totalDeficits)}`,
      `  Déficits utilisés: ${fmtVal(form2065.deficitUtilise)}`,
      ``,
      `BASE IMPOSABLE:`,
      `  Avant déduction déficits: ${fmtVal(form2065.baseImposableAvant)}`,
      `  Base imposable (Ligne 7): ${fmtVal(form2065.baseImposable)}`,
      ``,
      `CALCUL DE L'IS:`,
      `  Base taux réduit 15%: ${fmtVal(form2065.baseTauxReduit)}`,
      `  IS taux réduit: ${fmtVal(form2065.isTauxReduit)}`,
      `  Base taux normal 25%: ${fmtVal(form2065.baseTauxNormal)}`,
      `  IS taux normal: ${fmtVal(form2065.isTauxNormal)}`,
      `  IS TOTAL: ${fmtVal(form2065.isTotal)}`,
      ``,
      `CREDITS D'IMPOT:`,
      `  CIR: ${fmtVal(form2065.creditImpotRecherche)}`,
      `  CII: ${fmtVal(form2065.creditImpotInnovation)}`,
      `  CCor: ${fmtVal(form2065.creditImpotCooperation)}`,
      `  Apprentissage: ${fmtVal(form2065.creditImpotApprentissage)}`,
      `  Famille: ${fmtVal(form2065.creditImpotFamille)}`,
      `  Mécénat: ${fmtVal(form2065.creditImpotMEC)}`,
      `  Autres: ${fmtVal(form2065.creditImpotAutres)}`,
      `  TOTAL: ${fmtVal(form2065.totalCreditsImpot)}`,
      ``,
      `IS NET A PAYER: ${fmtVal(form2065.isNet)}`,
      `Contribution sociale (3.3%): ${fmtVal(form2065.contributionSociale)}`,
      `CFB: ${fmtVal(form2065.cfb)}`,
      ``,
      `REPARTITION GEOGRAPHIQUE:`,
      `  Bénéfices France: ${fmtVal(form2065.beneficeFrance)}`,
      `  Bénéfices étranger: ${fmtVal(form2065.beneficeEtranger)}`,
      `  Total: ${fmtVal(form2065.totalBenefice)}`,
      ``,
      `REVENUS SPECIFIQUES:`,
      `  Revenus brevets (10%): ${fmtVal(form2065.revenusBrevets)}`,
      `  Revenus patrimoine mobilier: ${fmtVal(form2065.revenusPatrimoineMobilier)}`,
      ``,
      `Précompte IS: ${fmtVal(form2065.precompteIS)}`,
      `Acomptes versés: ${fmtVal(form2065.acomptesVerses)}`,
      ``,
      `Généré par Parfait Invoicing le ${new Date().toLocaleDateString('fr-FR')}`,
    ]
    await navigator.clipboard.writeText(lines.join('\n'))
    setCopiedAll2065(true)
    setTimeout(() => setCopiedAll2065(false), 3000)
  }

  const fmtVal = (v: number) => formatCurrency(v)
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount)
  }

  const formatEuros = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount) + ' EUR'
  }

  const parseAddress = (address: string) => {
    const parts = address.split(/[,\n]/).map(s => s.trim()).filter(Boolean)
    let street = '', complement = '', postalCode = '', city = '', country = 'FRANCE'
    for (let i = 0; i < parts.length; i++) {
      const p = parts[i]
      const postalMatch = p.match(/\b(\d{5})\b/)
      if (postalMatch) {
        postalCode = postalMatch[1]
        city = p.replace(/\b\d{5}\b/, '').trim()
      } else if (i === 0) {
        street = p
      } else if (!postalCode) {
        complement = p
      } else {
        country = p.toUpperCase()
      }
    }
    return { street, complement, postalCode, city, country: country || 'FRANCE' }
  }

  const copyTextToClipboard = async (value: string, fieldKey: string) => {
    try {
      await navigator.clipboard.writeText(value)
      setCopiedField(fieldKey)
      setTimeout(() => setCopiedField(null), 2000)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = value
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
      setCopiedField(fieldKey)
      setTimeout(() => setCopiedField(null), 2000)
    }
  }

  const renderGuideTextField = (label: string, value: string, fieldKey: string) => (
    <div className="flex items-start py-2 border-b border-gray-100 last:border-0 gap-3">
      <span className="text-sm text-gray-600 flex-1 leading-5">{label}</span>
      <div className="flex items-center gap-1 flex-shrink-0">
        {!value ? (
          <span className="text-xs text-gray-400 italic">–</span>
        ) : (
          <>
            <span className="font-mono text-sm font-semibold bg-amber-50 text-amber-900 px-2 py-0.5 rounded max-w-[240px] text-right">
              {value}
            </span>
            <button
              onClick={() => copyTextToClipboard(value, fieldKey)}
              className="inline-flex items-center justify-center h-6 w-6 rounded hover:bg-muted transition-colors"
              title="Copier"
            >
              {copiedField === fieldKey ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3 text-muted-foreground" />}
            </button>
          </>
        )}
      </div>
    </div>
  )

  const renderGuideAmountField = (label: string, value: number, fieldKey: string) => {
    const rounded = Math.round(value)
    return (
      <div className="flex items-start py-2 border-b border-gray-100 last:border-0 gap-3">
        <span className="text-sm text-gray-600 flex-1 leading-5">{label}</span>
        <div className="flex items-center gap-1 flex-shrink-0">
          {rounded === 0 ? (
            <span className="text-xs text-gray-400 font-mono px-2">0</span>
          ) : (
            <>
              <span className="font-mono text-sm font-bold bg-blue-50 text-blue-800 px-2 py-0.5 rounded">
                {rounded.toLocaleString('fr-FR')}
              </span>
              <button
                onClick={() => copyTextToClipboard(rounded.toString(), fieldKey)}
                className="inline-flex items-center justify-center h-6 w-6 rounded hover:bg-muted transition-colors"
                title="Copier"
              >
                {copiedField === fieldKey ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3 text-muted-foreground" />}
              </button>
            </>
          )}
        </div>
      </div>
    )
  }

  const renderGuideLabel = (label: string, badge: string, badgeColor = 'gray') => (
    <div className="flex items-center py-2 border-b border-gray-100 last:border-0 gap-3">
      <span className="text-sm text-gray-600 flex-1 leading-5">{label}</span>
      <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
        badgeColor === 'green' ? 'bg-green-100 text-green-800' :
        badgeColor === 'blue' ? 'bg-blue-100 text-blue-800' :
        'bg-gray-100 text-gray-500'
      }`}>{badge}</span>
    </div>
  )

  const renderCopyBtn = (value: number, fieldLabel: string) => (
    <button
      onClick={() => copyToClipboard(value, fieldLabel)}
      className="inline-flex items-center justify-center h-6 w-6 rounded hover:bg-muted transition-colors ml-1"
      title={`Copier ${fieldLabel}`}
    >
      {copiedField === fieldLabel ? (
        <Check className="h-3 w-3 text-green-600" />
      ) : (
        <Copy className="h-3 w-3 text-muted-foreground" />
      )}
    </button>
  )

  return (
    <div className="space-y-6">
      {/* Year Selector */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardContent className="py-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-blue-900">Formulaires IS</h2>
              <p className="text-sm text-blue-700">
                Formulaire 2572 (Relevé de solde) et 2065 (Déclaration des bénéfices)
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Label className="text-sm font-medium text-blue-800">Exercice:</Label>
              <select
                className="p-2 border rounded-md bg-white"
                value={selectedYear}
                onChange={(e) => handleYearChange(parseInt(e.target.value))}
              >
                {yearOptions.map(y => (
                  <option key={y} value={y}>30/11/{y}</option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Info alert */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>Formulaires IS 2025/2026.</strong> Taux normal: 25%. Taux réduit PME: 15% sur les 42 500 premiers EUR de bénéfice.
          Les données sont calculées automatiquement à partir de vos transactions catégorisées. Vous pouvez copier les valeurs pour les coller sur <a href="https://cfspro.impots.gouv.fr" target="_blank" rel="noopener noreferrer" className="underline font-medium text-blue-600">impots.gouv.fr</a>.
        </AlertDescription>
      </Alert>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="2572">Formulaire 2572</TabsTrigger>
          <TabsTrigger value="2065">Formulaire 2065</TabsTrigger>
          <TabsTrigger value="guide2065">Guide saisie 2065</TabsTrigger>
          <TabsTrigger value="historique">Historique</TabsTrigger>
        </TabsList>

        {/* ============================================ */}
        {/* FORMULAIRE 2572 - RELEVE DE SOLDE IS */}
        {/* ============================================ */}
        <TabsContent value="2572" className="space-y-6">
          {/* Generate Button */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Formulaire 2572-SD - Relevé de solde IS
              </CardTitle>
              <CardDescription>
                Liquidation de l&apos;IS et des contributions assimilées pour l&apos;exercice clos le 30/11/{selectedYear}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Crédits d'impôt inputs */}
              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-semibold mb-3">Crédits d&apos;impôt imputables (optionnel)</h4>
                <p className="text-xs text-muted-foreground mb-3">
                  Renseignez vos crédits d&apos;impôt pour déduction de l&apos;IS. Laissez à 0 si aucun.
                </p>
                <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {Object.entries(credits2572).map(([key, value]) => {
                    const labels: Record<string, string> = {
                      creditImpotRecherche: 'CIR (Recherche)',
                      creditImpotInnovation: 'CII (Innovation)',
                      creditImpotCooperation: 'CCor (Coopération)',
                      creditImpotApprentissage: 'Apprentissage',
                      creditImpotFamille: 'CAF (Famille)',
                      creditImpotMEC: 'Mécénat',
                      creditImpotAutres: 'Autres',
                    }
                    return (
                      <div key={key}>
                        <Label className="text-xs">{labels[key]}</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={value}
                          onChange={(e) => setCredits2572({ ...credits2572, [key]: parseFloat(e.target.value) || 0 })}
                          className="mt-1"
                        />
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <Button onClick={generate2572} disabled={generating}>
                  {generating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Calculator className="h-4 w-4 mr-2" />}
                  Générer le 2572
                </Button>
                {form2572 && (
                  <Button variant="outline" onClick={copyAll2572ForImpots}>
                    {copiedAll2572 ? (
                      <><Check className="h-4 w-4 mr-2 text-green-600" /> Copié!</>
                    ) : (
                      <><Clipboard className="h-4 w-4 mr-2" /> Copier tout pour impots.gouv.fr</>
                    )}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* 2572 Result */}
          {form2572 && (
            <>
              {/* Company Header */}
              {settings && (
                <Card>
                  <CardContent className="py-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-lg">{settings.companyName}</h3>
                        <p className="text-sm text-muted-foreground">SIRET: {settings.companySIRET} | {settings.companyAddress}</p>
                        <p className="text-sm text-muted-foreground">
                          Exercice du 01/12/{form2572.year - 1} au 30/11/{form2572.year}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={form2572.status === 'filed' ? 'default' : 'secondary'}>
                          {form2572.status === 'filed' ? 'Déposé' : 'Brouillon'}
                        </Badge>
                        <a
                          href="https://cfspro.impots.gouv.fr"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
                        >
                          <ExternalLink className="h-3 w-3" />
                          impots.gouv.fr
                        </a>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Section 1: Résultat */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <span className="bg-blue-100 text-blue-800 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">I</span>
                    Résultat de l&apos;exercice
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span>Bénéfice net (ou déficit)<T text="C'est votre bénéfice (ou perte) de l'exercice, calculé automatiquement à partir de vos revenus moins vos dépenses. Si c'est négatif, vous avez un déficit." /></span>
                      <div className="flex items-center">
                        <span className={`font-mono font-semibold ${form2572.resultatNetBenefice >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                          {formatCurrency(form2572.resultatNetBenefice)}
                        </span>
                        {renderCopyBtn(form2572.resultatNetBenefice, 'benefice')}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Section 2 & 3: IS Calculation */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <span className="bg-blue-100 text-blue-800 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">II</span>
                    Calcul de l&apos;IS
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {/* Taux réduit */}
                    <div className="p-3 bg-emerald-50 rounded-lg">
                      <p className="text-sm font-medium text-emerald-800 mb-2">Taux réduit PME - 15% (sur les 42 500 premiers EUR)<T text="Les PME bénéficient d'un taux réduit de 15% d'IS sur les 42 500 premiers euros de bénéfice. Pour y bénéficier, votre chiffre d'affaires doit être inférieur à 10 M€." /></p>
                      <div className="flex justify-between items-center text-sm">
                        <span>Base imposable taux réduit</span>
                        <div className="flex items-center">
                          <span className="font-mono">{formatCurrency(form2572.baseTauxReduit)}</span>
                          {renderCopyBtn(form2572.baseTauxReduit, 'base_reduit')}
                        </div>
                      </div>
                      <div className="flex justify-between items-center text-sm font-semibold">
                        <span>IS au taux réduit (15%)</span>
                        <div className="flex items-center">
                          <span className="font-mono text-emerald-700">{formatCurrency(form2572.isTauxReduit)}</span>
                          {renderCopyBtn(form2572.isTauxReduit, 'is_reduit')}
                        </div>
                      </div>
                    </div>

                    {/* Taux normal */}
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <p className="text-sm font-medium text-blue-800 mb-2">Taux normal - 25% (au-delà de 42 500 EUR)<T text="Au-delà de 42 500 € de bénéfice, l'IS est calculé au taux normal de 25%." /></p>
                      <div className="flex justify-between items-center text-sm">
                        <span>Base imposable taux normal</span>
                        <div className="flex items-center">
                          <span className="font-mono">{formatCurrency(form2572.baseTauxNormal)}</span>
                          {renderCopyBtn(form2572.baseTauxNormal, 'base_normal')}
                        </div>
                      </div>
                      <div className="flex justify-between items-center text-sm font-semibold">
                        <span>IS au taux normal (25%)</span>
                        <div className="flex items-center">
                          <span className="font-mono text-blue-700">{formatCurrency(form2572.isTauxNormal)}</span>
                          {renderCopyBtn(form2572.isTauxNormal, 'is_normal')}
                        </div>
                      </div>
                    </div>

                    <Separator />

                    {/* Total IS */}
                    <div className="flex justify-between items-center text-lg font-bold">
                      <span>Total IS brut<T text="L'impôt total calculé avant déduction des éventuels crédits d'impôt." /></span>
                      <div className="flex items-center">
                        <span className="font-mono text-blue-600">{formatCurrency(form2572.totalISBrut)}</span>
                        {renderCopyBtn(form2572.totalISBrut, 'total_is_brut')}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Section 4: Crédits d'impôt */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <span className="bg-blue-100 text-blue-800 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">III</span>
                    Crédits d&apos;impôt imputables sur l&apos;IS <T text="Les crédits d'impôt réduisent directement le montant de votre IS. Contrairement aux réductions, ils sont remboursables si l'IS est inférieur au crédit." />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nature du crédit</TableHead>
                          <TableHead className="text-right">Montant</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {[
                          { label: 'CIR - Crédit impôt recherche', key: 'creditImpotRecherche', value: form2572.creditImpotRecherche, tooltip: 'Crédit d\'Impôt Recherche : aide pour les entreprises qui investissent en R&D. Jusqu\'à 30% des dépenses de recherche.' },
                          { label: 'CII - Crédit impôt innovation', key: 'creditImpotInnovation', value: form2572.creditImpotInnovation, tooltip: 'Crédit d\'Impôt Innovation : pour les PME qui innovent (prototypes, conception de nouveaux produits).' },
                          { label: 'CCor - Crédit impôt coopération', key: 'creditImpotCooperation', value: form2572.creditImpotCooperation },
                          { label: 'Crédit impôt apprentissage', key: 'creditImpotApprentissage', value: form2572.creditImpotApprentissage },
                          { label: 'CAF - Crédit impôt famille', key: 'creditImpotFamille', value: form2572.creditImpotFamille },
                          { label: 'MEC - Mécénat d\'entreprise', key: 'creditImpotMEC', value: form2572.creditImpotMEC },
                          { label: 'CICE (ancien)', key: 'creditImpotCompetitivite', value: form2572.creditImpotCompetitivite },
                          { label: 'Crédit agricole', key: 'creditImpotAgri', value: form2572.creditImpotAgri },
                          { label: 'Autres crédits', key: 'creditImpotAutres', value: form2572.creditImpotAutres },
                        ].map((row) => (
                          <TableRow key={row.key}>
                            <TableCell>{row.label}{row.tooltip && <T text={row.tooltip} />}</TableCell>
                            <TableCell className="text-right font-mono">
                              <div className="flex items-center justify-end">
                                {formatCurrency(row.value)}
                                {row.value > 0 && renderCopyBtn(row.value, row.key)}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                        <TableRow className="bg-muted font-bold">
                          <TableCell>TOTAL crédits d&apos;impôt</TableCell>
                          <TableCell className="text-right font-mono text-emerald-600">
                            <div className="flex items-center justify-end">
                              {formatCurrency(form2572.totalCreditsImpot)}
                              {renderCopyBtn(form2572.totalCreditsImpot, 'total_credits')}
                            </div>
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

              {/* Section 5: IS net */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <span className="bg-blue-100 text-blue-800 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">IV</span>
                    IS net après imputation
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Total IS brut</span>
                      <span className="font-mono">{formatCurrency(form2572.totalISBrut)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total crédits d&apos;impôt</span>
                      <span className="font-mono text-emerald-600">-{formatCurrency(form2572.totalCreditsImpot)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between font-bold text-lg">
                      <span>IS net<T text="L'IS que vous devez effectivement payer, après déduction des crédits d'impôt." /></span>
                      <div className="flex items-center">
                        <span className="font-mono text-blue-600">{formatCurrency(form2572.totalISNet)}</span>
                        {renderCopyBtn(form2572.totalISNet, 'is_net')}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Section 6: Acomptes */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <span className="bg-blue-100 text-blue-800 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">V</span>
                    Acomptes versés au titre de l&apos;exercice <T text="Les acomptes sont des paiements anticipés de l'IS, versés 4 fois par an (mars, juin, septembre, décembre). Ils sont calculés sur la base de l'IS de l'année précédente." />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Acompte</TableHead>
                          <TableHead className="text-right">Montant</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <TableRow>
                          <TableCell>1er acompte (15 mars {form2572.year})</TableCell>
                          <TableCell className="text-right font-mono">
                            <div className="flex items-center justify-end">
                              {formatCurrency(form2572.acompte1)}
                              {renderCopyBtn(form2572.acompte1, 'acompte1')}
                            </div>
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>2e acompte (15 juin {form2572.year})</TableCell>
                          <TableCell className="text-right font-mono">
                            <div className="flex items-center justify-end">
                              {formatCurrency(form2572.acompte2)}
                              {renderCopyBtn(form2572.acompte2, 'acompte2')}
                            </div>
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>3e acompte (15 sept. {form2572.year})</TableCell>
                          <TableCell className="text-right font-mono">
                            <div className="flex items-center justify-end">
                              {formatCurrency(form2572.acompte3)}
                              {renderCopyBtn(form2572.acompte3, 'acompte3')}
                            </div>
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>4e acompte (15 déc. {form2572.year})</TableCell>
                          <TableCell className="text-right font-mono">
                            <div className="flex items-center justify-end">
                              {formatCurrency(form2572.acompte4)}
                              {renderCopyBtn(form2572.acompte4, 'acompte4')}
                            </div>
                          </TableCell>
                        </TableRow>
                        <TableRow className="bg-muted font-bold">
                          <TableCell>Total acomptes versés</TableCell>
                          <TableCell className="text-right font-mono">
                            <div className="flex items-center justify-end">
                              {formatCurrency(form2572.totalAcomptes)}
                              {renderCopyBtn(form2572.totalAcomptes, 'total_acomptes')}
                            </div>
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

              {/* Section 7: Solde / Excédent */}
              <Card className={form2572.soldeAPayer > 0 ? 'border-red-200 bg-red-50' : 'border-emerald-200 bg-emerald-50'}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <span className="bg-blue-100 text-blue-800 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">VI</span>
                    Solde de l&apos;IS
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>IS net à payer</span>
                      <span className="font-mono">{formatCurrency(form2572.totalISNet)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Acomptes déjà versés</span>
                      <span className="font-mono text-emerald-600">-{formatCurrency(form2572.totalAcomptes)}</span>
                    </div>
                    <Separator />
                    {form2572.soldeAPayer > 0 ? (
                      <div className="flex justify-between font-bold text-xl text-red-700">
                        <span>SOLDE A PAYER<T text="Si l'IS net est supérieur aux acomptes déjà versés, vous devez payer la différence. C'est le solde de l'IS." /></span>
                        <div className="flex items-center">
                          <span className="font-mono">{formatCurrency(form2572.soldeAPayer)}</span>
                          {renderCopyBtn(form2572.soldeAPayer, 'solde')}
                        </div>
                      </div>
                    ) : (
                      <div className="flex justify-between font-bold text-xl text-emerald-700">
                        <span>EXCEDENT A REMBOURSER<T text="Si vos acomptes dépassent l'IS net, l'État vous rembourse la différence." /></span>
                        <div className="flex items-center">
                          <span className="font-mono">{formatCurrency(form2572.excedent)}</span>
                          {renderCopyBtn(form2572.excedent, 'excedent')}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    <Button variant="outline" onClick={save2572} disabled={saving}>
                      {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                      Enregistrer
                    </Button>
                    <Button onClick={copyAll2572ForImpots} variant="default" className="bg-blue-600 hover:bg-blue-700">
                      {copiedAll2572 ? (
                        <><Check className="h-4 w-4 mr-2" /> Copié!</>
                      ) : (
                        <><Clipboard className="h-4 w-4 mr-2" /> Copier tout pour impots.gouv.fr</>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {!form2572 && !loading && (
            <Card>
              <CardContent className="py-12 text-center">
                <FileText className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-lg font-medium">Aucun formulaire 2572 généré</p>
                <p className="text-muted-foreground mt-2">
                  Renseignez vos crédits d&apos;impôt éventuels puis cliquez sur Générer.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ============================================ */}
        {/* FORMULAIRE 2065 - DECLARATION DES BENEFICES */}
        {/* ============================================ */}
        <TabsContent value="2065" className="space-y-6">
          {/* Generate Button */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Formulaire 2065-SD - Déclaration des bénéfices
              </CardTitle>
              <CardDescription>
                Déclaration des bénéfices soumis à l&apos;IS pour l&apos;exercice clos le 30/11/{selectedYear}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Manual inputs */}
              <div className="grid md:grid-cols-2 gap-4">
                <div className="p-4 bg-muted rounded-lg">
                  <h4 className="font-semibold mb-3">Déficits reportables (optionnel)</h4>
                  <div className="space-y-2">
                    <div>
                      <Label className="text-xs">Déficit N-1</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={inputs2065.deficitAnterieurN1}
                        onChange={(e) => setInputs2065({ ...inputs2065, deficitAnterieurN1: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Déficit N-2</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={inputs2065.deficitAnterieurN2}
                        onChange={(e) => setInputs2065({ ...inputs2065, deficitAnterieurN2: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Déficits antérieurs</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={inputs2065.deficitAnterieurN3}
                        onChange={(e) => setInputs2065({ ...inputs2065, deficitAnterieurN3: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                  </div>
                </div>
                <div className="p-4 bg-muted rounded-lg">
                  <h4 className="font-semibold mb-3">Réintégrations / Déductions & Crédits</h4>
                  <div className="space-y-2">
                    <div>
                      <Label className="text-xs">Réintégrations neutralisées</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={inputs2065.reintegrationNeutralite}
                        onChange={(e) => setInputs2065({ ...inputs2065, reintegrationNeutralite: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Déductions neutralisées</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={inputs2065.deductionsNeutralite}
                        onChange={(e) => setInputs2065({ ...inputs2065, deductionsNeutralite: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">CIR (Crédit impôt recherche)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={inputs2065.creditImpotRecherche}
                        onChange={(e) => setInputs2065({ ...inputs2065, creditImpotRecherche: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">CII (Crédit impôt innovation)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={inputs2065.creditImpotInnovation}
                        onChange={(e) => setInputs2065({ ...inputs2065, creditImpotInnovation: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Autres crédits d&apos;impôt</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={inputs2065.creditImpotAutres}
                        onChange={(e) => setInputs2065({ ...inputs2065, creditImpotAutres: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <Button onClick={generate2065} disabled={generating}>
                  {generating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Calculator className="h-4 w-4 mr-2" />}
                  Générer le 2065
                </Button>
                {form2065 && (
                  <Button variant="outline" onClick={copyAll2065ForImpots}>
                    {copiedAll2065 ? (
                      <><Check className="h-4 w-4 mr-2 text-green-600" /> Copié!</>
                    ) : (
                      <><Clipboard className="h-4 w-4 mr-2" /> Copier tout pour impots.gouv.fr</>
                    )}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* 2065 Result */}
          {form2065 && (
            <>
              {/* Company Header */}
              {settings && (
                <Card>
                  <CardContent className="py-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-lg">{settings.companyName}</h3>
                        <p className="text-sm text-muted-foreground">SIRET: {settings.companySIRET} | SIREN: {settings.companySIREN}</p>
                        <p className="text-sm text-muted-foreground">
                          Exercice: {form2065.dateCloture} | Durée: {form2065.dureeExercice} mois | Régime: {form2065.regimeBenefice === 'RS' ? 'Réel Simplifié' : 'Réel Normal'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={form2065.status === 'filed' ? 'default' : 'secondary'}>
                          {form2065.status === 'filed' ? 'Déposé' : 'Brouillon'}
                        </Badge>
                        <a
                          href="https://cfspro.impots.gouv.fr"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
                        >
                          <ExternalLink className="h-3 w-3" />
                          impots.gouv.fr
                        </a>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Résultat comptable et fiscal */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Résultat comptable et fiscal</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span>Résultat comptable (Ligne 1)<T text="Votre bénéfice ou perte comptable, calculé à partir des revenus moins les charges de l'exercice." /></span>
                      <div className="flex items-center">
                        <span className="font-mono font-semibold">{formatCurrency(form2065.resultatComptable)}</span>
                        {renderCopyBtn(form2065.resultatComptable, 'resultat_comptable')}
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Réintégrations neutralisées<T text="Montants à rajouter au résultat comptable car ils ne sont pas déductibles fiscalement (ex: amendes, certains cadeaux)." /></span>
                      <div className="flex items-center">
                        <span className="font-mono">{formatCurrency(form2065.reintegrationNeutralite)}</span>
                        {renderCopyBtn(form2065.reintegrationNeutralite, 'reintegration')}
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Déductions neutralisées<T text="Montants à soustraire du résultat comptable car ils sont déductibles fiscalement mais pas comptablement." /></span>
                      <div className="flex items-center">
                        <span className="font-mono">{formatCurrency(form2065.deductionsNeutralite)}</span>
                        {renderCopyBtn(form2065.deductionsNeutralite, 'deductions')}
                      </div>
                    </div>
                    <Separator />
                    <div className="flex justify-between items-center font-bold text-lg">
                      <span>Résultat fiscal (Ligne 3)<T text="Le bénéfice qui sert de base au calcul de l'IS. Il peut différer du résultat comptable à cause des réintégrations et déductions." /></span>
                      <div className="flex items-center">
                        <span className={`font-mono ${form2065.resultatFiscal >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                          {formatCurrency(form2065.resultatFiscal)}
                        </span>
                        {renderCopyBtn(form2065.resultatFiscal, 'resultat_fiscal')}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Déficits */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Déficits reportables<T text="Les pertes des exercices précédents qui n'ont pas encore été déduites. Elles peuvent réduire votre bénéfice imposable." /></CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span>Déficit N-1 (Ligne 4)</span>
                      <div className="flex items-center">
                        <span className="font-mono">{formatCurrency(form2065.deficitAnterieurN1)}</span>
                        {renderCopyBtn(form2065.deficitAnterieurN1, 'deficit_n1')}
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Déficit N-2 (Ligne 5)</span>
                      <div className="flex items-center">
                        <span className="font-mono">{formatCurrency(form2065.deficitAnterieurN2)}</span>
                        {renderCopyBtn(form2065.deficitAnterieurN2, 'deficit_n2')}
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Déficits antérieurs (Ligne 6)</span>
                      <div className="flex items-center">
                        <span className="font-mono">{formatCurrency(form2065.deficitAnterieurN3)}</span>
                        {renderCopyBtn(form2065.deficitAnterieurN3, 'deficit_n3')}
                      </div>
                    </div>
                    <div className="flex justify-between items-center font-semibold">
                      <span>Total déficits reportables</span>
                      <span className="font-mono">{formatCurrency(form2065.totalDeficits)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between items-center font-semibold text-emerald-700">
                      <span>Déficits utilisés</span>
                      <div className="flex items-center">
                        <span className="font-mono">{formatCurrency(form2065.deficitUtilise)}</span>
                        {renderCopyBtn(form2065.deficitUtilise, 'deficit_utilise')}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Base imposable et IS */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Base imposable et calcul de l&apos;IS</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span>Base imposable (Ligne 7)<T text="Le bénéfice effectivement soumis à l'IS, après déduction des déficits antérieurs." /></span>
                      <div className="flex items-center">
                        <span className="font-mono font-bold text-lg">{formatCurrency(form2065.baseImposable)}</span>
                        {renderCopyBtn(form2065.baseImposable, 'base_imposable')}
                      </div>
                    </div>

                    <Separator />

                    <div className="p-3 bg-emerald-50 rounded-lg">
                      <p className="text-sm font-medium text-emerald-800">Taux réduit PME - 15%</p>
                      <div className="flex justify-between items-center text-sm">
                        <span>Base taux réduit</span>
                        <div className="flex items-center">
                          <span className="font-mono">{formatCurrency(form2065.baseTauxReduit)}</span>
                          {renderCopyBtn(form2065.baseTauxReduit, 'base_tr_15')}
                        </div>
                      </div>
                      <div className="flex justify-between items-center text-sm font-semibold">
                        <span>IS 15%</span>
                        <div className="flex items-center">
                          <span className="font-mono text-emerald-700">{formatCurrency(form2065.isTauxReduit)}</span>
                          {renderCopyBtn(form2065.isTauxReduit, 'is_15')}
                        </div>
                      </div>
                    </div>

                    <div className="p-3 bg-blue-50 rounded-lg">
                      <p className="text-sm font-medium text-blue-800">Taux normal - 25%</p>
                      <div className="flex justify-between items-center text-sm">
                        <span>Base taux normal</span>
                        <div className="flex items-center">
                          <span className="font-mono">{formatCurrency(form2065.baseTauxNormal)}</span>
                          {renderCopyBtn(form2065.baseTauxNormal, 'base_tr_25')}
                        </div>
                      </div>
                      <div className="flex justify-between items-center text-sm font-semibold">
                        <span>IS 25%</span>
                        <div className="flex items-center">
                          <span className="font-mono text-blue-700">{formatCurrency(form2065.isTauxNormal)}</span>
                          {renderCopyBtn(form2065.isTauxNormal, 'is_25')}
                        </div>
                      </div>
                    </div>

                    <Separator />

                    <div className="flex justify-between items-center font-bold text-lg">
                      <span>IS total brut</span>
                      <div className="flex items-center">
                        <span className="font-mono text-blue-600">{formatCurrency(form2065.isTotal)}</span>
                        {renderCopyBtn(form2065.isTotal, 'is_total')}
                      </div>
                    </div>

                    <Separator />

                    <div className="flex justify-between items-center">
                      <span>Crédits d&apos;impôt</span>
                      <div className="flex items-center">
                        <span className="font-mono text-emerald-600">-{formatCurrency(form2065.totalCreditsImpot)}</span>
                        {renderCopyBtn(form2065.totalCreditsImpot, 'credits_2065')}
                      </div>
                    </div>

                    <Separator />

                    <div className="flex justify-between items-center font-bold text-xl">
                      <span>IS net à payer</span>
                      <div className="flex items-center">
                        <span className="font-mono text-blue-600">{formatCurrency(form2065.isNet)}</span>
                        {renderCopyBtn(form2065.isNet, 'is_net_2065')}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Répartition géographique */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Répartition géographique des bénéfices</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span>Bénéfices imposables en France</span>
                      <div className="flex items-center">
                        <span className="font-mono">{formatCurrency(form2065.beneficeFrance)}</span>
                        {renderCopyBtn(form2065.beneficeFrance, 'benefice_fr')}
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Bénéfices imposables à l&apos;étranger</span>
                      <span className="font-mono">{formatCurrency(form2065.beneficeEtranger)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between font-semibold">
                      <span>Total bénéfices</span>
                      <span className="font-mono">{formatCurrency(form2065.totalBenefice)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Annexes */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Annexes à fournir</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {['2065-BIS', '2033-A', '2033-B', '2033-C', '2033-D', '2033-E', '2033-F', '2033-G', '2059-H', '2059-I', '2069-RCI', '2468'].map((annexe) => (
                      <Badge key={annexe} variant="outline">{annexe}</Badge>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Votre liasse fiscale générée depuis l&apos;onglet &quot;Liasse Fiscale&quot; couvre les formulaires 2033-A à 2033-G.
                  </p>
                </CardContent>
              </Card>

              {/* Action Buttons */}
              <Card className="border-blue-200 bg-blue-50">
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-blue-900">Prêt pour impots.gouv.fr ?</h4>
                      <p className="text-sm text-blue-700">
                        Copiez toutes les valeurs et collez-les dans le formulaire en ligne
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={save2065} disabled={saving}>
                        {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                        Enregistrer
                      </Button>
                      <Button onClick={copyAll2065ForImpots}>
                        {copiedAll2065 ? (
                          <><Check className="h-4 w-4 mr-2" /> Copié!</>
                        ) : (
                          <><Clipboard className="h-4 w-4 mr-2" /> Copier tout pour impots.gouv.fr</>
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {!form2065 && !loading && (
            <Card>
              <CardContent className="py-12 text-center">
                <FileText className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-lg font-medium">Aucun formulaire 2065 généré</p>
                <p className="text-muted-foreground mt-2">
                  Renseignez vos déficits et crédits d&apos;impôt puis cliquez sur Générer.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ============================================ */}
        {/* GUIDE SAISIE 2065 - miroir impots.gouv.fr  */}
        {/* ============================================ */}
        <TabsContent value="guide2065" className="space-y-6">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>Guide de saisie ligne par ligne.</strong> Ouvrez votre déclaration 2065 sur{' '}
              <a href="https://cfspro.impots.gouv.fr" target="_blank" rel="noopener noreferrer" className="underline font-medium text-blue-600">
                impots.gouv.fr
              </a>{' '}
              et copiez chaque valeur ci-dessous dans le champ correspondant. Les valeurs en{' '}
              <span className="bg-amber-50 text-amber-900 px-1 rounded font-mono text-xs">amber</span> sont des textes,
              les valeurs en{' '}
              <span className="bg-blue-50 text-blue-800 px-1 rounded font-mono text-xs">bleu</span> sont des montants en euros entiers.
            </AlertDescription>
          </Alert>

          {!form2065 || !settings ? (
            <Card>
              <CardContent className="py-12 text-center">
                <FileText className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-lg font-medium">Générez d&apos;abord le formulaire 2065</p>
                <p className="text-muted-foreground mt-2 text-sm">
                  Allez dans l&apos;onglet &quot;Formulaire 2065&quot;, renseignez les paramètres et cliquez sur Générer.
                </p>
              </CardContent>
            </Card>
          ) : (() => {
            const addr = parseAddress(settings.companyAddress)
            const isBenefice = form2065.resultatFiscal >= 0
            const beneficeNormal = isBenefice ? form2065.baseImposable : 0
            const deficit = isBenefice ? 0 : Math.abs(form2065.resultatFiscal)

            return (
              <>
                {/* IDENTIFICATION DE LA SOCIÉTÉ */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-blue-600" />
                      Identification de la société
                    </CardTitle>
                    <p className="text-xs text-muted-foreground">Haut du formulaire 2065 — coordonnées de votre société</p>
                  </CardHeader>
                  <CardContent className="space-y-0">
                    {renderGuideTextField('Forme juridique', 'SASU', 'g_forme_jur')}
                    {renderGuideTextField('N° d\'agrément', '', 'g_agrement')}
                    {renderGuideTextField('Dénomination', settings.companyName, 'g_denomination')}
                    {renderGuideTextField('Complément de désignation', '', 'g_complement_desig')}
                    {renderGuideTextField('Numéro, type et nom de voie', addr.street, 'g_voie')}
                    {renderGuideTextField('Complément de distribution', addr.complement, 'g_complement_distrib')}
                    {renderGuideTextField('Lieu-dit, hameau', '', 'g_lieu_dit')}
                    {renderGuideTextField('Code postal', addr.postalCode, 'g_cp')}
                    {renderGuideTextField('Ville', addr.city, 'g_ville')}
                    {renderGuideTextField('Pays', addr.country || 'FRANCE', 'g_pays')}
                    <div className="pt-2 text-xs text-muted-foreground">
                      <span className="font-medium">Adresse complète stockée :</span> {settings.companyAddress}
                    </div>
                  </CardContent>
                </Card>

                {/* IDENTIFICATION DU REPRÉSENTANT */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-blue-600" />
                      Identification du représentant (dirigeant)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-0">
                    {renderGuideTextField('Forme juridique ou titre', '', 'g_rep_forme')}
                    {renderGuideTextField('Nom et prénom ou dénomination', settings.presidentName || '', 'g_rep_nom')}
                    {renderGuideTextField('Qualité et fonction ou complément de dénomination', 'Président', 'g_rep_qualite')}
                    {renderGuideTextField('Numéro, type et nom de voie', addr.street, 'g_rep_voie')}
                    {renderGuideTextField('Complément de distribution', addr.complement, 'g_rep_complement')}
                    {renderGuideTextField('Lieu-dit, hameau', '', 'g_rep_lieu_dit')}
                    {renderGuideTextField('Code postal', addr.postalCode, 'g_rep_cp')}
                    {renderGuideTextField('Ville', addr.city, 'g_rep_ville')}
                  </CardContent>
                </Card>

                {/* QUESTIONS 3 & 4 */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Questions d&apos;identification</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-0">
                    {renderGuideLabel('3 - Avez-vous changé d\'adresse ? Si oui, indiquez l\'ancienne adresse', 'Non', 'gray')}
                    {renderGuideLabel('4 - Relevez-vous du régime fiscal des groupes ?', 'Non', 'gray')}
                  </CardContent>
                </Card>

                {/* B - ACTIVITÉS */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">B — Activités</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-0">
                    {renderGuideLabel('Si vous avez changé d\'activité, cochez la case', 'Non coché', 'gray')}
                    <div className="py-3 border-b border-gray-100">
                      <p className="text-sm text-gray-600 mb-1">Activités exercées (2 lignes)</p>
                      <div className="bg-yellow-50 border border-yellow-200 rounded p-3 text-sm text-yellow-800">
                        ⚠️ À remplir manuellement selon votre activité réelle (ex : <em>Conseil et services en informatique</em>).
                        Votre code APE / NAF peut vous aider.
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* C - RÉCAPITULATION */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">C — Récapitulation des éléments d&apos;imposition</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">

                    {/* C1 - Résultat fiscal */}
                    <div>
                      <p className="text-xs font-semibold uppercase text-gray-500 mb-2 pt-1">1 — Résultat fiscal</p>
                      {renderGuideAmountField('Bénéfice imposable au taux normal', beneficeNormal, 'g_c1_benefice_normal')}
                      {renderGuideAmountField('Bénéfice imposable à 15%', 0, 'g_c1_benefice_15')}
                      {renderGuideAmountField('Déficit (report du 2033-B)', deficit, 'g_c1_deficit')}
                      {renderGuideAmountField('Résultat net de cession, concession ou sous-concession de brevets imposable au taux de 10%', 0, 'g_c1_brevets_10')}
                    </div>

                    <Separator />

                    {/* C2 - Plus-values */}
                    <div>
                      <p className="text-xs font-semibold uppercase text-gray-500 mb-2">2 — Plus-values</p>
                      {renderGuideAmountField('Plus-values à long terme imposables à 15%', 0, 'g_c2_pv_15')}
                      {renderGuideAmountField('Plus-values à long terme imposables à 19%', 0, 'g_c2_pv_19')}
                      {renderGuideAmountField('Autres plus-values imposables à 19%', 0, 'g_c2_pv_autres_19')}
                      {renderGuideAmountField('Plus-values à long terme imposables à 0%', 0, 'g_c2_pv_0')}
                      {renderGuideAmountField('Plus-values exonérées (art. 238 quindecies)', 0, 'g_c2_pv_exo')}
                    </div>

                    <Separator />

                    {/* C3 - Abattements */}
                    <div>
                      <p className="text-xs font-semibold uppercase text-gray-500 mb-2">3 — Abattements sur le bénéfice et exonérations</p>
                      <div className="grid grid-cols-1 gap-0">
                        {renderGuideLabel('Entreprise nouvelle (art. 44 sexies)', 'Non coché', 'gray')}
                        {renderGuideLabel('Jeune entreprise innovante (art. 44 sexies-0 A)', 'Non coché', 'gray')}
                        {renderGuideLabel('Zone franche urbaine – Territoire entrepreneur (art. 44 octies A)', 'Non coché', 'gray')}
                        {renderGuideLabel('Bassins urbains à dynamiser – BUD (art. 44 sexdecies)', 'Non coché', 'gray')}
                        {renderGuideLabel('Zone de développement prioritaire (art. 44 septdecies)', 'Non coché', 'gray')}
                        {renderGuideLabel('Zone de revitalisation rurale (art. 44 quindecies)', 'Non coché', 'gray')}
                        {renderGuideLabel('Bassins d\'emploi à redynamiser (art. 44 duodecies)', 'Non coché', 'gray')}
                        {renderGuideLabel('Société d\'investissement immobilier côtée', 'Non coché', 'gray')}
                        {renderGuideLabel('France Ruralités Revitalisation FRR (art. 44 quindecies A)', 'Non coché', 'gray')}
                        {renderGuideLabel('Zone franche d\'activité nouvelle génération (art. 44 quaterdecies)', 'Non coché', 'gray')}
                        {renderGuideLabel('Zone de restructuration de la défense (art. 44 terdecies)', 'Non coché', 'gray')}
                        {renderGuideLabel('Autres dispositifs', 'Non coché', 'gray')}
                      </div>
                      {renderGuideAmountField('Bénéfice ou déficit exonéré (indiquer – en cas de déficit)', 0, 'g_c3_exo_benefice')}
                      {renderGuideAmountField('Plus-values exonérées relevant du taux de 15%', 0, 'g_c3_pv_exo_15')}
                    </div>

                    <Separator />

                    {/* C4 - Outre-mer */}
                    <div>
                      <p className="text-xs font-semibold uppercase text-gray-500 mb-2">4 — Option pour le crédit d&apos;impôt outre-mer</p>
                      {renderGuideLabel('Option crédit d\'impôt outre-mer secteur productif (art. 244 quater W)', 'Non coché', 'gray')}
                    </div>
                  </CardContent>
                </Card>

                {/* D - IMPUTATIONS */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">D — Imputations</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-0">
                    {renderGuideAmountField(
                      'Au titre des revenus mobiliers de source française ou étrangère, ayant donné lieu à la délivrance d\'un certificat de crédits d\'impôt',
                      form2065.precompteIS,
                      'g_d_revenus_mobiliers'
                    )}
                    {renderGuideAmountField(
                      'Au titre des revenus auxquels est attaché, en vertu d\'une convention fiscale, un crédit d\'impôt représentatif de l\'impôt étranger',
                      0,
                      'g_d_convention_fiscale'
                    )}
                  </CardContent>
                </Card>

                {/* E - REVENUS LOCATIFS */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">E — Contribution annuelle sur les revenus locatifs</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-0">
                    {renderGuideAmountField('Recettes nettes soumises à la contribution de 2,5%', 0, 'g_e_locatifs')}
                  </CardContent>
                </Card>

                {/* F - COMPTABILITÉ INFORMATISÉE */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">F — Comptabilité informatisée</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-0">
                    {renderGuideLabel('L\'entreprise dispose-t-elle d\'une comptabilité informatisée ?', 'Oui', 'green')}
                    {renderGuideTextField('Si oui, veuillez indiquer le logiciel utilisé', 'Parfait Invoicing', 'g_f_logiciel')}
                  </CardContent>
                </Card>

                {/* AUTRES INFORMATIONS */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Autres informations</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">

                    {/* ECF */}
                    <div>
                      <p className="text-xs font-semibold uppercase text-gray-500 mb-2">1 — Examen de conformité fiscale (ECF)</p>
                      {renderGuideLabel('Si la période déclarée a fait l\'objet d\'un examen de conformité fiscale (ECF), cochez la case', 'Non coché', 'gray')}
                    </div>

                    <Separator />

                    {/* Comptable */}
                    <div>
                      <p className="text-xs font-semibold uppercase text-gray-500 mb-2">2 — Coordonnées du comptable</p>
                      {renderGuideLabel('S\'agit-il d\'un comptable salarié (S) ou indépendant (I) ?', '— À remplir', 'gray')}
                      <div className="bg-gray-50 rounded p-3 text-sm text-gray-500 italic mt-2">
                        Remplissez les coordonnées de votre expert-comptable sur impots.gouv.fr si vous en avez un.
                        Ces informations ne sont pas stockées dans cette application.
                      </div>
                    </div>

                    <Separator />

                    {/* Conseil */}
                    <div>
                      <p className="text-xs font-semibold uppercase text-gray-500 mb-2">3 — Coordonnées du conseil</p>
                      {renderGuideLabel('S\'agit-il d\'un conseil salarié (S) ou indépendant (I) ?', '— À remplir', 'gray')}
                      <div className="bg-gray-50 rounded p-3 text-sm text-gray-500 italic mt-2">
                        Remplissez les coordonnées de votre conseiller fiscal sur impots.gouv.fr si applicable.
                      </div>
                    </div>

                    <Separator />

                    {/* CGA / OMGA */}
                    <div>
                      <p className="text-xs font-semibold uppercase text-gray-500 mb-2">4 — Coordonnées du CGA, de l&apos;OMGA ou du viseur conventionné</p>
                      {renderGuideLabel('Visa CGA/OMGA', 'Non coché', 'gray')}
                      {renderGuideLabel('Viseur conventionné', 'Non coché', 'gray')}
                    </div>
                  </CardContent>
                </Card>

                {/* Récapitulatif IS */}
                <Card className="border-blue-200 bg-blue-50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-blue-800">Récapitulatif IS calculé</CardTitle>
                    <p className="text-xs text-blue-700">
                      Ces valeurs ne sont pas dans le formulaire 2065 mais dans le 2572 (relevé de solde). Pour mémoire :
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-blue-700">Base imposable totale</span>
                      <span className="font-mono font-bold text-blue-900">{Math.round(form2065.baseImposable).toLocaleString('fr-FR')} €</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-blue-700">IS taux réduit 15% (sur {Math.round(form2065.baseTauxReduit).toLocaleString('fr-FR')} €)</span>
                      <span className="font-mono text-blue-900">{Math.round(form2065.isTauxReduit).toLocaleString('fr-FR')} €</span>
                    </div>
                    {form2065.isTauxNormal > 0 && (
                      <div className="flex justify-between">
                        <span className="text-blue-700">IS taux normal 25% (sur {Math.round(form2065.baseTauxNormal).toLocaleString('fr-FR')} €)</span>
                        <span className="font-mono text-blue-900">{Math.round(form2065.isTauxNormal).toLocaleString('fr-FR')} €</span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold border-t border-blue-200 pt-1 mt-1">
                      <span className="text-blue-900">IS NET À PAYER</span>
                      <span className="font-mono text-blue-900">{Math.round(form2065.isNet).toLocaleString('fr-FR')} €</span>
                    </div>
                  </CardContent>
                </Card>
              </>
            )
          })()}
        </TabsContent>

        {/* ============================================ */}
        {/* HISTORIQUE */}
        {/* ============================================ */}
        <TabsContent value="historique" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Historique des formulaires</CardTitle>
              <CardDescription>Tous vos formulaires 2572 et 2065 enregistrés</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="hist2572">
                <TabsList className="mb-4">
                  <TabsTrigger value="hist2572">Formulaire 2572</TabsTrigger>
                  <TabsTrigger value="hist2065">Formulaire 2065</TabsTrigger>
                </TabsList>
                <TabsContent value="hist2572">
                  {form2572List.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">Aucun formulaire 2572 enregistré</p>
                  ) : (
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Exercice</TableHead>
                            <TableHead className="text-right">IS Brut</TableHead>
                            <TableHead className="text-right">Crédits</TableHead>
                            <TableHead className="text-right">IS Net</TableHead>
                            <TableHead className="text-right">Acomptes</TableHead>
                            <TableHead className="text-right">Solde</TableHead>
                            <TableHead>Statut</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {form2572List.map((f) => (
                            <TableRow key={f.id}>
                              <TableCell className="font-medium">30/11/{f.year}</TableCell>
                              <TableCell className="text-right font-mono">{formatCurrency(f.totalISBrut)}</TableCell>
                              <TableCell className="text-right font-mono text-emerald-600">{formatCurrency(f.totalCreditsImpot)}</TableCell>
                              <TableCell className="text-right font-mono">{formatCurrency(f.totalISNet)}</TableCell>
                              <TableCell className="text-right font-mono">{formatCurrency(f.totalAcomptes)}</TableCell>
                              <TableCell className="text-right font-mono font-semibold">
                                {f.soldeAPayer > 0 ? (
                                  <span className="text-red-600">{formatCurrency(f.soldeAPayer)}</span>
                                ) : (
                                  <span className="text-emerald-600">{formatCurrency(f.excedent)}</span>
                                )}
                              </TableCell>
                              <TableCell>
                                <Badge variant={f.status === 'filed' ? 'default' : 'secondary'}>
                                  {f.status === 'filed' ? 'Déposé' : 'Brouillon'}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </TabsContent>
                <TabsContent value="hist2065">
                  {form2065List.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">Aucun formulaire 2065 enregistré</p>
                  ) : (
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Exercice</TableHead>
                            <TableHead className="text-right">Résultat fiscal</TableHead>
                            <TableHead className="text-right">Base imposable</TableHead>
                            <TableHead className="text-right">IS Total</TableHead>
                            <TableHead className="text-right">Crédits</TableHead>
                            <TableHead className="text-right">IS Net</TableHead>
                            <TableHead>Statut</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {form2065List.map((f) => (
                            <TableRow key={f.id}>
                              <TableCell className="font-medium">{f.dateCloture}</TableCell>
                              <TableCell className="text-right font-mono">{formatCurrency(f.resultatFiscal)}</TableCell>
                              <TableCell className="text-right font-mono">{formatCurrency(f.baseImposable)}</TableCell>
                              <TableCell className="text-right font-mono">{formatCurrency(f.isTotal)}</TableCell>
                              <TableCell className="text-right font-mono text-emerald-600">{formatCurrency(f.totalCreditsImpot)}</TableCell>
                              <TableCell className="text-right font-mono font-bold">{formatCurrency(f.isNet)}</TableCell>
                              <TableCell>
                                <Badge variant={f.status === 'filed' ? 'default' : 'secondary'}>
                                  {f.status === 'filed' ? 'Déposé' : 'Brouillon'}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
