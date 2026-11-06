import { useEffect, useState } from 'react'
import { supabase } from '../services/supabase'

export default function ResumenRRHHPage() {
  const [totalPersonas, setTotalPersonas] = useState(0)
  const [totalTrabajadores, setTotalTrabajadores] = useState(0)
  const [totalPracticantes, setTotalPracticantes] = useState(0)
  const [totalExternos, setTotalExternos] = useState(0)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchStats() {
      try {
        const { data, error } = await supabase.from('rrhh_personas').select('tipo')
        if (error) throw error

        if (data) {
          setTotalPersonas(data.length)
          setTotalTrabajadores(data.filter((p) => p.tipo === 'trabajador' || p.tipo === 'trabajadores').length)
          setTotalPracticantes(data.filter((p) => p.tipo === 'practicante' || p.tipo === 'practicantes').length)
          setTotalExternos(data.filter((p) => p.tipo === 'externo' || p.tipo === 'externos').length)
        }
      } catch (err) {
        console.error('Error al cargar métricas de RRHH:', err)
      } finally {
        setIsLoading(false)
      }
    }
    void fetchStats()
  }, [])

  return (
    <div className="space-y-6 font-sans">
      <div>
        <h1 className="text-2xl font-black text-amber-900">Panel de gestión de personas</h1>
        <p className="text-xs text-slate-500 mt-1">Centraliza contratos, prácticas, honorarios, pagos, horas y documentos.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-[#ddd4c3]">
          Personas registradas 
          <strong className="block text-3xl font-black mt-2">{isLoading ? '...' : totalPersonas}</strong>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-[#ddd4c3]">
          Trabajadores 
          <strong className="block text-3xl font-black mt-2">{isLoading ? '...' : totalTrabajadores}</strong>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-[#ddd4c3]">
          Practicantes 
          <strong className="block text-3xl font-black mt-2">{isLoading ? '...' : totalPracticantes}</strong>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-[#ddd4c3]">
          Externos 
          <strong className="block text-3xl font-black mt-2">{isLoading ? '...' : totalExternos}</strong>
        </div>
      </div>
    </div>
  )
}