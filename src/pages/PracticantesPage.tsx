import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { supabase } from '../services/supabase'

const PRACTICE_STATUSES = [
  'En práctica',
  'Práctica finalizada',
  'Desvinculado de práctica',
  'Práctica atrasada',
  'Práctica aprobada'
]

const TYPES_DOCS = [
  'Convenio de práctica',
  'Seguro escolar',
  'Carta de aceptación',
  'Registro de asistencia y horas',
  'Evaluación',
  'Informe de práctica',
  'Otro documento'
]

type ModalType =
  | 'agregar'
  | 'editar'
  | 'perfil'
  | 'agregarDoc'
  | 'cambiarEstado'
  | null

type SubTab =
  | 'en_practica'
  | 'finalizadas'
  | 'desvinculadas'
  | 'atrasadas'

const inputClass =
  'w-full mt-1 p-2.5 border rounded-xl bg-white font-normal'

const buttonClass =
  'px-3 py-1.5 bg-[#eee8db] rounded-xl font-bold text-xs disabled:opacity-50 disabled:cursor-not-allowed'

const primaryClass =
  'px-4 py-2 bg-[#d9b354] rounded-xl text-xs font-bold shadow-sm disabled:opacity-50 disabled:cursor-not-allowed'

function today() {
  const date = new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function emptyDocument() {
  return {
    type: TYPES_DOCS[0],
    date: today(),
    expiry: '',
    note: ''
  }
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

function sameId(a: unknown, b: unknown) {
  return String(a) === String(b)
}

function getPersonForm(person: any) {
  return {
    name: person.name || '',
    rut: person.rut || '',
    email: person.email || '',
    phone: person.phone || '',
    career: person.career || person.role || '',
    role: person.career || person.role || '',
    status: person.status || 'En práctica',
    institution_type: person.institution_type || 'Universidad',
    institution: person.institution || '',
    coordinator: person.coordinator || '',
    coordinator_email: person.coordinator_email || '',
    coordinator_phone: person.coordinator_phone || '',
    required_hours: person.required_hours ?? 400,
    notes: person.notes || ''
  }
}

function readFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result)
      } else {
        reject(new Error('No se pudo leer el archivo.'))
      }
    }

    reader.onerror = () => {
      reject(reader.error || new Error('Error leyendo el archivo.'))
    }

    reader.onabort = () => {
      reject(new Error('La lectura del archivo fue cancelada.'))
    }

    reader.readAsDataURL(file)
  })
}

function dataUrlToBlob(dataUrl: string) {
  const comma = dataUrl.indexOf(',')

  if (comma < 0) {
    throw new Error('El archivo guardado tiene un formato inválido.')
  }

  const header = dataUrl.slice(0, comma)
  const content = dataUrl.slice(comma + 1)
  const mime = header.match(/^data:([^;,]+)/)?.[1] ||
    'application/octet-stream'

  if (!header.includes(';base64')) {
    return new Blob([decodeURIComponent(content)], { type: mime })
  }

  const binary = atob(content)
  const bytes = new Uint8Array(binary.length)

  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }

  return new Blob([bytes], { type: mime })
}

export default function PracticantesPage() {
  const [people, setPeople] = useState<any[]>([])
  const [docs, setDocs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [pageError, setPageError] = useState('')

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [subTab, setSubTab] = useState<SubTab>('en_practica')

  const [modalType, setModalType] = useState<ModalType>(null)
  const [selectedPerson, setSelectedPerson] = useState<any>(null)
  const [formValues, setFormValues] = useState<any>({})
  const [docValues, setDocValues] = useState(emptyDocument)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const [targetStatus, setTargetStatus] = useState('')
  const [practiceReason, setPracticeReason] = useState('')
  const [practiceDate, setPracticeDate] = useState(today)

  const [saving, setSaving] = useState(false)
  const savingRef = useRef(false)

  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const downloadingRef = useRef(false)

  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    void fetchData()
  }, [])

  async function fetchData() {
    setLoading(true)
    setPageError('')

    try {
      // Solo datos del listado. NO descargamos file_data aquí.
      const [peopleResult, docsResult] = await Promise.all([
        supabase
          .from('rrhh_personas')
          .select('*')
          .eq('type', 'practicantes'),

        supabase
          .from('rrhh_documentos')
          .select('id, person_id, type, date, expiry, note, file_name')
      ])

      if (peopleResult.error) throw peopleResult.error
      if (docsResult.error) throw docsResult.error

      const nextPeople = peopleResult.data || []
      const personIds = new Set(
        nextPeople.map(person => String(person.id))
      )

      setPeople(nextPeople)

      setDocs(
        (docsResult.data || []).filter(doc =>
          personIds.has(String(doc.person_id))
        )
      )
    } catch (error) {
      console.error('Error cargando practicantes:', error)
      setPageError(getErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }

  function startSaving() {
    if (savingRef.current) return false

    savingRef.current = true
    setSaving(true)
    return true
  }

  function finishSaving() {
    savingRef.current = false
    setSaving(false)
  }

  function closeModal() {
    if (savingRef.current) return

    setModalType(null)
    setSelectedFile(null)
  }

  function openAdd() {
    setSelectedPerson(null)
    setFormValues(getPersonForm({}))
    setModalType('agregar')
  }

  function openEdit(person: any) {
    setSelectedPerson(person)
    setFormValues(getPersonForm(person))
    setModalType('editar')
  }

  function openStatusChange(person: any, status: string) {
    setSelectedPerson(person)
    setTargetStatus(status)
    setPracticeReason('')
    setPracticeDate(today())
    setModalType('cambiarEstado')
  }

  function openAddDocument() {
    setDocValues(emptyDocument())
    setSelectedFile(null)
    setModalType('agregarDoc')
  }

  async function handleSavePerson(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()

    const editing = modalType === 'editar'

    if (editing && !selectedPerson) return
    if (!startSaving()) return

    try {
      const payload = {
        ...formValues,
        required_hours: Number(formValues.required_hours) || 0
      }

      if (editing) {
        const { error } = await supabase
          .from('rrhh_personas')
          .update(payload)
          .eq('id', selectedPerson.id)

        if (error) throw error

        setPeople(current =>
          current.map(person =>
            sameId(person.id, selectedPerson.id)
              ? { ...person, ...payload }
              : person
          )
        )

        setSelectedPerson((current: any) =>
          current ? { ...current, ...payload } : null
        )
      } else {
        const { data, error } = await supabase
          .from('rrhh_personas')
          .insert([{
            ...payload,
            type: 'practicantes',
            completed_hours: 0
          }])
          .select('*')
          .single()

        if (error) throw error

        setPeople(current => [...current, data])
      }

      setModalType(null)
      setFormValues({})
    } catch (error) {
      console.error('Error guardando persona:', error)
      alert(`No se pudo guardar: ${getErrorMessage(error)}`)
    } finally {
      finishSaving()
    }
  }

  async function handleExecuteStatusChange(
    e: FormEvent<HTMLFormElement>
  ) {
    e.preventDefault()

    if (!selectedPerson) return

    const needsReason = [
      'Práctica atrasada',
      'Desvinculado de práctica'
    ].includes(targetStatus)

    if (needsReason && !practiceReason.trim()) {
      alert('Debes indicar el motivo.')
      return
    }

    if (!startSaving()) return

    try {
      const payload = {
        status: targetStatus,
        practice_status_date: practiceDate,
        practice_reason: needsReason ? practiceReason.trim() : ''
      }

      const { error } = await supabase
        .from('rrhh_personas')
        .update(payload)
        .eq('id', selectedPerson.id)

      if (error) throw error

      setPeople(current =>
        current.map(person =>
          sameId(person.id, selectedPerson.id)
            ? { ...person, ...payload }
            : person
        )
      )

      setSelectedPerson((current: any) =>
        current ? { ...current, ...payload } : null
      )

      setModalType(null)
    } catch (error) {
      console.error('Error cambiando estado:', error)
      alert(`No se pudo cambiar el estado: ${getErrorMessage(error)}`)
    } finally {
      finishSaving()
    }
  }

  async function handleAddHours(person: any) {
    if (savingRef.current) return

    const input = prompt('Horas realizadas que deseas agregar:', '8')

    if (input === null) return

    const added = Number(input)

    if (!input.trim() || !Number.isFinite(added) || added <= 0) {
      alert('Ingresa una cantidad de horas mayor que cero.')
      return
    }

    if (!startSaving()) return

    try {
      const newTotal = (Number(person.completed_hours) || 0) + added

      const { error } = await supabase
        .from('rrhh_personas')
        .update({ completed_hours: newTotal })
        .eq('id', person.id)

      if (error) throw error

      setPeople(current =>
        current.map(item =>
          sameId(item.id, person.id)
            ? { ...item, completed_hours: newTotal }
            : item
        )
      )

      setSelectedPerson((current: any) =>
        current && sameId(current.id, person.id)
          ? { ...current, completed_hours: newTotal }
          : current
      )
    } catch (error) {
      console.error('Error registrando horas:', error)
      alert(`No se pudieron registrar las horas: ${getErrorMessage(error)}`)
    } finally {
      finishSaving()
    }
  }

  async function handleSaveDocument(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()

    if (!selectedPerson) return

    if (!selectedFile) {
      alert('Selecciona un archivo antes de guardar.')
      return
    }

    if (!startSaving()) return

    try {
      const fileData = await readFile(selectedFile)

      const { data, error } = await supabase
        .from('rrhh_documentos')
        .insert([{
          person_id: selectedPerson.id,
          type: docValues.type,
          date: docValues.date || null,
          expiry: docValues.expiry || null,
          note: docValues.note.trim(),
          file_name: selectedFile.name,
          file_data: fileData
        }])
        // La respuesta tampoco vuelve a traer el archivo completo.
        .select('id, person_id, type, date, expiry, note, file_name')
        .single()

      if (error) throw error

      // Actualizamos la lista sin recargar todos los documentos.
      setDocs(current => [...current, data])
      setDocValues(emptyDocument())
      setSelectedFile(null)
      setModalType('perfil')
    } catch (error) {
      console.error('Error guardando documento:', error)
      alert(
        `No se pudo completar el guardado: ${getErrorMessage(error)}`
      )
    } finally {
      finishSaving()
    }
  }

  async function handleDeleteDocument(doc: any) {
    if (savingRef.current || downloadingRef.current || !selectedPerson) return

    const confirmed = window.confirm(
      `¿Eliminar definitivamente "${doc.file_name || doc.type}" de ${selectedPerson.name}?\n\nSe eliminará este documento y su archivo adjunto. Esta acción no se puede deshacer.`
    )

    if (!confirmed || !startSaving()) return

    setDeletingId(String(doc.id))

    try {
      const { data, error } = await supabase
        .from('rrhh_documentos')
        .delete()
        .eq('id', doc.id)
        .eq('person_id', selectedPerson.id)
        .select('id')
        .single()

      if (error) throw error
      if (!data) {
        throw new Error('No se eliminó el documento. Revisa los permisos del usuario.')
      }

      setDocs(current => current.filter(item => !sameId(item.id, doc.id)))
    } catch (error) {
      console.error('Error eliminando documento:', error)
      alert(`No se pudo eliminar el documento: ${getErrorMessage(error)}`)
    } finally {
      setDeletingId(null)
      finishSaving()
    }
  }

  async function handleDownload(doc: any) {
    if (downloadingRef.current || savingRef.current) return

    downloadingRef.current = true
    setDownloadingId(String(doc.id))

    try {
      // Solo pedimos el archivo elegido cuando lo necesitan.
      const { data, error } = await supabase
        .from('rrhh_documentos')
        .select('file_data, file_name')
        .eq('id', doc.id)
        .single()

      if (error) throw error

      if (!data?.file_data) {
        alert('Este documento no tiene un archivo adjunto.')
        return
      }

      const blob = dataUrlToBlob(data.file_data)
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')

      link.href = url
      link.download = data.file_name || 'documento'
      document.body.appendChild(link)
      link.click()
      link.remove()

      window.setTimeout(() => {
        URL.revokeObjectURL(url)
      }, 60000)
    } catch (error) {
      console.error('Error descargando documento:', error)
      alert(`No se pudo descargar: ${getErrorMessage(error)}`)
    } finally {
      downloadingRef.current = false
      setDownloadingId(null)
    }
  }

  const filtered = people.filter(person => {
    const matchTab =
      subTab === 'en_practica'
        ? person.status === 'En práctica'
        : subTab === 'finalizadas'
          ? ['Práctica finalizada', 'Práctica aprobada'].includes(
              person.status
            )
          : subTab === 'desvinculadas'
            ? person.status === 'Desvinculado de práctica'
            : person.status === 'Práctica atrasada'

    const matchSearch = [
      person.name,
      person.rut,
      person.institution
    ]
      .join(' ')
      .toLowerCase()
      .includes(search.toLowerCase())

    const matchStatus =
      !statusFilter || person.status === statusFilter

    return matchTab && matchSearch && matchStatus
  })

  const enPracticaCount = people.filter(
    person => person.status === 'En práctica'
  ).length

  const finalizadasCount = people.filter(person =>
    ['Práctica finalizada', 'Práctica aprobada'].includes(person.status)
  ).length

  const desvinculadasCount = people.filter(
    person => person.status === 'Desvinculado de práctica'
  ).length

  const atrasadasCount = people.filter(
    person => person.status === 'Práctica atrasada'
  ).length

  const personDocs = selectedPerson
    ? docs.filter(doc => sameId(doc.person_id, selectedPerson.id))
    : []

  const tabs: { id: SubTab; label: string; count: number }[] = [
    {
      id: 'en_practica',
      label: 'En práctica',
      count: enPracticaCount
    },
    {
      id: 'finalizadas',
      label: 'Prácticas finalizadas',
      count: finalizadasCount
    },
    {
      id: 'desvinculadas',
      label: 'Prácticas desvinculadas',
      count: desvinculadasCount
    },
    {
      id: 'atrasadas',
      label: 'Prácticas atrasadas',
      count: atrasadasCount
    }
  ]

  if (loading) {
    return (
      <div className="p-8 text-sm text-slate-500 font-sans">
        Cargando practicantes...
      </div>
    )
  }

  if (pageError) {
    return (
      <div className="p-8 space-y-4 font-sans">
        <p className="text-sm text-red-700">
          No se pudieron cargar los datos: {pageError}
        </p>

        <button
          type="button"
          onClick={() => void fetchData()}
          className={primaryClass}
        >
          Reintentar
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6 font-sans">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-black text-amber-900">
            Practicantes
          </h1>

          <p className="text-xs text-slate-500 mt-1">
            Seguimiento de convenios, institución, horas y cierre
            de la práctica.
          </p>
        </div>

        <button
          type="button"
          onClick={openAdd}
          className={primaryClass}
        >
          + Agregar
        </button>
      </div>

      <div className="flex gap-2 flex-wrap">
        {tabs.map(tab => (
          <button
            key={tab.id}
            type="button"
            onClick={() => {
              setSubTab(tab.id)
              setStatusFilter('')
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold ${
              subTab === tab.id
                ? 'bg-[#d9b354] text-slate-900'
                : 'bg-[#eee8db] text-slate-700'
            }`}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      <div className="flex gap-3 flex-wrap">
        <input
          type="text"
          placeholder="Buscar por nombre, RUT o institución"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full max-w-xs text-xs p-2.5 bg-white border border-[#cabfae] rounded-xl font-medium"
        />

        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="max-w-xs text-xs p-2.5 bg-white border border-[#cabfae] rounded-xl font-medium"
        >
          <option value="">Todos los estados</option>
          {PRACTICE_STATUSES.map(status => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
      </div>

      <div className="bg-white rounded-2xl border border-[#ddd4c3] overflow-x-auto shadow-sm">
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
            {filtered.map(person => {
              const count = docs.filter(doc =>
                sameId(doc.person_id, person.id)
              ).length

              return (
                <tr key={person.id} className="hover:bg-slate-50">
                  <td className="p-3.5 font-bold">
                    {person.name}
                    <br />
                    <small className="text-slate-400 font-normal">
                      {person.career || person.role}
                    </small>
                  </td>

                  <td className="p-3.5 font-mono">
                    {person.rut}
                    <br />
                    <small className="text-slate-400">
                      {person.email}
                      <br />
                      {person.phone}
                    </small>
                  </td>

                  <td className="p-3.5">
                    <b>{person.institution || 'Sin institución'}</b>
                    <br />
                    <small>
                      {person.completed_hours || 0} de{' '}
                      {person.required_hours || 0} horas
                    </small>
                  </td>

                  <td className="p-3.5 font-bold">
                    {count} documento(s)
                  </td>

                  <td className="p-3.5 font-bold text-emerald-700">
                    {person.status}
                  </td>

                  <td className="p-3.5">
                    <div className="flex gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedPerson(person)
                          setModalType('perfil')
                        }}
                        className={buttonClass}
                      >
                        Ver perfil
                      </button>

                      <button
                        type="button"
                        onClick={() => openEdit(person)}
                        className={buttonClass}
                      >
                        Editar
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          openStatusChange(
                            person,
                            'Práctica finalizada'
                          )
                        }
                        className={buttonClass}
                      >
                        Finalizar práctica
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          openStatusChange(
                            person,
                            'Desvinculado de práctica'
                          )
                        }
                        className="px-3 py-1.5 bg-[#fae3e1] text-[#932c2c] rounded-xl font-bold text-xs"
                      >
                        Desvincular práctica
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          openStatusChange(
                            person,
                            'Práctica atrasada'
                          )
                        }
                        className={buttonClass}
                      >
                        Marcar atrasada
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}

            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="p-8 text-center text-slate-400"
                >
                  No hay practicantes para estos filtros.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {modalType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div
            role="dialog"
            aria-modal="true"
            className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto"
          >
            {(modalType === 'agregar' || modalType === 'editar') && (
              <form
                onSubmit={handleSavePerson}
                className="space-y-4"
              >
                <div className="flex justify-between items-center border-b pb-3">
                  <h2 className="text-lg font-black text-amber-900">
                    {modalType === 'agregar'
                      ? 'Agregar practicante'
                      : 'Editar perfil'}
                  </h2>

                  <button
                    type="button"
                    disabled={saving}
                    onClick={closeModal}
                    className={buttonClass}
                  >
                    Cerrar
                  </button>
                </div>

                <fieldset
                  disabled={saving}
                  className="grid grid-cols-2 gap-4 text-xs font-bold"
                >
                  <label className="col-span-2">
                    Nombre completo:
                    <input
                      required
                      type="text"
                      value={formValues.name || ''}
                      onChange={e =>
                        setFormValues({
                          ...formValues,
                          name: e.target.value
                        })
                      }
                      className={inputClass}
                    />
                  </label>

                  <label>
                    RUT:
                    <input
                      required
                      type="text"
                      value={formValues.rut || ''}
                      onChange={e =>
                        setFormValues({
                          ...formValues,
                          rut: e.target.value
                        })
                      }
                      className={inputClass}
                    />
                  </label>

                  <label>
                    Correo:
                    <input
                      type="email"
                      value={formValues.email || ''}
                      onChange={e =>
                        setFormValues({
                          ...formValues,
                          email: e.target.value
                        })
                      }
                      className={inputClass}
                    />
                  </label>

                  <label>
                    Teléfono:
                    <input
                      type="text"
                      value={formValues.phone || ''}
                      onChange={e =>
                        setFormValues({
                          ...formValues,
                          phone: e.target.value
                        })
                      }
                      className={inputClass}
                    />
                  </label>

                  <label>
                    Carrera:
                    <input
                      type="text"
                      value={formValues.career || ''}
                      onChange={e =>
                        setFormValues({
                          ...formValues,
                          career: e.target.value,
                          role: e.target.value
                        })
                      }
                      className={inputClass}
                    />
                  </label>

                  <label>
                    Estado:
                    <select
                      value={formValues.status || 'En práctica'}
                      onChange={e =>
                        setFormValues({
                          ...formValues,
                          status: e.target.value
                        })
                      }
                      className={inputClass}
                    >
                      {PRACTICE_STATUSES.map(status => (
                        <option key={status}>{status}</option>
                      ))}
                    </select>
                  </label>

                  <label>
                    Tipo de institución:
                    <select
                      value={
                        formValues.institution_type || 'Universidad'
                      }
                      onChange={e =>
                        setFormValues({
                          ...formValues,
                          institution_type: e.target.value
                        })
                      }
                      className={inputClass}
                    >
                      {[
                        'Universidad',
                        'CFT/IP',
                        'Liceo',
                        'OTEC',
                        'Otra'
                      ].map(type => (
                        <option key={type}>{type}</option>
                      ))}
                    </select>
                  </label>

                  <label>
                    Nombre de institución:
                    <input
                      type="text"
                      value={formValues.institution || ''}
                      onChange={e =>
                        setFormValues({
                          ...formValues,
                          institution: e.target.value
                        })
                      }
                      className={inputClass}
                    />
                  </label>

                  <label>
                    Coordinador/a de práctica:
                    <input
                      type="text"
                      value={formValues.coordinator || ''}
                      onChange={e =>
                        setFormValues({
                          ...formValues,
                          coordinator: e.target.value
                        })
                      }
                      className={inputClass}
                    />
                  </label>

                  <label>
                    Correo coordinador:
                    <input
                      type="email"
                      value={formValues.coordinator_email || ''}
                      onChange={e =>
                        setFormValues({
                          ...formValues,
                          coordinator_email: e.target.value
                        })
                      }
                      className={inputClass}
                    />
                  </label>

                  <label>
                    Teléfono coordinador:
                    <input
                      type="text"
                      value={formValues.coordinator_phone || ''}
                      onChange={e =>
                        setFormValues({
                          ...formValues,
                          coordinator_phone: e.target.value
                        })
                      }
                      className={inputClass}
                    />
                  </label>

                  <label>
                    Horas exigidas:
                    <input
                      type="number"
                      min="0"
                      step="any"
                      required
                      value={formValues.required_hours ?? 400}
                      onChange={e =>
                        setFormValues({
                          ...formValues,
                          required_hours: e.target.value
                        })
                      }
                      className={inputClass}
                    />
                  </label>

                  <label className="col-span-2">
                    Observaciones:
                    <textarea
                      value={formValues.notes || ''}
                      onChange={e =>
                        setFormValues({
                          ...formValues,
                          notes: e.target.value
                        })
                      }
                      className={inputClass}
                      rows={3}
                    />
                  </label>
                </fieldset>

                <div className="flex justify-end gap-2 pt-4 border-t">
                  <button
                    type="button"
                    disabled={saving}
                    onClick={closeModal}
                    className={buttonClass}
                  >
                    Cerrar
                  </button>

                  <button
                    type="submit"
                    disabled={saving}
                    className={primaryClass}
                  >
                    {saving ? 'Guardando...' : 'Guardar cambios'}
                  </button>
                </div>
              </form>
            )}

            {modalType === 'cambiarEstado' && selectedPerson && (
              <form
                onSubmit={handleExecuteStatusChange}
                className="space-y-4"
              >
                <div className="flex justify-between items-center border-b pb-3">
                  <h2 className="text-lg font-black text-amber-900">
                    {targetStatus}
                  </h2>

                  <button
                    type="button"
                    disabled={saving}
                    onClick={closeModal}
                    className={buttonClass}
                  >
                    Cerrar
                  </button>
                </div>

                <p className="text-xs text-slate-700">
                  ¿Confirmas cambiar la práctica de{' '}
                  <b>{selectedPerson.name}</b> a{' '}
                  <b>{targetStatus}</b>?
                </p>

                <fieldset disabled={saving} className="space-y-4">
                  <label className="block text-xs font-bold">
                    Fecha del cambio:
                    <input
                      required
                      type="date"
                      value={practiceDate}
                      onChange={e => setPracticeDate(e.target.value)}
                      className={inputClass}
                    />
                  </label>

                  {[
                    'Práctica atrasada',
                    'Desvinculado de práctica'
                  ].includes(targetStatus) && (
                    <label className="block text-xs font-bold">
                      Motivo (obligatorio):
                      <textarea
                        required
                        value={practiceReason}
                        onChange={e =>
                          setPracticeReason(e.target.value)
                        }
                        className={inputClass}
                        rows={3}
                      />
                    </label>
                  )}
                </fieldset>

                <div className="flex justify-end gap-2 pt-4 border-t">
                  <button
                    type="button"
                    disabled={saving}
                    onClick={closeModal}
                    className={buttonClass}
                  >
                    Cancelar
                  </button>

                  <button
                    type="submit"
                    disabled={saving}
                    className={primaryClass}
                  >
                    {saving ? 'Guardando...' : 'Confirmar'}
                  </button>
                </div>
              </form>
            )}

            {modalType === 'perfil' && selectedPerson && (
              <div className="space-y-4">
                <div className="flex justify-between items-center gap-3 border-b pb-3">
                  <div>
                    <h2 className="text-xl font-black text-amber-900">
                      {selectedPerson.name}
                    </h2>

                    <span className="text-[10px] uppercase font-bold bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full">
                      Practicantes
                    </span>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => openEdit(selectedPerson)}
                      className={buttonClass}
                    >
                      Editar perfil
                    </button>

                    <button
                      type="button"
                      disabled={saving}
                      onClick={closeModal}
                      className={buttonClass}
                    >
                      Cerrar
                    </button>
                  </div>
                </div>

                <p className="text-xs text-slate-600">
                  <b>RUT:</b> {selectedPerson.rut || '—'} ·{' '}
                  <b>Correo:</b> {selectedPerson.email || '—'} ·{' '}
                  <b>Teléfono:</b> {selectedPerson.phone || '—'}
                </p>

                <div className="bg-[#fffdf9] p-4 rounded-2xl border border-[#ddd4c3] space-y-2">
                  <h3 className="font-bold text-xs text-slate-900">
                    {selectedPerson.institution || 'Sin institución'}
                  </h3>

                  <p className="text-xs text-slate-500">
                    Coordinador: {selectedPerson.coordinator || '—'} ·{' '}
                    {selectedPerson.coordinator_email || '—'} ·{' '}
                    {selectedPerson.coordinator_phone || '—'}
                  </p>

                  <p className="text-xs text-slate-700">
                    Estado: <b>{selectedPerson.status}</b>
                  </p>

                  <p className="text-xs text-slate-700">
                    Horas:{' '}
                    <b>
                      {selectedPerson.completed_hours || 0} /{' '}
                      {selectedPerson.required_hours || 0}
                    </b>
                  </p>

                  {selectedPerson.practice_reason && (
                    <p className="text-xs text-slate-700">
                      Motivo: {selectedPerson.practice_reason}
                    </p>
                  )}

                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => void handleAddHours(selectedPerson)}
                    className={buttonClass}
                  >
                    {deletingId !== null ? 'Eliminando documento...' : saving ? 'Guardando...' : '+ Registrar horas'}
                  </button>
                </div>

                <div className="flex justify-between items-center pt-2">
                  <h3 className="text-sm font-black text-slate-800">
                    Carpeta documental
                  </h3>

                  <button
                    type="button"
                    disabled={saving}
                    onClick={openAddDocument}
                    className={primaryClass}
                  >
                    + Agregar documento
                  </button>
                </div>

                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {personDocs.map(doc => (
                    <div
                      key={doc.id}
                      className="p-3 border rounded-xl flex justify-between items-center gap-3 text-xs"
                    >
                      <div className="min-w-0">
                        <b>{doc.type}</b>

                        {doc.file_name && (
                          <span className="text-amber-700 font-mono break-all">
                            {' '}({doc.file_name})
                          </span>
                        )}

                        <br />

                        <small className="text-slate-500">
                          {doc.date || 'Sin fecha'} ·{' '}
                          {doc.note || 'Sin observaciones'}
                        </small>
                      </div>

                      <div className="flex gap-2 flex-wrap shrink-0">
                        <button
                          type="button"
                          disabled={saving || downloadingId !== null}
                          onClick={() => void handleDownload(doc)}
                          className={buttonClass}
                        >
                          {downloadingId === String(doc.id)
                            ? 'Descargando...'
                            : 'Descargar'}
                        </button>

                        <button
                          type="button"
                          disabled={saving || downloadingId !== null}
                          onClick={() => void handleDeleteDocument(doc)}
                          className="px-3 py-1.5 bg-[#fae3e1] text-[#932c2c] rounded-xl font-bold text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {deletingId === String(doc.id)
                            ? 'ELIMINANDO...'
                            : 'ELIMINAR'}
                        </button>
                      </div>
                    </div>
                  ))}

                  {personDocs.length === 0 && (
                    <p className="text-center py-6 text-xs text-slate-400">
                      Aún no hay documentos.
                    </p>
                  )}
                </div>
              </div>
            )}

            {modalType === 'agregarDoc' && selectedPerson && (
              <form
                onSubmit={handleSaveDocument}
                className="space-y-4"
              >
                <div className="flex justify-between items-center border-b pb-3">
                  <h2 className="text-lg font-black text-amber-900">
                    Agregar documento
                  </h2>

                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => setModalType('perfil')}
                    className={buttonClass}
                  >
                    Volver
                  </button>
                </div>

                <fieldset
                  disabled={saving}
                  className="grid grid-cols-2 gap-4 text-xs font-bold"
                >
                  <label className="col-span-2">
                    Tipo de documento:
                    <select
                      value={docValues.type}
                      onChange={e =>
                        setDocValues({
                          ...docValues,
                          type: e.target.value
                        })
                      }
                      className={inputClass}
                    >
                      {TYPES_DOCS.map(type => (
                        <option key={type}>{type}</option>
                      ))}
                    </select>
                  </label>

                  <label>
                    Fecha:
                    <input
                      required
                      type="date"
                      value={docValues.date}
                      onChange={e =>
                        setDocValues({
                          ...docValues,
                          date: e.target.value
                        })
                      }
                      className={inputClass}
                    />
                  </label>

                  <label>
                    Vencimiento:
                    <input
                      type="date"
                      value={docValues.expiry}
                      onChange={e =>
                        setDocValues({
                          ...docValues,
                          expiry: e.target.value
                        })
                      }
                      className={inputClass}
                    />
                  </label>

                  <label className="col-span-2">
                    Archivo:
                    <input
                      required
                      type="file"
                      onChange={e =>
                        setSelectedFile(e.target.files?.[0] || null)
                      }
                      className="w-full mt-1 p-2 border rounded-xl font-normal bg-white text-xs file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-[#eee8db]"
                    />

                    {selectedFile && (
                      <span className="block mt-2 text-slate-500 font-normal break-all">
                        Seleccionado: {selectedFile.name}
                      </span>
                    )}
                  </label>

                  <label className="col-span-2">
                    Observaciones:
                    <textarea
                      value={docValues.note}
                      onChange={e =>
                        setDocValues({
                          ...docValues,
                          note: e.target.value
                        })
                      }
                      className={inputClass}
                      rows={3}
                    />
                  </label>
                </fieldset>

                {saving && (
                  <p
                    role="status"
                    className="text-xs font-bold text-amber-800"
                  >
                    Guardando archivo. Espera sin cerrar esta ventana.
                  </p>
                )}

                <div className="flex justify-end gap-2 pt-4 border-t">
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => setModalType('perfil')}
                    className={buttonClass}
                  >
                    Volver
                  </button>

                  <button
                    type="submit"
                    disabled={saving}
                    className={primaryClass}
                  >
                    {saving
                      ? 'Guardando archivo...'
                      : 'Guardar documento'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  )
}