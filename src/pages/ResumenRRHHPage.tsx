import { useEffect, useState } from 'react'
import { supabase } from '../services/supabase'

type Stats = {
  personas: number
  trabajadores: number
  practicantes: number
  externos: number
}

const EMPTY_STATS: Stats = {
  personas: 0,
  trabajadores: 0,
  practicantes: 0,
  externos: 0
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message

  if (
    error &&
    typeof error === 'object' &&
    'message' in error
  ) {
    return String(error.message)
  }

  return 'Ocurrió un error inesperado.'
}

export default function ResumenRRHHPage() {
  const [stats, setStats] = useState<Stats>(EMPTY_STATS)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    void fetchStats()
  }, [])

  async function fetchStats() {
    setIsLoading(true)
    setErrorMessage('')

    try {
      const [
        personasResult,
        trabajadoresResult,
        practicantesResult,
        externosResult
      ] = await Promise.all([
        supabase
          .from('rrhh_personas')
          .select('id', {
            count: 'exact',
            head: true
          }),

        supabase
          .from('rrhh_personas')
          .select('id', {
            count: 'exact',
            head: true
          })
          .in('type', ['trabajador', 'trabajadores']),

        supabase
          .from('rrhh_personas')
          .select('id', {
            count: 'exact',
            head: true
          })
          .in('type', ['practicante', 'practicantes']),

        supabase
          .from('rrhh_personas')
          .select('id', {
            count: 'exact',
            head: true
          })
          .in('type', ['externo', 'externos'])
      ])

      if (personasResult.error) throw personasResult.error
      if (trabajadoresResult.error) throw trabajadoresResult.error
      if (practicantesResult.error) throw practicantesResult.error
      if (externosResult.error) throw externosResult.error

      setStats({
        personas: personasResult.count ?? 0,
        trabajadores: trabajadoresResult.count ?? 0,
        practicantes: practicantesResult.count ?? 0,
        externos: externosResult.count ?? 0
      })
    } catch (error) {
      console.error('Error al cargar métricas de RRHH:', error)
      setErrorMessage(getErrorMessage(error))
    } finally {
      setIsLoading(false)
    }
  }

  const cards = [
    {
      title: 'Personas registradas',
      value: stats.personas
    },
    {
      title: 'Trabajadores',
      value: stats.trabajadores
    },
    {
      title: 'Practicantes',
      value: stats.practicantes
    },
    {
      title: 'Externos',
      value: stats.externos
    }
  ]

  return (
    <div className="space-y-6 font-sans">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-black text-amber-900">
            Panel de gestión de personas
          </h1>

          <p className="text-xs text-slate-500 mt-1">
            Centraliza contratos, prácticas, honorarios, pagos,
            horas y documentos.
          </p>
        </div>

        <button
          type="button"
          disabled={isLoading}
          onClick={() => void fetchStats()}
          className="px-4 py-2 bg-[#d9b354] rounded-xl text-xs font-bold shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Actualizando...' : 'Actualizar'}
        </button>
      </div>

      {errorMessage && (
        <div
          role="alert"
          className="bg-red-50 border border-red-200 rounded-xl p-4 text-xs text-red-700"
        >
          No se pudieron cargar las estadísticas: {errorMessage}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map(card => (
          <div
            key={card.title}
            className="bg-white p-5 rounded-2xl border border-[#ddd4c3]"
          >
            <span>{card.title}</span>

            <strong className="block text-3xl font-black mt-2">
              {isLoading
                ? '...'
                : errorMessage
                  ? '—'
                  : card.value}
            </strong>
          </div>
        ))}
      </div>
    </div>
  )
}