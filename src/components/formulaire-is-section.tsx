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
  FileText, Download, Loader2, Calculator, Building2, Euro,
  AlertCircle, CheckCircle, Info, Copy, Check, Clipboard,
  ExternalLink, RefreshCw, Save, HelpCircle
} from 'lucide-react'

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

  const fetchForms = async () => {
    setLoading(true)
    try {
      const [res2572, res2065] = await Promise.all([
        fetch('/api/formulaire-2572'),
        fetch('/api/formulaire-2065'),
      ])
      const data2572 = await res2572.json()
      const data2065 = await res2065.json()
      setForm2572List(data2572.formulaires || [])
      setForm2065List(data2065.formulaires || [])
      if (data2572.formulaires?.length > 0) {
        setForm2572(data2572.formulaires[0])
        setSelectedYear(data2572.formulaires[0].year)
      }
      if (data2065.formulaires?.length > 0) {
        setForm2065(data2065.formulaires[0])
      }
    } catch (error) {
      console.error('Error fetching forms:', error)
    } finally {
      setLoading(false)
    }
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
        fetchForms()
        alert(`Formulaire 2572 généré pour l'exercice ${selectedYear}!`)
      } else {
        alert('Erreur: ' + (data.error || 'Erreur inconnue'))
      }
    } catch (error) {
      console.error('Error generating 2572:', error)
      alert('Erreur lors de la génération')
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
        fetchForms()
        alert(`Formulaire 2065 généré pour l'exercice ${selectedYear}!`)
      } else {
        alert('Erreur: ' + (data.error || 'Erreur inconnue'))
      }
    } catch (error) {
      console.error('Error generating 2065:', error)
      alert('Erreur lors de la génération')
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
        alert('Formulaire 2572 mis à jour!')
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
        alert('Formulaire 2065 mis à jour!')
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
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
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
