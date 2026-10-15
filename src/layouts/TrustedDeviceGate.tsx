import { useCallback, useEffect, useRef, useState } from 'react'
import { LoaderCircle } from 'lucide-react'
import { Outlet, useNavigate } from 'react-router-dom'
import { checkTrustedDevice } from '../services/trustedDevices'
import { supabase } from '../services/supabase'

type GateStatus = 'checking' | 'verified' | 'error'

export default function TrustedDeviceGate() {
  const navigate = useNavigate()
  const requestId = useRef(0)
  const isRedirectingToVerification = useRef(false)
  const [status, setStatus] = useState<GateStatus>('checking')
  const [error, setError] = useState('')

  const checkDevice = useCallback(async () => {
    const currentRequestId = ++requestId.current

    try {
      const { data, error: sessionError } = await supabase.auth.getSession()
      if (sessionError) throw sessionError
      if (!data.session) {
        navigate('/login', { replace: true })
        return
      }

      // --- BYPASS TOTAL PARA CORREO DE OFICINA O ROL OFICIAL ---
      if (data.session.user.email?.toLowerCase() === 'oficinassutrato@zohomail.com') {
        setStatus('verified')
        return
      }

      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', data.session.user.id)

      if (!roleError && roleData) {
        const hasOfFisicaRole = roleData.some((r) => r.role === 'OfFisica')
        if (hasOfFisicaRole) {
          setStatus('verified')
          return
        }
      }
      // ---------------------------------

      const result = await checkTrustedDevice()
      if (requestId.current !== currentRequestId) return
      if (result.trusted) {
        setStatus('verified')
        return
      }
      if (!result.verificationRequired || !result.challengeId) {
        throw new Error('El servicio no devolvió una verificación válida para este dispositivo.')
      }
      isRedirectingToVerification.current = true
      const { error: signOutError } = await supabase.auth.signOut()
      if (signOutError) throw signOutError
      navigate('/login', {
        replace: true,
        state: {
          trustedDeviceChallenge: {
            challengeId: result.challengeId,
            email: result.email ?? data.session.user.email ?? '',
          },
        },
      })
    } catch (checkError) {
      if (requestId.current !== currentRequestId) return
      
      // Si ocurre un error (como fallo de SMTP), revisamos si el usuario actual es de oficina física
      try {
        const { data: sessionData } = await supabase.auth.getSession()
        if (sessionData?.session?.user?.email?.toLowerCase() === 'oficinassutrato@zohomail.com') {
          setStatus('verified')
          return
        }
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', sessionData?.session?.user?.id ?? '')
        
        if (roleData?.some((r) => r.role === 'OfFisica')) {
          setStatus('verified')
          return
        }
      } catch {
        // Ignorar error interno del respaldo
      }

      isRedirectingToVerification.current = false
      console.error('No se pudo verificar el dispositivo:', checkError)
      setError(checkError instanceof Error ? checkError.message : 'No se pudo verificar este dispositivo.')
      setStatus('error')
    }
  }, [navigate])

  useEffect(() => {
    const checkRequest = window.setTimeout(() => void checkDevice(), 0)
    const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT' && !isRedirectingToVerification.current) navigate('/login', { replace: true })
    })
    return () => {
      window.clearTimeout(checkRequest)
      requestId.current += 1
      authListener.subscription.unsubscribe()
    }
  }, [checkDevice, navigate])

  if (status === 'verified') return <Outlet />
  if (status === 'checking') {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <p className="flex items-center gap-2 text-sm text-slate-600"><LoaderCircle size={18} className="animate-spin" /> Verificando dispositivo...</p>
      </main>
    )
  }
  if (status === 'error') {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-8">
        <section role="alert" className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
          <h1 className="text-lg font-semibold text-slate-900">No se pudo verificar el dispositivo</h1>
          <p className="mt-2 text-sm text-rose-700">{error}</p>
          <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button type="button" onClick={() => void supabase.auth.signOut()} className="h-10 rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-600">Cerrar sesión</button>
            <button type="button" onClick={() => { setStatus('checking'); setError(''); void checkDevice() }} className="h-10 rounded-lg bg-primary-600 px-4 text-sm font-semibold text-white hover:bg-primary-700">Reintentar</button>
          </div>
        </section>
      </main>
    )
  }

  return <Outlet />
}