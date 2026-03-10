'use client'

import { Suspense, useEffect, useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { 
  Loader2, 
  Mail, 
  Lock, 
  User, 
  AlertCircle, 
  Building2,
  CheckCircle
} from 'lucide-react'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl') || '/'
  const tabParam = searchParams.get('tab')

  const [canRegister, setCanRegister] = useState<boolean | null>(null)
  const [checkingRegistration, setCheckingRegistration] = useState(true)
  const [activeTab, setActiveTab] = useState(tabParam === 'register' ? 'register' : 'login')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Login form
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')

  // Register form
  const [registerName, setRegisterName] = useState('')
  const [registerEmail, setRegisterEmail] = useState('')
  const [registerPassword, setRegisterPassword] = useState('')
  const [registerConfirmPassword, setRegisterConfirmPassword] = useState('')

  // Check if registration is available
  useEffect(() => {
    async function checkRegistration() {
      try {
        const res = await fetch('/api/auth/check-registration')
        const data = await res.json()
        setCanRegister(data.canRegister)
        // If can't register and on register tab, switch to login
        if (!data.canRegister && tabParam === 'register') {
          setActiveTab('login')
        }
      } catch {
        setCanRegister(false)
      } finally {
        setCheckingRegistration(false)
      }
    }
    checkRegistration()
  }, [tabParam])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const result = await signIn('credentials', {
        email: loginEmail,
        password: loginPassword,
        redirect: false,
      })

      if (result?.error) {
        setError('Email ou mot de passe incorrect')
      } else {
        router.push(callbackUrl)
        router.refresh()
      }
    } catch {
      setError('Une erreur est survenue')
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    if (registerPassword !== registerConfirmPassword) {
      setError('Les mots de passe ne correspondent pas')
      setLoading(false)
      return
    }

    if (registerPassword.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères')
      setLoading(false)
      return
    }

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: registerName,
          email: registerEmail,
          password: registerPassword,
        }),
      })

      const data = await res.json()

      if (data.error) {
        setError(data.error)
      } else {
        setSuccess('Compte créé avec succès ! Vous pouvez maintenant vous connecter.')
        setActiveTab('login')
        setLoginEmail(registerEmail)
        setCanRegister(false) // Disable registration after successful creation
      }
    } catch {
      setError('Une erreur est survenue')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true)
    setError('')
    await signIn('google', { callbackUrl })
  }

  // Show loading while checking registration status
  if (checkingRegistration) {
    return (
      <Card className="shadow-xl border-0">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="shadow-xl border-0">
      <CardHeader className="space-y-1 pb-4">
        {canRegister ? (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Connexion</TabsTrigger>
              <TabsTrigger value="register">Inscription</TabsTrigger>
            </TabsList>
          </Tabs>
        ) : (
          <div className="text-center py-2">
            <h2 className="text-xl font-semibold">Connexion</h2>
          </div>
        )}
      </CardHeader>

      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="mb-4 border-emerald-200 bg-emerald-50">
            <CheckCircle className="h-4 w-4 text-emerald-600" />
            <AlertDescription className="text-emerald-800">{success}</AlertDescription>
          </Alert>
        )}

        {/* Login Form - Always visible */}
        {canRegister ? (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsContent value="login" className="space-y-4">
              <LoginFormContent 
                loginEmail={loginEmail}
                setLoginEmail={setLoginEmail}
                loginPassword={loginPassword}
                setLoginPassword={setLoginPassword}
                loading={loading}
                handleLogin={handleLogin}
                handleGoogleSignIn={handleGoogleSignIn}
                googleLoading={googleLoading}
              />
            </TabsContent>

            <TabsContent value="register" className="space-y-4">
              <RegisterFormContent
                registerName={registerName}
                setRegisterName={setRegisterName}
                registerEmail={registerEmail}
                setRegisterEmail={setRegisterEmail}
                registerPassword={registerPassword}
                setRegisterPassword={setRegisterPassword}
                registerConfirmPassword={registerConfirmPassword}
                setRegisterConfirmPassword={setRegisterConfirmPassword}
                loading={loading}
                handleRegister={handleRegister}
                handleGoogleSignIn={handleGoogleSignIn}
                googleLoading={googleLoading}
              />
            </TabsContent>
          </Tabs>
        ) : (
          <div className="space-y-4">
            <LoginFormContent 
              loginEmail={loginEmail}
              setLoginEmail={setLoginEmail}
              loginPassword={loginPassword}
              setLoginPassword={setLoginPassword}
              loading={loading}
              handleLogin={handleLogin}
              handleGoogleSignIn={handleGoogleSignIn}
              googleLoading={googleLoading}
            />
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Separate login form content component
function LoginFormContent({
  loginEmail,
  setLoginEmail,
  loginPassword,
  setLoginPassword,
  loading,
  handleLogin,
  handleGoogleSignIn,
  googleLoading
}: {
  loginEmail: string
  setLoginEmail: (v: string) => void
  loginPassword: string
  setLoginPassword: (v: string) => void
  loading: boolean
  handleLogin: (e: React.FormEvent) => void
  handleGoogleSignIn: () => void
  googleLoading: boolean
}) {
  return (
    <>
      <form onSubmit={handleLogin} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="login-email">Email</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              id="login-email"
              type="email"
              placeholder="email@exemple.com"
              value={loginEmail}
              onChange={(e) => setLoginEmail(e.target.value)}
              className="pl-10"
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="login-password">Mot de passe</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              id="login-password"
              type="password"
              placeholder="••••••••"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              className="pl-10"
              required
            />
          </div>
        </div>

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : null}
          Se connecter
        </Button>
      </form>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <Separator className="w-full" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-white px-2 text-muted-foreground">Ou</span>
        </div>
      </div>

      <Button 
        variant="outline" 
        className="w-full" 
        onClick={handleGoogleSignIn}
        disabled={googleLoading}
      >
        {googleLoading ? (
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
        ) : (
          <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="currentColor"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="currentColor"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="currentColor"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
        )}
        Continuer avec Google
      </Button>
    </>
  )
}

// Separate register form content component
function RegisterFormContent({
  registerName,
  setRegisterName,
  registerEmail,
  setRegisterEmail,
  registerPassword,
  setRegisterPassword,
  registerConfirmPassword,
  setRegisterConfirmPassword,
  loading,
  handleRegister,
  handleGoogleSignIn,
  googleLoading
}: {
  registerName: string
  setRegisterName: (v: string) => void
  registerEmail: string
  setRegisterEmail: (v: string) => void
  registerPassword: string
  setRegisterPassword: (v: string) => void
  registerConfirmPassword: string
  setRegisterConfirmPassword: (v: string) => void
  loading: boolean
  handleRegister: (e: React.FormEvent) => void
  handleGoogleSignIn: () => void
  googleLoading: boolean
}) {
  return (
    <>
      <form onSubmit={handleRegister} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="register-name">Nom complet</Label>
          <div className="relative">
            <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              id="register-name"
              type="text"
              placeholder="Jean Dupont"
              value={registerName}
              onChange={(e) => setRegisterName(e.target.value)}
              className="pl-10"
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="register-email">Email</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              id="register-email"
              type="email"
              placeholder="email@exemple.com"
              value={registerEmail}
              onChange={(e) => setRegisterEmail(e.target.value)}
              className="pl-10"
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="register-password">Mot de passe</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              id="register-password"
              type="password"
              placeholder="••••••••"
              value={registerPassword}
              onChange={(e) => setRegisterPassword(e.target.value)}
              className="pl-10"
              required
              minLength={6}
            />
          </div>
          <p className="text-xs text-muted-foreground">Minimum 6 caractères</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="register-confirm">Confirmer le mot de passe</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              id="register-confirm"
              type="password"
              placeholder="••••••••"
              value={registerConfirmPassword}
              onChange={(e) => setRegisterConfirmPassword(e.target.value)}
              className="pl-10"
              required
            />
          </div>
        </div>

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : null}
          Créer mon compte
        </Button>
      </form>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <Separator className="w-full" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-white px-2 text-muted-foreground">Ou</span>
        </div>
      </div>

      <Button 
        variant="outline" 
        className="w-full" 
        onClick={handleGoogleSignIn}
        disabled={googleLoading}
      >
        {googleLoading ? (
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
        ) : (
          <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="currentColor"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="currentColor"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="currentColor"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
        )}
        Continuer avec Google
      </Button>
    </>
  )
}

function LoginLoading() {
  return (
    <Card className="shadow-xl border-0">
      <CardContent className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </CardContent>
    </Card>
  )
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4">
      <div className="w-full max-w-md">
        {/* Logo/Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl mb-4 shadow-lg">
            <Building2 className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Parfait Invoicing</h1>
          <p className="text-gray-500 mt-1">Votre comptabilité SASU simplifiée</p>
        </div>

        <Suspense fallback={<LoginLoading />}>
          <LoginForm />
        </Suspense>

        <p className="text-center text-xs text-gray-500 mt-4">
          Application privée - Accès réservé
        </p>
      </div>
    </div>
  )
}
