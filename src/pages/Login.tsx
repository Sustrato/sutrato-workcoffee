import { useState, type FormEvent } from 'react'
import { ArrowRight, Eye, EyeOff, LockKeyhole, LoaderCircle, Mail, ShieldCheck, X } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../services/supabase'
import { checkTrustedDevice, verifyTrustedDevice } from '../services/trustedDevices'

interface TrustedDeviceChallenge {
  challengeId: string
  email: string
}

interface LoginRouteState {
  trustedDeviceChallenge?: TrustedDeviceChallenge
}

export default function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const routeChallenge = (location.state as LoginRouteState | null)?.trustedDeviceChallenge
  const [email, setEmail] = useState(routeChallenge?.email ?? '')
  const [password, setPassword] = useState('')
  const [isPasswordVisible, setIsPasswordVisible] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [verification, setVerification] = useState<TrustedDeviceChallenge | null>(routeChallenge ?? null)
  const [verificationCode, setVerificationCode] = useState('')
  const [verificationError, setVerificationError] = useState('')
  const [verificationSuccess, setVerificationSuccess] = useState('')
  const [isVerifying, setIsVerifying] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrorMessage('')
    setIsSubmitting(true)
    let sessionCreated = false

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })

      if (error) {
        setErrorMessage(error.message || 'No se pudo iniciar sesión. Verifica tus credenciales.')
        return
      }

      if (!data.session) {
        setErrorMessage('No se pudo iniciar sesión. Intenta nuevamente.')
        return
      }

      sessionCreated = true

      // --- BYPASS TOTAL PARA CORREO DE OFICINA O ROL OFICIAL ---
      if (email.trim().toLowerCase() === 'oficinassutrato@zohomail.com') {
        navigate('/dashboard', { replace: true })
        return
      }

      try {
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', data.session.user.id)

        const isOfFisica = roleData?.some((r) => r.role === 'OfFisica')
        if (isOfFisica) {
          navigate('/dashboard', { replace: true })
          return
        }

        const deviceStatus = await checkTrustedDevice()
        if (deviceStatus.trusted) {
          navigate('/dashboard', { replace: true })
          return
        }

        if (!deviceStatus.verificationRequired || !deviceStatus.challengeId) {
          throw new Error('El servicio no devolvió una verificación válida para este dispositivo.')
        }

        const { error: signOutError } = await supabase.auth.signOut()
        if (signOutError) throw signOutError
        sessionCreated = false

        setVerification({ challengeId: deviceStatus.challengeId, email: deviceStatus.email ?? data.session.user.email ?? '' })
        setVerificationCode('')
        setVerificationError('')
        setVerificationSuccess('')
        return
      } catch (deviceCheckError) {
        // Si la función falla por falta de SMTP o red, permitimos el paso si es OfFisica
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', data.session.user.id)

        const isOfFisica = roleData?.some((r) => r.role === 'OfFisica')
        if (isOfFisica) {
          navigate('/dashboard', { replace: true })
          return
        }

        throw deviceCheckError
      }
    } catch (authError) {
      console.error('Error al iniciar sesión:', authError)
      if (sessionCreated) {
        const { error: signOutError } = await supabase.auth.signOut()
        if (signOutError) console.error('No se pudo cerrar la sesión sin verificar:', signOutError)
      }
      setErrorMessage(authError instanceof Error ? authError.message : 'No fue posible conectar con el servicio de autenticación. Intenta nuevamente.')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleVerificationSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!verification || verificationCode.length !== 6 || isVerifying) return

    setIsVerifying(true)
    setVerificationError('')
    setVerificationSuccess('')
    let sessionCreated = false

    try {
      await verifyTrustedDevice(verification.challengeId, verificationCode)
      setVerification(null)
      setVerificationCode('')
      navigate(location.pathname, { replace: true, state: null })

      if (!password) {
        setVerificationSuccess('Dispositivo verificado. Ingresa tus credenciales para continuar.')
        return
      }

      setIsSubmitting(true)
      setVerificationSuccess('Dispositivo verificado. Completando el inicio de sesión...')

      try {
        const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
        if (error) throw new Error(error.message || 'No se pudo completar el inicio de sesión.')
        if (!data.session) throw new Error('No se pudo completar el inicio de sesión. Intenta nuevamente.')
        sessionCreated = true

        const deviceStatus = await checkTrustedDevice()
        if (!deviceStatus.trusted) throw new Error('No se pudo confirmar el dispositivo después de validarlo.')

        navigate('/dashboard', { replace: true })
      } catch (reauthError) {
        if (sessionCreated) {
          const { error: signOutError } = await supabase.auth.signOut()
          if (signOutError) console.error('No se pudo cerrar la sesión sin verificar:', signOutError)
        }
        setVerificationSuccess('Dispositivo verificado. Ingresa tus credenciales para continuar.')
        setErrorMessage(reauthError instanceof Error ? reauthError.message : 'No se pudo completar el inicio de sesión.')
      } finally {
        setIsSubmitting(false)
      }
    } catch (verifyError) {
      console.error('No se pudo confirmar el código de verificación:', verifyError)
      setVerificationError(verifyError instanceof Error ? verifyError.message : 'No se pudo confirmar el código.')
    } finally {
      setIsVerifying(false)
    }
  }

  function closeVerification() {
    setVerification(null)
    setVerificationCode('')
    setVerificationError('')
    navigate(location.pathname, { replace: true, state: null })
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10 sm:px-6">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-900/[0.06] lg:min-h-[620px] lg:grid-cols-[1.05fr_0.95fr]">
        <section className="flex flex-col justify-between bg-primary-700 p-8 text-white sm:p-12 lg:p-14">
          <div className="flex items-center gap-3">
            <div className="flex h-11 items-center justify-center overflow-hidden rounded-xl bg-white/15 px-2 ring-1 ring-white/20">
              <img 
                src="/Sustrato Logo.png" 
                alt="Sutrato Logo" 
                className="h-8 w-auto object-contain" 
              />
            </div>
            <div>
              <p className="text-base font-bold tracking-tight">Sutrato WorkCoffee</p>
              <p className="text-xs text-blue-100">Gestión Administrativa</p>
            </div>
          </div>
          <div className="my-12 max-w-md">
            <p className="mb-4 text-sm font-semibold uppercase tracking-[0.16em] text-blue-200">
              PLATAFORMA INTEGRAL DE GESTIÓN
            </p>
            <h1 className="text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
              Control Administrativo y Financiero
            </h1>
            <p className="mt-5 max-w-sm text-sm leading-6 text-blue-100 sm:text-base">
              Controla empresas, contratos, flujos mensuales, anuales y reportes gerenciales desde un solo lugar.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-blue-100">
            <ShieldCheck size={16} />
            <span>Acceso seguro a la documentación de tu empresa</span>
          </div>
        </section>
        <section className="flex items-center justify-center px-6 py-10 sm:px-12 lg:px-14">
          <div className="w-full max-w-sm">
            <div className="mb-8">
              <h2 className="text-2xl font-bold tracking-tight text-slate-900">Iniciar sesión</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Ingresa tus credenciales para acceder.
              </p>
            </div>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="email" className="mb-2 block text-sm font-medium text-slate-700">
                  Correo electrónico
                </label>
                <div className="relative">
                  <Mail size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    disabled={isSubmitting || Boolean(verification)}
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="nombre@empresa.cl"
                    className="h-11 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="password" className="mb-2 block text-sm font-medium text-slate-700">
                  Contraseña
                </label>
                <div className="relative">
                  <LockKeyhole size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    id="password"
                    name="password"
                    type={isPasswordVisible ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    disabled={isSubmitting || Boolean(verification)}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Ingresa tu contraseña"
                    className="h-11 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-11 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                  />
                  <button
                    type="button"
                    onClick={() => setIsPasswordVisible((visible) => !visible)}
                    disabled={isSubmitting || Boolean(verification)}
                    aria-label={isPasswordVisible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    aria-pressed={isPasswordVisible}
                    className="absolute right-2 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-md text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:cursor-wait disabled:opacity-50"
                  >
                    {isPasswordVisible ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </div>
              {errorMessage && (
                <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700">
                  {errorMessage}
                </p>
              )}
              {verificationSuccess && <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-700">{verificationSuccess}</p>}
              <button
                type="submit"
                disabled={isSubmitting || Boolean(verification)}
                className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 text-sm font-semibold text-white shadow-sm shadow-primary-600/20 transition hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:cursor-wait disabled:opacity-70"
              >
                {isSubmitting ? 'Validando acceso...' : 'Iniciar sesión'}
                {isSubmitting ? <LoaderCircle size={17} className="animate-spin" /> : <ArrowRight size={17} />}
              </button>
            </form>
            <p className="mt-6 text-center text-xs leading-5 text-slate-500">
              Tus credenciales se validan de forma segura mediante Supabase. Los dispositivos nuevos requieren un código enviado a tu correo.
            </p>
          </div>
        </section>
      </div>
      {verification && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-slate-950/55 p-4 backdrop-blur-[2px]">
          <section role="alertdialog" aria-modal="true" aria-labelledby="trusted-device-title" aria-describedby="trusted-device-description" className="my-auto w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-100 px-5 py-5 sm:px-6">
              <div className="flex items-start gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-700"><ShieldCheck size={20} /></span>
                <div>
                  <h2 id="trusted-device-title" className="text-lg font-semibold text-slate-900">Verifica este dispositivo</h2>
                  <p id="trusted-device-description" className="mt-1 text-sm leading-5 text-slate-500">Enviamos un código de seguridad a {verification.email || 'tu correo registrado'}.</p>
                </div>
              </div>
              <button type="button" onClick={closeVerification} disabled={isVerifying} aria-label="Cerrar verificación" className="flex size-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50">
                <X size={19} />
              </button>
            </div>
            <form onSubmit={handleVerificationSubmit} className="space-y-5 px-5 py-5 sm:px-6">
              <div>
                <label htmlFor="trusted-device-code" className="mb-1.5 block text-sm font-medium text-slate-700">Código de verificación</label>
                <div className="relative">
                  <LockKeyhole size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    id="trusted-device-code"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    required
                    value={verificationCode}
                    onChange={(event) => setVerificationCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                    disabled={isVerifying}
                    placeholder="Ingresa los 6 dígitos"
                    className="h-11 w-full rounded-lg border border-slate-200 pl-10 pr-3 text-sm tracking-[0.2em] text-slate-800 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 disabled:bg-slate-50"
                  />
                </div>
              </div>
              {verificationError && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700">{verificationError}</p>}
              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button type="button" onClick={closeVerification} disabled={isVerifying} className="h-10 rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-600 disabled:opacity-50">Volver al inicio de sesión</button>
                <button type="submit" disabled={isVerifying || verificationCode.length !== 6} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 text-sm font-semibold text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50">
                  {isVerifying ? <LoaderCircle size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
                  {isVerifying ? 'Verificando...' : 'Verificar y continuar'}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </main>
  )
}