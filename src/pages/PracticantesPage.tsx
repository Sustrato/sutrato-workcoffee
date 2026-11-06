import { useState, useEffect } from 'react'
import { supabase } from '../services/supabase'

const PRACTICE_STATUSES = ['En práctica', 'Práctica finalizada', 'Desvinculado de práctica', 'Práctica atrasada', 'Práctica aprobada']
const TYPES_DOCS = ['Convenio de práctica', 'Seguro escolar', 'Carta de aceptación', 'Registro de asistencia y horas', 'Evaluación', 'Informe de práctica', 'Otro documento']

export default function PracticantesPage() {
  const [people, setPeople] = useState<any[]>([])
  const [docs, setDocs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [subTab, setSubTab] = useState<'en_practica' | 'finalizadas' | 'desvinculadas' | 'atrasadas'>('en_practica')

  // Modales
  const [modalType, setModalType] = useState<'agregar' | 'editar' | 'perfil' | 'agregarDoc' | 'cambiarEstado' | null>(null)
  const [selectedPerson, setSelectedPerson] = useState<any>(null)
  const [formValues, setFormValues] = useState<any>({})
  const [docValues, setDocValues] = useState<any>({ type: TYPES_DOCS[0], date: new Date().toISOString().split('T')[0] })
  
  // Estados para cambio de estado en práctica
  const [targetStatus, setTargetStatus] = useState<string>('')
  const [practiceReason, setPracticeReason] = useState<string>('')
  const [practiceDate, setPracticeDate] = useState<string>(new Date().toISOString().split('T')[0])

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    const { data: peopleData } = await supabase.from('rrhh_personas').select('*').eq('type', 'practicantes')
    const { data: docsData } = await supabase.from('rrhh_documentos').select('*')
    if (peopleData) setPeople(peopleData)
    if (docsData) setDocs(docsData)
    setLoading(false)
  }

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    const { error } = await supabase.from('rrhh_personas').insert([{ type: 'practicantes', completed_hours: 0, ...formValues }])
    if (!error) {
      setModalType(null)
      setFormValues({})
      fetchData()
    }
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    const { error } = await supabase.from('rrhh_personas').update(formValues).eq('id', selectedPerson.id)
    if (!error) {
      setModalType(null)
      setSelectedPerson(null)
      fetchData()
    }
  }

  const handleExecuteStatusChange = async () => {
    const { error } = await supabase.from('rrhh_personas').update({ 
      status: targetStatus, 
      practice_status_date: practiceDate, 
      practice_reason: practiceReason 
    }).eq('id', selectedPerson.id)

    if (!error) {
      setModalType(null)
      setSelectedPerson(null)
      setPracticeReason('')
      fetchData()
    }
  }

  const handleAddHours = async (p: any) => {
    const input = prompt('Horas realizadas que deseas agregar:', '8')
    if (input && !isNaN(Number(input))) {
      const added = Number(input)
      const newTotal = (Number(p.completed_hours) || 0) + added
      const { error } = await supabase.from('rrhh_personas').update({ completed_hours: newTotal }).eq('id', p.id)
      if (!error) {
        setSelectedPerson({ ...p, completed_hours: newTotal })
        fetchData()
      }
    }
  }

  const filtered = people.filter((p: any) => {
    const matchTab = subTab === 'en_practica' ? p.status === 'En práctica'
      : subTab === 'finalizadas' ? ['Práctica finalizada', 'Práctica aprobada'].includes(p.status)
      : subTab === 'desvinculadas' ? p.status === 'Desvinculado de práctica'
      : p.status === 'Práctica atrasada'
    const matchSearch = [p.name, p.rut, p.institution].join(' ').toLowerCase().includes(search.toLowerCase())
    const matchStatus = !statusFilter || p.status === statusFilter
    return matchTab && matchSearch && matchStatus
  })

  const enPracticaCount = people.filter((p: any) => p.status === 'En práctica').length
  const finalizadasCount = people.filter((p: any) => ['Práctica finalizada', 'Práctica aprobada'].includes(p.status)).length
  const desvinculadasCount = people.filter((p: any) => p.status === 'Desvinculado de práctica').length
  const atrasadasCount = people.filter((p: any) => p.status === 'Práctica atrasada').length

  if (loading) {
    return <div className="p-8 text-sm text-slate-500 font-sans">Cargando practicantes...</div>
  }

  return (
    <div className="space-y-6 font-sans">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-black text-amber-900">Practicantes</h1>
          <p className="text-xs text-slate-500 mt-1">Seguimiento de convenios, institución, horas y cierre de la práctica.</p>
        </div>
        <button 
          type="button" 
          onClick={() => { setFormValues({ type: 'practicantes', status: 'En práctica', institution_type: 'Universidad', required_hours: 400 }); setModalType('agregar'); }}
          className="px-4 py-2.5 bg-[#d9b354] text-slate-900 rounded-xl font-bold text-xs shadow-sm hover:brightness-105 transition"
        >
          + Agregar
        </button>
      </div>

      <div className="flex gap-2 flex-wrap">
        <button type="button" onClick={() => setSubTab('en_practica')} className={`px-4 py-2 rounded-xl text-xs font-bold ${subTab === 'en_practica' ? 'bg-[#d9b354] text-slate-900' : 'bg-[#eee8db] text-slate-700'}`}>En práctica ({enPracticaCount})</button>
        <button type="button" onClick={() => setSubTab('finalizadas')} className={`px-4 py-2 rounded-xl text-xs font-bold ${subTab === 'finalizadas' ? 'bg-[#d9b354] text-slate-900' : 'bg-[#eee8db] text-slate-700'}`}>Prácticas finalizadas ({finalizadasCount})</button>
        <button type="button" onClick={() => setSubTab('desvinculadas')} className={`px-4 py-2 rounded-xl text-xs font-bold ${subTab === 'desvinculadas' ? 'bg-[#d9b354] text-slate-900' : 'bg-[#eee8db] text-slate-700'}`}>Prácticas desvinculadas ({desvinculadasCount})</button>
        <button type="button" onClick={() => setSubTab('atrasadas')} className={`px-4 py-2 rounded-xl text-xs font-bold ${subTab === 'atrasadas' ? 'bg-[#d9b354] text-slate-900' : 'bg-[#eee8db] text-slate-700'}`}>Prácticas atrasadas ({atrasadasCount})</button>
      </div>

      <div className="flex gap-3 flex-wrap">
        <input 
          type="text" 
          placeholder="Buscar por nombre, RUT o institución" 
          value={search} 
          onChange={e => setSearch(e.target.value)}
          className="max-w-xs text-xs p-2.5 bg-white border border-[#cabfae] rounded-xl font-medium" 
        />
        <select 
          value={statusFilter} 
          onChange={e => setStatusFilter(e.target.value)}
          className="max-w-xs text-xs p-2.5 bg-white border border-[#cabfae] rounded-xl font-medium"
        >
          <option value="">Todos los estados</option>
          {PRACTICE_STATUSES.map(s => <option key={s}>{s}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-2xl border border-[#ddd4c3] overflow-x-auto shadow-xs">
        <table className="w-full text-left text-xs min-w-[950px]">
          <thead>
            <tr className="bg-[#faf7f0] text-[10px] font-black uppercase text-slate-500 border-b">
              <th className="p-3.5">Persona</th>
              <th className="p-3.5">RUT / Contacto</th>
              <th className="p-3.5">Institución / Horas</th>
              <th className="p-3.5">Documentos</th>
              <th className="p-3.5">Estado</th>
              <th className="p-3.5">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filtered.map((p: any) => {
              const cantDocs = docs.filter((d: any) => Number(d.person_id) === Number(p.id)).length
              return (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="p-3.5 font-bold">{p.name}<br/><small className="text-slate-400 font-normal">{p.career || p.role}</small></td>
                  <td className="p-3.5 font-mono">{p.rut}<br/><small className="text-slate-400">{p.email}<br/>{p.phone}</small></td>
                  <td className="p-3.5"><b>{p.institution || 'Sin institución'}</b><br/><small>{p.completed_hours || 0} de {p.required_hours || 0} horas</small></td>
                  <td className="p-3.5 font-bold"><b>{cantDocs}</b> archivo(s)</td>
                  <td className="p-3.5 font-bold text-emerald-700">{p.status}</td>
                  <td className="p-3.5 flex gap-2 flex-wrap">
                    <button type="button" onClick={() => { setSelectedPerson(p); setModalType('perfil'); }} className="px-3 py-1.5 bg-[#eee8db] rounded-lg font-bold text-[11px]">Ver perfil</button>
                    <button type="button" onClick={() => { setSelectedPerson(p); setFormValues(p); setModalType('editar'); }} className="px-3 py-1.5 bg-[#eee8db] rounded-lg font-bold text-[11px]">Editar</button>
                    <button type="button" onClick={() => { setSelectedPerson(p); setTargetStatus('Práctica finalizada'); setModalType('cambiarEstado'); }} className="px-3 py-1.5 bg-[#eee8db] rounded-lg font-bold text-[11px]">Finalizar práctica</button>
                    <button type="button" onClick={() => { setSelectedPerson(p); setTargetStatus('Desvinculado de práctica'); setModalType('cambiarEstado'); }} className="px-3 py-1.5 bg-[#fae3e1] text-[#932c2c] rounded-lg font-bold text-[11px]">Desvincular práctica</button>
                    <button type="button" onClick={() => { setSelectedPerson(p); setTargetStatus('Práctica atrasada'); setModalType('cambiarEstado'); }} className="px-3 py-1.5 bg-[#eee8db] rounded-lg font-bold text-[11px]">Marcar atrasada</button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* MODALES */}
      {modalType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            
            {/* AGREGAR / EDITAR */}
            {(modalType === 'agregar' || modalType === 'editar') && (
              <form onSubmit={modalType === 'agregar' ? handleAdd : handleUpdate} className="space-y-4">
                <div className="flex justify-between items-center border-b pb-3">
                  <h2 className="text-lg font-black text-amber-900">{modalType === 'agregar' ? 'Agregar persona' : 'Editar perfil'}</h2>
                  <button type="button" onClick={() => setModalType(null)} className="text-slate-400 font-bold">Cerrar</button>
                </div>
                <div className="grid grid-cols-2 gap-4 text-xs font-bold">
                  <label className="col-span-2">Nombre completo:
                    <input required type="text" defaultValue={formValues.name || ''} onChange={e => setFormValues({ ...formValues, name: e.target.value })} className="w-full mt-1 p-2.5 border rounded-xl font-normal" />
                  </label>
                  <label>RUT:
                    <input required type="text" defaultValue={formValues.rut || ''} onChange={e => setFormValues({ ...formValues, rut: e.target.value })} className="w-full mt-1 p-2.5 border rounded-xl font-normal" />
                  </label>
                  <label>Correo:
                    <input type="email" defaultValue={formValues.email || ''} onChange={e => setFormValues({ ...formValues, email: e.target.value })} className="w-full mt-1 p-2.5 border rounded-xl font-normal" />
                  </label>
                  <label>Teléfono:
                    <input type="text" defaultValue={formValues.phone || ''} onChange={e => setFormValues({ ...formValues, phone: e.target.value })} className="w-full mt-1 p-2.5 border rounded-xl font-normal" />
                  </label>
                  <label>Carrera:
                    <input type="text" defaultValue={formValues.career || formValues.role || ''} onChange={e => setFormValues({ ...formValues, career: e.target.value, role: e.target.value })} className="w-full mt-1 p-2.5 border rounded-xl font-normal" />
                  </label>
                  <label>Estado:
                    <select defaultValue={formValues.status || 'En práctica'} onChange={e => setFormValues({ ...formValues, status: e.target.value })} className="w-full mt-1 p-2.5 border rounded-xl bg-white font-normal">
                      {PRACTICE_STATUSES.map(s => <option key={s}>{s}</option>)}
                    </select>
                  </label>
                  <label>Tipo de institución:
                    <select defaultValue={formValues.institution_type || 'Universidad'} onChange={e => setFormValues({ ...formValues, institution_type: e.target.value })} className="w-full mt-1 p-2.5 border rounded-xl bg-white font-normal">
                      {['Universidad', 'CFT/IP', 'Liceo', 'OTEC', 'Otra'].map(i => <option key={i}>{i}</option>)}
                    </select>
                  </label>
                  <label>Nombre de institución:
                    <input type="text" defaultValue={formValues.institution || ''} onChange={e => setFormValues({ ...formValues, institution: e.target.value })} className="w-full mt-1 p-2.5 border rounded-xl font-normal" />
                  </label>
                  <label>Coordinador/a de práctica:
                    <input type="text" defaultValue={formValues.coordinator || ''} onChange={e => setFormValues({ ...formValues, coordinator: e.target.value })} className="w-full mt-1 p-2.5 border rounded-xl font-normal" />
                  </label>
                  <label>Correo coordinador:
                    <input type="email" defaultValue={formValues.coordinator_email || ''} onChange={e => setFormValues({ ...formValues, coordinator_email: e.target.value })} className="w-full mt-1 p-2.5 border rounded-xl font-normal" />
                  </label>
                  <label>Teléfono coordinador:
                    <input type="text" defaultValue={formValues.coordinator_phone || ''} onChange={e => setFormValues({ ...formValues, coordinator_phone: e.target.value })} className="w-full mt-1 p-2.5 border rounded-xl font-normal" />
                  </label>
                  <label>Horas exigidas:
                    <input type="number" defaultValue={formValues.required_hours || 400} onChange={e => setFormValues({ ...formValues, required_hours: Number(e.target.value) })} className="w-full mt-1 p-2.5 border rounded-xl font-normal" />
                  </label>
                  <label className="col-span-2">Observaciones:
                    <textarea defaultValue={formValues.notes || ''} onChange={e => setFormValues({ ...formValues, notes: e.target.value })} className="w-full mt-1 p-2.5 border rounded-xl font-normal" rows={3}></textarea>
                  </label>
                </div>
                <div className="flex justify-end gap-2 pt-4 border-t">
                  <button type="button" onClick={() => setModalType(null)} className="px-4 py-2 bg-slate-100 rounded-xl text-xs font-bold">Cerrar</button>
                  <button type="submit" className="px-4 py-2 bg-[#d9b354] rounded-xl text-xs font-bold shadow-sm">Guardar cambios</button>
                </div>
              </form>
            )}

            {/* CAMBIAR ESTADO PRÁCTICA */}
            {modalType === 'cambiarEstado' && selectedPerson && (
              <div className="space-y-4">
                <div className="flex justify-between items-center border-b pb-3">
                  <h2 className="text-lg font-black text-amber-900">{targetStatus}</h2>
                  <button type="button" onClick={() => setModalType(null)} className="text-slate-400 font-bold">Cerrar</button>
                </div>
                <p className="text-xs text-slate-700">¿Confirmas cambiar la práctica de <b>{selectedPerson.name}</b> a <b>{targetStatus}</b>?</p>
                <label className="block text-xs font-bold">Fecha del cambio:
                  <input type="date" value={practiceDate} onChange={e => setPracticeDate(e.target.value)} className="w-full mt-1 p-2.5 border rounded-xl font-normal" />
                </label>
                {['Práctica atrasada', 'Desvinculado de práctica'].includes(targetStatus) && (
                  <label className="block text-xs font-bold">Motivo (obligatorio):
                    <textarea required value={practiceReason} onChange={e => setPracticeReason(e.target.value)} placeholder="Indica el motivo cuando corresponda" className="w-full mt-1 p-2.5 border rounded-xl font-normal" rows={3}></textarea>
                  </label>
                )}
                <div className="flex justify-end gap-2 pt-4 border-t">
                  <button type="button" onClick={() => setModalType(null)} className="px-4 py-2 bg-slate-100 rounded-xl text-xs font-bold">Cancelar</button>
                  <button type="button" onClick={handleExecuteStatusChange} className="px-4 py-2 bg-[#d9b354] text-slate-900 rounded-xl font-bold shadow-sm">Confirmar</button>
                </div>
              </div>
            )}

            {/* VER PERFIL */}
            {modalType === 'perfil' && selectedPerson && (
              <div className="space-y-4">
                <div className="flex justify-between items-center border-b pb-3">
                  <div>
                    <h2 className="text-xl font-black text-amber-900">{selectedPerson.name}</h2>
                    <span className="text-[10px] uppercase font-bold bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full">Practicantes</span>
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => { setFormValues(selectedPerson); setModalType('editar'); }} className="px-3 py-1.5 bg-[#eee8db] rounded-xl font-bold text-xs">Editar perfil</button>
                    <button type="button" onClick={() => setModalType(null)} className="px-3 py-1.5 bg-slate-100 rounded-xl font-bold text-xs">Cerrar</button>
                  </div>
                </div>
                <p className="text-xs text-slate-600"><b>RUT:</b> {selectedPerson.rut || '—'} · <b>Correo:</b> {selectedPerson.email || '—'} · <b>Teléfono:</b> {selectedPerson.phone || '—'}</p>
                
                <div className="bg-[#fffdf9] p-4 rounded-2xl border border-[#ddd4c3] space-y-2">
                  <h3 className="font-bold text-xs text-slate-900">{selectedPerson.institution || 'Sin institución'}</h3>
                  <p className="text-xs text-slate-500">Coordinador: {selectedPerson.coordinator || '—'} · {selectedPerson.coordinator_email || '—'} · {selectedPerson.coordinator_phone || '—'}</p>
                  <p className="text-xs text-slate-700">Estado: <b className="text-emerald-700">{selectedPerson.status}</b></p>
                  <p className="text-xs text-slate-700">Horas: <b>{selectedPerson.completed_hours || 0} / {selectedPerson.required_hours || 0}</b></p>
                  <button type="button" onClick={() => handleAddHours(selectedPerson)} className="mt-2 px-3 py-1.5 bg-[#eee8db] rounded-xl font-bold text-xs text-slate-800">+ Registrar horas</button>
                </div>
                <div className="flex justify-between items-center pt-2">
                  <h3 className="text-sm font-black text-slate-800">Carpeta documental</h3>
                  <button type="button" onClick={() => setModalType('agregarDoc')} className="px-3 py-1.5 bg-[#d9b354] text-slate-900 rounded-xl font-bold text-xs">+ Agregar documento</button>
                </div>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {docs.filter((d: any) => Number(d.person_id) === Number(selectedPerson.id)).map((d: any) => (
                    <div key={d.id} className="p-3 border rounded-xl flex justify-between items-center text-xs">
                      <div>
                        <b>{d.type}</b> {d.file_name && <span className="text-amber-700 font-mono">({d.file_name})</span>}
                        <br/><small className="text-slate-500">{d.date} · {d.note || 'Sin observaciones'}</small>
                      </div>
                      {d.file_data ? (
                        <a href={d.file_data} download={d.file_name || 'documento'} className="px-3 py-1 bg-[#eee8db] rounded-lg font-bold text-[11px] text-amber-900">Descargar</a>
                      ) : (
                        <span className="text-emerald-700 font-bold">Registrado</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* AGREGAR DOCUMENTO CON ARCHIVO */}
            {modalType === 'agregarDoc' && selectedPerson && (
              <form onSubmit={async (e) => {
                e.preventDefault()
                const fileInput = (document.getElementById('fileUploadInput') as HTMLInputElement)?.files?.[0]
                let file_data = ''
                let file_name = ''
                
                if (fileInput) {
                  file_name = fileInput.name
                  file_data = await new Promise((resolve) => {
                    const reader = new FileReader()
                    reader.onload = () => resolve(reader.result as string)
                    reader.readAsDataURL(fileInput)
                  })
                }

                const { error } = await supabase.from('rrhh_documentos').insert([{
                  person_id: selectedPerson.id,
                  type: docValues.type,
                  date: docValues.date,
                  expiry: docValues.expiry,
                  note: docValues.note,
                  file_name,
                  file_data
                }])

                if (!error) {
                  setModalType('perfil')
                  fetchData()
                }
              }} className="space-y-4">
                <div className="flex justify-between items-center border-b pb-3">
                  <h2 className="text-lg font-black text-amber-900">Agregar documento</h2>
                  <button type="button" onClick={() => setModalType('perfil')} className="text-slate-400 font-bold">Volver</button>
                </div>
                <div className="grid grid-cols-2 gap-4 text-xs font-bold">
                  <label className="col-span-2">Tipo de documento:
                    <select value={docValues.type} onChange={e => setDocValues({ ...docValues, type: e.target.value })} className="w-full mt-1 p-2.5 border rounded-xl bg-white font-normal">
                      {TYPES_DOCS.map(t => <option key={t}>{t}</option>)}
                    </select>
                  </label>
                  <label>Fecha:
                    <input type="date" value={docValues.date} onChange={e => setDocValues({ ...docValues, date: e.target.value })} className="w-full mt-1 p-2.5 border rounded-xl font-normal" />
                  </label>
                  <label>Vencimiento:
                    <input type="date" onChange={e => setDocValues({ ...docValues, expiry: e.target.value })} className="w-full mt-1 p-2.5 border rounded-xl font-normal" />
                  </label>
                  <label className="col-span-2">Archivo:
                    <input id="fileUploadInput" type="file" className="w-full mt-1 p-2 border rounded-xl font-normal bg-white text-xs file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-[#eee8db] file:text-slate-700 hover:file:bg-[#e2dcd0]" />
                  </label>
                  <label className="col-span-2">Observaciones:
                    <textarea onChange={e => setDocValues({ ...docValues, note: e.target.value })} className="w-full mt-1 p-2.5 border rounded-xl font-normal" rows={3}></textarea>
                  </label>
                </div>
                <div className="flex justify-end gap-2 pt-4 border-t">
                  <button type="button" onClick={() => setModalType('perfil')} className="px-4 py-2 bg-slate-100 rounded-xl text-xs font-bold">Volver</button>
                  <button type="submit" className="px-4 py-2 bg-[#d9b354] rounded-xl text-xs font-bold shadow-sm">Guardar documento</button>
                </div>
              </form>
            )}

          </div>
        </div>
      )}
    </div>
  )
}