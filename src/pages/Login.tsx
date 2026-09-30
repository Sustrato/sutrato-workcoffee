import { useState, type FormEvent } from 'react'
import { ArrowRight, LockKeyhole, LoaderCircle, Mail, ShieldCheck } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import { supabase } from '../services/supabase'

export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrorMessage('')
    setIsSubmitting(true)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })

      if (error) {
        setErrorMessage(error.message || 'No se pudo iniciar sesión. Verifica tus credenciales.')
        return
      }

      if (data.session) navigate('/dashboard', { replace: true })
      else setErrorMessage('No se pudo iniciar sesión. Intenta nuevamente.')
    } catch (authError) {
      console.error('Error al iniciar sesión:', authError)
      setErrorMessage('No fue posible conectar con el servicio de autenticación. Intenta nuevamente.')
    } finally {
      setIsSubmitting(false)
    }
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
              <p className="text-xs text-blue-100">Gestión de planillas</p>
            </div>
          </div>

          <div className="my-12 max-w-md">
            <p className="mb-4 text-sm font-semibold uppercase tracking-[0.16em] text-blue-200">
              Todo en un lugar
            </p>
            <h1 className="text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
              Crea tus planillas de forma automatizada, sin perder tiempo.
            </h1>
            <p className="mt-5 max-w-sm text-sm leading-6 text-blue-100 sm:text-base">
              Crea y consulta planillas, organiza y accede a tus archivos desde un solo espacio.
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
                Ingresa tus credenciales para acceder a tus planillas.
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
                    disabled={isSubmitting}
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
                    type="password"
                    autoComplete="current-password"
                    required
                    disabled={isSubmitting}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Ingresa tu contraseña"
                    className="h-11 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                  />
                </div>
              </div>

              {errorMessage && (
                <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700">
                  {errorMessage}
                </p>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 text-sm font-semibold text-white shadow-sm shadow-primary-600/20 transition hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:cursor-wait disabled:opacity-70"
              >
                {isSubmitting ? 'Validando acceso...' : 'Iniciar sesión'}
                {isSubmitting ? <LoaderCircle size={17} className="animate-spin" /> : <ArrowRight size={17} />}
              </button>
            </form>

            <p className="mt-6 text-center text-xs leading-5 text-slate-500">
              Tus credenciales se validan de forma segura mediante Supabase.
            </p>
          </div>
        </section>
      </div>
    </main>
  )
}