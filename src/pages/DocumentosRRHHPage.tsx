import { useState, useEffect } from 'react'
import { supabase } from '../services/supabase'

const TYPES: Record<string, { label: string; icon: string }> = {
  trabajadores: { label: 'Trabajadores', icon: '👥' },
  practicantes: { label: 'Practicantes', icon: '🎓' },
  externos: { label: 'Personal externo', icon: '🧾' }
}

export default function DocumentosRRHHPage() {
  const [people, setPeople] = useState<any[]>([])
  const [docs, setDocs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  
  const [documentType, setDocumentType] = useState<'trabajadores' | 'practicantes' | 'externos'>('trabajadores')
  const [documentPerson, setDocumentPerson] = useState('')
  const [documentSearch, setDocumentSearch] = useState('')
  const [documentAlert, setDocumentAlert] = useState('')

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    const { data: peopleData } = await supabase.from('rrhh_personas').select('*')
    const { data: docsData } = await supabase.from('rrhh_documentos').select('*')
    if (peopleData) setPeople(peopleData)
    if (docsData) setDocs(docsData)
    setLoading(false)
  }

  const docPerson = (d: any) => people.find((p: any) => String(p.id) === String(d.person_id))

  const docAlert = (d: any) => {
    if (!d.expiry) return 'none'
    const today = new Date().toISOString().split('T')[0]
    if (d.expiry < today) return 'expired'
    const limit = new Date()
    limit.setDate(limit.getDate() + 30)
    const end = limit.toISOString().split('T')[0]
    return d.expiry <= end ? 'soon' : 'current'
  }

  const groupDocs = docs.filter((d: any) => docPerson(d)?.type === documentType)
  const groupPeople = people.filter((p: any) => p.type === documentType)

  const filteredDocs = groupDocs.filter((d: any) => {
    const p = docPerson(d)
    if (!p) return false
    const matchPerson = !documentPerson || String(p.id) === documentPerson
    const matchAlert = !documentAlert || docAlert(d) === documentAlert
    const matchSearch = [p.name, p.rut, d.type, d.file_name, d.note].join(' ').toLowerCase().includes(documentSearch.toLowerCase())
    return matchPerson && matchAlert && matchSearch
  })

  const visiblePeople = groupPeople.filter((p: any) => {
    const hasFilteredDocs = filteredDocs.some((d: any) => String(d.person_id) === String(p.id))
    return hasFilteredDocs || (!documentSearch && !documentAlert)
  })

  if (loading) {
    return <div className="p-8 text-sm text-slate-500 font-sans">Cargando documentos y alertas...</div>
  }

  return (
    <div className="space-y-6 font-sans">
      <div>
        <h1 className="text-2xl font-black text-amber-900">Documentos y alertas</h1>
        <p className="text-xs text-slate-500 mt-1">Selecciona un grupo y abre la carpeta de cada persona para revisar sus documentos.</p>
      </div>

      {/* Selector de Grupos */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Object.entries(TYPES).map(([key, type]) => {
          const isSelected = documentType === key
          const count = docs.filter((d: any) => docPerson(d)?.type === key).length
          const pCount = people.filter((p: any) => p.type === key).length
          return (
            <button
              key={key}
              type="button"
              onClick={() => { setDocumentType(key as any); setDocumentPerson(''); }}
              className={`text-left p-5 rounded-2xl border transition bg-white space-y-2 ${
                isSelected ? 'border-[#d9b354] bg-[#fff7dd] shadow-sm' : 'border-[#ddd4c3]'
              }`}
            >
              <div className="text-2xl">{type.icon} <b className="text-sm text-slate-900">{type.label}</b></div>
              <strong className="block text-3xl font-black">{count}</strong>
              <p className="text-xs text-slate-500">Documentos · {pCount} perfiles</p>
              <span className="inline-block text-[11px] font-bold text-amber-800">{isSelected ? 'Grupo seleccionado' : 'Abrir carpetas →'}</span>
            </button>
          )
        })}
      </div>

      <h2 className="text-base font-black text-amber-900 pt-2">{TYPES[documentType].label}</h2>

      {/* Tarjetas de Estadísticas */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-[#ddd4c3]">Documentos <strong className="block text-2xl font-black mt-1">{groupDocs.length}</strong></div>
        <div className="bg-white p-4 rounded-2xl border border-[#ddd4c3]">Vencidos <strong className="block text-2xl font-black text-red-600 mt-1">{groupDocs.filter(d => docAlert(d) === 'expired').length}</strong></div>
        <div className="bg-white p-4 rounded-2xl border border-[#ddd4c3]">Vencen en 30 días <strong className="block text-2xl font-black text-amber-600 mt-1">{groupDocs.filter(d => docAlert(d) === 'soon').length}</strong></div>
        <div className="bg-white p-4 rounded-2xl border border-[#ddd4c3]">Perfiles sin documentos <strong className="block text-2xl font-black mt-1">{groupPeople.filter((p: any) => !groupDocs.some((d: any) => String(d.person_id) === String(p.id))).length}</strong></div>
      </div>

      {/* Filtros */}
      <div className="flex gap-3 flex-wrap">
        <input 
          type="text" 
          placeholder="Buscar persona, RUT, documento o archivo" 
          value={documentSearch} 
          onChange={e => setDocumentSearch(e.target.value)}
          className="max-w-xs text-xs p-2.5 bg-white border border-[#cabfae] rounded-xl font-medium" 
        />
        <select 
          value={documentPerson} 
          onChange={e => setDocumentPerson(e.target.value)}
          className="max-w-xs text-xs p-2.5 bg-white border border-[#cabfae] rounded-xl font-medium"
        >
          <option value="">Todas las personas</option>
          {groupPeople.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select 
          value={documentAlert} 
          onChange={e => setDocumentAlert(e.target.value)}
          className="max-w-xs text-xs p-2.5 bg-white border border-[#cabfae] rounded-xl font-medium"
        >
          <option value="">Todos los vencimientos</option>
          <option value="expired">Vencidos</option>
          <option value="soon">Vencen en 30 días</option>
          <option value="current">Vigentes por más de 30 días</option>
          <option value="none">Sin vencimiento</option>
        </select>
      </div>

      {/* Resultados por Persona (Acordeón) */}
      <div className="space-y-3">
        <p className="text-xs text-slate-500 font-bold">{filteredDocs.length} documento(s) · {visiblePeople.length} perfil(es)</p>
        {visiblePeople.map((p: any) => {
          const personDocs = filteredDocs.filter((d: any) => String(d.person_id) === String(p.id))
          const hasExpired = personDocs.some((d: any) => docAlert(d) === 'expired')
          const hasSoon = personDocs.some((d: any) => docAlert(d) === 'soon')

          return (
            <details key={p.id} open={Boolean(documentPerson || documentSearch || documentAlert)} className="bg-white p-4 rounded-2xl border border-[#ddd4c3] shadow-xs">
              <summary className="cursor-pointer font-bold text-xs flex justify-between items-center">
                <span><b>{p.name}</b> · {p.rut || 'Sin RUT'} · {personDocs.length} documento(s)</span>
                {hasExpired && <span className="text-red-600 text-[11px]">· Con vencidos</span>}
                {hasSoon && <span className="text-amber-600 text-[11px]">· Próximos a vencer</span>}
              </summary>
              <div className="mt-4 pt-4 border-t space-y-3">
                {personDocs.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="bg-[#faf7f0] text-[10px] font-black uppercase text-slate-500 border-b">
                          <th className="p-2.5">Documento</th>
                          <th className="p-2.5">Fecha / Periodo</th>
                          <th className="p-2.5">Vencimiento</th>
                          <th className="p-2.5">Observaciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {personDocs.map((d: any) => (
                          <tr key={d.id}>
                            <td className="p-2.5 font-bold">{d.type} {d.file_name && <span className="text-amber-700 font-mono">({d.file_name})</span>}</td>
                            <td className="p-2.5">{d.date}</td>
                            <td className={`p-2.5 font-bold ${docAlert(d) === 'expired' ? 'text-red-600' : docAlert(d) === 'soon' ? 'text-amber-600' : 'text-slate-700'}`}>
                              {d.expiry || 'Sin vencimiento'}
                            </td>
                            <td className="p-2.5 text-slate-500">{d.note || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 text-center py-4">Este perfil aún no tiene documentos registrados.</p>
                )}
              </div>
            </details>
          )
        })}
      </div>
    </div>
  )
}