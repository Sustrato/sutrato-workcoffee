import { useState, useEffect } from 'react'
import { supabase } from '../services/supabase'
import { ChevronLeft, ChevronRight, Clock, User, Trash2, Calendar as CalendarIcon, Grid, X, AlertTriangle, LoaderCircle } from 'lucide-react'

interface EventoReserva {
  id: string
  oficina: string
  cliente: string
  horaInicio?: string
  horaFin?: string
  tipo: 'particular' | 'empresa'
  fecha: string
}

export default function CalendarioOficinasPage() {
  const [currentDate, setCurrentDate] = useState(new Date(2026, 9, 12)) // Octubre 2026
  const [eventos, setEventos] = useState<EventoReserva[]>([])
  const [_loading, setLoading] = useState(false)
  const [vista, setVista] = useState<'mes' | 'semana'>('mes')

  // Estados para el modal de confirmación personalizado
  const [reservaParaCancelar, setReservaParaCancelar] = useState<EventoReserva | null>(null)
  const [isCanceling, setIsCanceling] = useState(false)

  // Cargar reservas desde Supabase
  const fetchReservas = async () => {
    setLoading(true)
    
    // 1. Cargar reservas particulares
    const { data: particulares } = await supabase
      .from('uso_oficinas_particulares')
      .select('id, oficina_asignada, hora_inicio, hora_fin, fecha_inicio, clientes_particulares(nombre_completo)')

    // 2. Cargar arriendos mensuales de empresas activos
    const { data: empresas } = await supabase
      .from('oficinas_fisicas')
      .select('id, tipo_espacio, nombre_cliente, fecha_inicio, estado')
      .eq('estado', 'Activo')

    const listaEventos: EventoReserva[] = []

    if (particulares) {
      particulares.forEach((p: any) => {
        listaEventos.push({
          id: p.id,
          oficina: p.oficina_asignada,
          cliente: p.clientes_particulares?.nombre_completo || 'Cliente Particular',
          horaInicio: p.hora_inicio?.substring(0, 5),
          horaFin: p.hora_fin?.substring(0, 5),
          tipo: 'particular',
          fecha: p.fecha_inicio
        })
      })
    }

    if (empresas) {
      empresas.forEach((e: any) => {
        listaEventos.push({
          id: e.id,
          oficina: e.tipo_espacio,
          cliente: e.nombre_cliente,
          tipo: 'empresa',
          fecha: e.fecha_inicio
        })
      })
    }

    setEventos(listaEventos)
    setLoading(false)
  }

  useEffect(() => {
    fetchReservas()
  }, [currentDate])

  // Función que ejecuta la cancelación de forma segura en la base de datos
  const confirmarCancelacion = async () => {
    if (!reservaParaCancelar) return
    setIsCanceling(true)

    const { id, tipo } = reservaParaCancelar

    if (tipo === 'particular') {
      const { error } = await supabase
        .from('uso_oficinas_particulares')
        .update({ fecha_inicio: null })
        .eq('id', id)

      if (!error) {
        fetchReservas()
      } else {
        setEventos(prev => prev.filter(e => e.id !== id))
      }
    } else {
      // 🏢 PARA EMPRESAS: Actualizamos a 'Cancelado' manteniendo intactos los pagos y contratos
      const { error } = await supabase
        .from('oficinas_fisicas')
        .update({ estado: 'Cancelado' })
        .eq('id', id)

      if (!error) {
        fetchReservas()
      } else {
        alert('Error al actualizar el estado: ' + error.message)
      }
    }

    setIsCanceling(false)
    setReservaParaCancelar(null)
  }

  // Navegación
  const prevPeriod = () => {
    const d = new Date(currentDate)
    if (vista === 'mes') {
      d.setMonth(d.getMonth() - 1)
    } else {
      d.setDate(d.getDate() - 7)
    }
    setCurrentDate(d)
  }

  const nextPeriod = () => {
    const d = new Date(currentDate)
    if (vista === 'mes') {
      d.setMonth(d.getMonth() + 1)
    } else {
      d.setDate(d.getDate() + 7)
    }
    setCurrentDate(d)
  }

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  const firstDayIndex = new Date(year, month, 1).getDay()
  const totalDays = new Date(year, month + 1, 0).getDate()
  const adjustedFirstDay = (firstDayIndex + 6) % 7

  const getStartOfWeek = (d: Date) => {
    const date = new Date(d)
    const day = date.getDay()
    const diff = date.getDate() - day + (day === 0 ? -6 : 1)
    return new Date(date.setDate(diff))
  }

  const startOfWeek = getStartOfWeek(currentDate)
  const diasSemana = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(startOfWeek)
    d.setDate(d.getDate() + i)
    return d
  })

  const horas = Array.from({ length: 13 }).map((_, i) => `${String(8 + i).padStart(2, '0')}:00`)

  const monthNames = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
  ]

  return (
    <div className="mx-auto max-w-7xl space-y-6 font-sans">
      
      {/* Encabezado */}
      <section className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Calendario de oficinas
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Visualización de reservas y arriendos presenciales
          </p>
        </div>

        {/* Switch Vista Mensual / Semanal */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
          <button 
            onClick={() => setVista('mes')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
              vista === 'mes' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Grid size={14} /> Mensual
          </button>
          <button 
            onClick={() => setVista('semana')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
              vista === 'semana' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <CalendarIcon size={14} /> Semanal
          </button>
        </div>
      </section>

      {/* Contenedor del Calendario */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
        
        {/* Header de navegación */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <button 
            onClick={prevPeriod}
            className="flex items-center gap-1 border border-slate-200 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
          >
            <ChevronLeft size={16} /> Anterior
          </button>
          <h2 className="text-lg font-black text-slate-900 capitalize">
            {vista === 'mes' 
              ? `${monthNames[month]} de ${year}`
              : `Semana del ${startOfWeek.getDate()} de ${monthNames[startOfWeek.getMonth()]} ${startOfWeek.getFullYear()}`}
          </h2>
          <button 
            onClick={nextPeriod}
            className="flex items-center gap-1 border border-slate-200 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
          >
            Siguiente <ChevronRight size={16} />
          </button>
        </div>

        {/* 📅 VISTA 1: GRID MENSUAL */}
        {vista === 'mes' ? (
          <div className="space-y-4">
            <div className="grid grid-cols-7 text-center font-bold text-xs text-slate-400">
              <div>Lun</div>
              <div>Mar</div>
              <div>Mié</div>
              <div>Jue</div>
              <div>Vie</div>
              <div>Sáb</div>
              <div>Dom</div>
            </div>
            <div className="grid grid-cols-7 gap-2">
              {Array.from({ length: adjustedFirstDay }).map((_, i) => (
                <div key={`empty-${i}`} className="min-h-[110px] rounded-xl bg-slate-50/50 border border-transparent"></div>
              ))}
              {Array.from({ length: totalDays }).map((_, i) => {
                const dayNum = i + 1
                const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`
                const reservasDelDia = eventos.filter(e => e.fecha === dateStr)

                return (
                  <div 
                    key={dayNum} 
                    className="min-h-[110px] rounded-xl border border-slate-100 p-2 space-y-1.5 bg-white hover:border-slate-300 transition"
                  >
                    <div className="text-xs font-bold text-slate-400">{dayNum}</div>
                    <div className="space-y-1">
                      {reservasDelDia.map(r => (
                        <div 
                          key={r.id} 
                          className={`p-1.5 rounded-lg text-[10px] font-medium border relative group transition ${
                            r.tipo === 'particular' 
                              ? 'bg-blue-50 border-blue-200 text-blue-900' 
                              : 'bg-amber-50 border-amber-200 text-amber-900'
                          }`}
                        >
                          <div className="flex justify-between items-start">
                            <span className="font-bold truncate">{r.oficina}</span>
                            <button 
                              onClick={() => setReservaParaCancelar(r)}
                              className="text-rose-500 opacity-0 group-hover:opacity-100 hover:text-rose-700 p-0.5 transition"
                              title="Liberar / cancelar reserva"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                          <div className="truncate text-slate-600 flex items-center gap-0.5">
                            <User size={10} /> {r.cliente}
                          </div>
                          {r.horaInicio && (
                            <div className="text-[9px] font-semibold text-blue-700 mt-0.5 flex items-center gap-0.5">
                              <Clock size={9} /> {r.horaInicio} - {r.horaFin}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ) : (
          /* ⏱️ VISTA 2: HORARIO SEMANAL */
          <div className="overflow-x-auto">
            <div className="min-w-[800px]">
              <div className="grid grid-cols-8 border-b border-slate-200 pb-2 text-center text-xs font-bold text-slate-600">
                <div className="text-slate-400 text-left pl-2">Hora</div>
                {diasSemana.map((dia, idx) => (
                  <div key={idx} className="space-y-0.5">
                    <span className="block text-[10px] uppercase text-slate-400">
                      {dia.toLocaleDateString('es-CL', { weekday: 'short' })}
                    </span>
                    <span className="block text-sm font-black text-slate-800">
                      {dia.getDate()}
                    </span>
                  </div>
                ))}
              </div>

              <div className="divide-y divide-slate-100">
                {horas.map((hora) => (
                  <div key={hora} className="grid grid-cols-8 min-h-[50px]">
                    <div className="text-[11px] font-semibold text-slate-400 py-2 pl-2">
                      {hora}
                    </div>
                    {diasSemana.map((dia, idx) => {
                      const dateStr = dia.toISOString().split('T')[0]
                      const eventosHora = eventos.filter(e => {
                        if (e.fecha !== dateStr) return false
                        if (!e.horaInicio) return false
                        const horaEvento = e.horaInicio.split(':')[0]
                        const horaGrid = hora.split(':')[0]
                        return horaEvento === horaGrid
                      })

                      return (
                        <div key={idx} className="border-l border-slate-100 p-1 space-y-1 bg-slate-50/30">
                          {eventosHora.map((r) => (
                            <div 
                              key={r.id}
                              className="p-1.5 rounded-lg text-[10px] bg-blue-100 border border-blue-300 text-blue-900 shadow-sm relative group"
                            >
                              <div className="flex justify-between items-center font-bold">
                                <span className="truncate">{r.oficina}</span>
                                <button 
                                  onClick={() => setReservaParaCancelar(r)}
                                  className="text-rose-600 opacity-0 group-hover:opacity-100 hover:text-rose-800 transition"
                                  title="Liberar / cancelar reserva"
                                >
                                  <Trash2 size={11} />
                                </button>
                              </div>
                              <div className="truncate text-slate-700">{r.cliente}</div>
                              <div className="text-[9px] font-semibold text-blue-800">
                                {r.horaInicio} - {r.horaFin}
                              </div>
                            </div>
                          ))}
                        </div>
                      )
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </section>

      {/* ✨ MODAL DE CONFIRMACIÓN PERSONALIZADO (Adiós al cartel feo de localhost/vercel) */}
      {reservaParaCancelar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-[2px]">
          <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl shadow-slate-950/20">
            <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5">
              <div className="flex items-center gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                  <AlertTriangle size={20} />
                </span>
                <div>
                  <h3 className="text-base font-semibold text-slate-900">Liberar reserva</h3>
                  <p className="text-xs text-slate-500">{reservaParaCancelar.oficina} · {reservaParaCancelar.cliente}</p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setReservaParaCancelar(null)} 
                disabled={isCanceling}
                className="flex size-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X size={18} />
              </button>
            </div>
            
            <div className="px-6 py-5 space-y-3">
              <p className="text-sm text-slate-600 leading-relaxed">
                ¿Seguro que deseas liberar o cancelar esta reserva del calendario? 
              </p>
              <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-3 text-xs font-medium text-emerald-800">
                🔒 Tus datos financieros, pagos y contratos se mantendrán completamente seguros e intactos.
              </div>
            </div>

            <div className="flex flex-col-reverse gap-2.5 border-t border-slate-100 px-6 py-4 sm:flex-row sm:justify-end bg-slate-50/50">
              <button
                type="button"
                onClick={() => setReservaParaCancelar(null)}
                disabled={isCanceling}
                className="h-10 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
              >
                Conservar reserva
              </button>
              <button
                type="button"
                onClick={confirmarCancelacion}
                disabled={isCanceling}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-rose-700 disabled:opacity-50"
              >
                {isCanceling && <LoaderCircle size={16} className="animate-spin" />}
                {isCanceling ? 'Procesando...' : 'Sí, liberar espacio'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}