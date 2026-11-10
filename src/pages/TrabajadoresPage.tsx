import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { supabase } from '../services/supabase'

const WORKER_STATUSES = ['Activo', 'Desvinculado', 'Renuncia']

const TYPES_DOCS = [
  'Contrato de trabajo',
  'Anexo de contrato',
  'Liquidación de sueldo',
  'Comprobante de pago',
  'Registro de horas extra',
  'Acuerdo de recuperación de horas',
  'Licencia o permiso',
  'Finiquito',
  'Otro documento'
]

const DOC_COLUMNS =
  'id, person_id, type, date, expiry, note, file_name'

const inputClass =
  'w-full mt-1 p-2.5 border rounded-xl bg-white font-normal'

const buttonClass =
  'px-3 py-1.5 bg-[#eee8db] rounded-xl font-bold text-xs disabled:opacity-50 disabled:cursor-not-allowed'

const primaryClass =
  'px-4 py-2 bg-[#d9b354] rounded-xl text-xs font-bold shadow-sm disabled:opacity-50 disabled:cursor-not-allowed'

const dangerClass =
  'px-3 py-1.5 bg-[#fae3e1] text-[#932c2c] rounded-xl font-bold text-xs disabled:opacity-50 disabled:cursor-not-allowed'

type ModalType =
  | 'agregar'
  | 'editar'
  | 'perfil'
  | 'agregarDoc'
  | 'desvincular'
  | null

type SubTab = 'activos' | 'ex' | 'renuncias'

function today() {
  const date = new Date()

  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0')
  ].join('-')
}

function sameId(a: unknown, b: unknown) {
  return String(a) === String(b)
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

function emptyDocument() {
  return {
    type: TYPES_DOCS[0],
    date: today(),
    expiry: '',
    note: ''
  }
}

function getPersonForm(person: any = {}) {
  return {
    name: person.name || '',
    rut: person.rut || '',
    email: person.email || '',
    phone: person.phone || '',
    role: person.role || '',
    status:
      person.status === 'Renunciado'
        ? 'Renuncia'
        : person.status || 'Activo',
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

  if (!dataUrl.startsWith('data:') || comma < 0) {
    throw new Error('El archivo guardado tiene un formato inválido.')
  }

  const header = dataUrl.slice(0, comma)
  const content = dataUrl.slice(comma + 1)
  const mime =
    header.match(/^data:([^;,]+)/)?.[1] ||
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

export default function TrabajadoresPage() {
  const [people, setPeople] = useState<any[]>([])
  const [docs, setDocs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [pageError, setPageError] = useState('')

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [subTab, setSubTab] = useState<SubTab>('activos')

  const [modalType, setModalType] = useState<ModalType>(null)
  const [selectedPerson, setSelectedPerson] = useState<any>(null)
  const [formValues, setFormValues] = useState<any>(getPersonForm())

  const [docValues, setDocValues] = useState(emptyDocument)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const [exitDate, setExitDate] = useState(today)
  const [exitActionType, setExitActionType] = useState<
    'Desvinculado' | 'Renuncia'
  >('Desvinculado')

  const [busy, setBusy] = useState('')
  const operationRef = useRef(false)

  const [downloadingId, setDownloadingId] = useState<string | null>(
    null
  )
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    void fetchData()
  }, [])

  async function fetchData() {
    setLoading(true)
    setPageError('')

    try {
      const peopleResult = await supabase
        .from('rrhh_personas')
        .select('*')
        .eq('type', 'trabajadores')

      if (peopleResult.error) throw peopleResult.error

      const nextPeople = peopleResult.data || []
      const nextDocs: any[] = []

      // Solo metadatos, sin descargar file_data.
      // Dividimos el filtro en lotes de personas.
      for (let i = 0; i < nextPeople.length; i += 100) {
        const personIds = nextPeople
          .slice(i, i + 100)
          .map(person => person.id)

        const docsResult = await supabase
          .from('rrhh_documentos')
          .select(DOC_COLUMNS)
          .in('person_id', personIds)

        if (docsResult.error) throw docsResult.error

        nextDocs.push(...(docsResult.data || []))
      }

      setPeople(nextPeople)
      setDocs(nextDocs)
    } catch (error) {
      console.error('Error cargando trabajadores:', error)
      setPageError(getErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }

  function beginOperation(text: string) {
    if (operationRef.current) return false

    operationRef.current = true
    setBusy(text)
    return true
  }

  function finishOperation() {
    operationRef.current = false
    setBusy('')
  }

  function closeModal() {
    if (operationRef.current) return

    setModalType(null)
    setSelectedFile(null)
  }

  function openAdd() {
    setSelectedPerson(null)
    setFormValues(getPersonForm())
    setModalType('agregar')
  }

  function openEdit(person: any) {
    setSelectedPerson(person)
    setFormValues(getPersonForm(person))
    setModalType('editar')
  }

  function openExit(
    person: any,
    action: 'Desvinculado' | 'Renuncia'
  ) {
    setSelectedPerson(person)
    setExitActionType(action)
    setExitDate(today())
    setModalType('desvincular')
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
    if (!beginOperation('Guardando perfil...')) return

    try {
      const payload = getPersonForm(formValues)

      if (editing) {
        const { error } = await supabase
          .from('rrhh_personas')
          .update(payload)
          .eq('id', selectedPerson.id)
          .eq('type', 'trabajadores')
          .select('id')
          .single()

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
            type: 'trabajadores'
          }])
          .select('*')
          .single()

        if (error) throw error

        setPeople(current => [...current, data])
      }

      setModalType(null)
      setFormValues(getPersonForm())
    } catch (error) {
      console.error('Error guardando trabajador:', error)
      alert(`No se pudo guardar: ${getErrorMessage(error)}`)
    } finally {
      finishOperation()
    }
  }

  async function handleExecuteExit(
    e: FormEvent<HTMLFormElement>
  ) {
    e.preventDefault()

    if (!selectedPerson) return
    if (!beginOperation('Actualizando estado...')) return

    try {
      const payload = {
        status: exitActionType,
        unlinked_at: exitDate
      }

      const { error } = await supabase
        .from('rrhh_personas')
        .update(payload)
        .eq('id', selectedPerson.id)
        .eq('type', 'trabajadores')
        .select('id')
        .single()

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
      alert(`No se pudo actualizar: ${getErrorMessage(error)}`)
    } finally {
      finishOperation()
    }
  }

  async function handleSaveDocument(
    e: FormEvent<HTMLFormElement>
  ) {
    e.preventDefault()

    if (!selectedPerson) return

    if (!selectedFile) {
      alert('Selecciona un archivo antes de guardar.')
      return
    }

    if (!beginOperation('Guardando archivo...')) return

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
        .select(DOC_COLUMNS)
        .single()

      if (error) throw error

      // Actualizamos sin volver a descargar todos los documentos.
      setDocs(current => [...current, data])
      setSelectedFile(null)
      setDocValues(emptyDocument())
      setModalType('perfil')
    } catch (error) {
      console.error('Error guardando documento:', error)
      alert(
        `No se pudo completar el guardado: ${getErrorMessage(error)}`
      )
    } finally {
      finishOperation()
    }
  }

  async function handleDownload(doc: any) {
    if (!beginOperation('Descargando archivo...')) return

    setDownloadingId(String(doc.id))

    try {
      const { data, error } = await supabase
        .from('rrhh_documentos')
        .select('file_data, file_name')
        .eq('id', doc.id)
        .eq('person_id', doc.person_id)
        .single()

      if (error) throw error

      if (!data?.file_data) {
        throw new Error('Este documento no tiene un archivo adjunto.')
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
      setDownloadingId(null)
      finishOperation()
    }
  }

  async function handleDeleteDocument(doc: any) {
    if (operationRef.current || !selectedPerson) return

    const confirmed = window.confirm(
      `¿Eliminar definitivamente "${doc.file_name || doc.type}" de ${selectedPerson.name}?\n\nSe borrará este documento y su archivo adjunto. Esta acción no se puede deshacer.`
    )

    if (!confirmed) return
    if (!beginOperation('Eliminando documento...')) return

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
        throw new Error(
          'No se eliminó el documento. Revisa los permisos del usuario.'
        )
      }

      setDocs(current =>
        current.filter(item => !sameId(item.id, doc.id))
      )
    } catch (error) {
      console.error('Error eliminando documento:', error)
      alert(`No se pudo eliminar: ${getErrorMessage(error)}`)
    } finally {
      setDeletingId(null)
      finishOperation()
    }
  }

  const filtered = people.filter(person => {
    const isFormer = [
      'Desvinculado',
      'Renuncia',
      'Renunciado'
    ].includes(person.status)

    const matchTab =
      subTab === 'activos'
        ? !isFormer
        : subTab === 'renuncias'
          ? ['Renuncia', 'Renunciado'].includes(person.status)
          : person.status === 'Desvinculado'

    const matchSearch = [
      person.name,
      person.rut,
      person.role
    ]
      .join(' ')
      .toLowerCase()
      .includes(search.toLowerCase())

    const matchStatus =
      !statusFilter ||
      person.status === statusFilter ||
      (
        statusFilter === 'Renuncia' &&
        person.status === 'Renunciado'
      )

    return matchTab && matchSearch && matchStatus
  })

  const activosCount = people.filter(
    person =>
      !['Desvinculado', 'Renuncia', 'Renunciado'].includes(
        person.status
      )
  ).length

  const exCount = people.filter(
    person => person.status === 'Desvinculado'
  ).length

  const renunciaCount = people.filter(person =>
    ['Renuncia', 'Renunciado'].includes(person.status)
  ).length

  const personDocs = selectedPerson
    ? docs.filter(doc =>
        sameId(doc.person_id, selectedPerson.id)
      )
    : []

  const tabs: {
    id: SubTab
    label: string
    count: number
  }[] = [
    {
      id: 'activos',
      label: 'Trabajadores activos',
      count: activosCount
    },
    {
      id: 'ex',
      label: 'Ex trabajadores',
      count: exCount
    },
    {
      id: 'renuncias',
      label: 'Renuncias',
      count: renunciaCount
    }
  ]

  if (loading) {
    return (
      <div className="p-8 text-sm text-slate-500 font-sans">
        Cargando trabajadores...
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
            Trabajadores
          </h1>

          <p className="text-xs text-slate-500 mt-1">
            Gestión laboral y documental de trabajadores activos.
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

      {subTab === 'activos' && (
        <div className="bg-white p-5 rounded-2xl border border-[#ddd4c3] max-w-xs shadow-sm">
          <span className="text-xs text-slate-500 font-bold">
            Activo
          </span>

          <strong className="block text-3xl font-black text-slate-900 mt-1">
            {activosCount}
          </strong>
        </div>
      )}

      <div className="flex gap-3 flex-wrap">
        <input
          type="text"
          placeholder="Buscar por nombre, RUT o cargo"
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

          {WORKER_STATUSES.map(status => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
      </div>

      <div className="bg-white rounded-2xl border border-[#ddd4c3] overflow-x-auto shadow-sm">
        <table className="w-full text-left text-xs min-w-[900px]">
          <thead>
            <tr className="bg-[#faf7f0] text-[10px] font-black uppercase text-slate-500 border-b">
              <th className="p-3.5">Persona</th>
              <th className="p-3.5">RUT / Contacto</th>
              <th className="p-3.5">Cargo o servicio</th>
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
                <tr
                  key={person.id}
                  className="hover:bg-slate-50"
                >
                  <td className="p-3.5 font-bold">
                    {person.name}
                    <br />
                    <small className="text-slate-400 font-normal">
                      {person.role}
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
                    {person.role || '—'}
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
                          openExit(person, 'Desvinculado')
                        }
                        className={dangerClass}
                      >
                        Desvincular
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          openExit(person, 'Renuncia')
                        }
                        className={dangerClass}
                      >
                        Registrar renuncia
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
                  No hay trabajadores para estos filtros.
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
            {busy && (
              <p
                role="status"
                className="text-xs font-bold text-amber-800"
              >
                {busy} Espera sin cerrar esta ventana.
              </p>
            )}

            {/* AGREGAR / EDITAR */}
            {(modalType === 'agregar' ||
              modalType === 'editar') && (
              <form
                onSubmit={handleSavePerson}
                className="space-y-4"
              >
                <div className="flex justify-between items-center border-b pb-3">
                  <h2 className="text-lg font-black text-amber-900">
                    {modalType === 'agregar'
                      ? 'Agregar trabajador'
                      : 'Editar perfil'}
                  </h2>

                  <button
                    type="button"
                    disabled={!!busy}
                    onClick={closeModal}
                    className={buttonClass}
                  >
                    Cerrar
                  </button>
                </div>

                <fieldset
                  disabled={!!busy}
                  className="grid grid-cols-2 gap-4 text-xs font-bold"
                >
                  <label className="col-span-2">
                    Nombre completo:
                    <input
                      required
                      type="text"
                      value={formValues.name}
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
                      value={formValues.rut}
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
                      value={formValues.email}
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
                      value={formValues.phone}
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
                    Cargo o servicio:
                    <input
                      type="text"
                      value={formValues.role}
                      onChange={e =>
                        setFormValues({
                          ...formValues,
                          role: e.target.value
                        })
                      }
                      className={inputClass}
                    />
                  </label>

                  <label className="col-span-2">
                    Estado:
                    <select
                      value={formValues.status}
                      onChange={e =>
                        setFormValues({
                          ...formValues,
                          status: e.target.value
                        })
                      }
                      className={inputClass}
                    >
                      {WORKER_STATUSES.map(status => (
                        <option key={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="col-span-2">
                    Observaciones:
                    <textarea
                      value={formValues.notes}
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
                    disabled={!!busy}
                    onClick={closeModal}
                    className={buttonClass}
                  >
                    Cerrar
                  </button>

                  <button
                    type="submit"
                    disabled={!!busy}
                    className={primaryClass}
                  >
                    {busy ? 'Guardando...' : 'Guardar cambios'}
                  </button>
                </div>
              </form>
            )}

            {/* DESVINCULAR / RENUNCIA */}
            {modalType === 'desvincular' && selectedPerson && (
              <form
                onSubmit={handleExecuteExit}
                className="space-y-4"
              >
                <div className="flex justify-between items-center border-b pb-3">
                  <h2 className="text-lg font-black text-amber-900">
                    {exitActionType === 'Desvinculado'
                      ? 'Desvincular trabajador'
                      : 'Registrar renuncia'}
                  </h2>

                  <button
                    type="button"
                    disabled={!!busy}
                    onClick={closeModal}
                    className={buttonClass}
                  >
                    Cerrar
                  </button>
                </div>

                <p className="text-xs text-slate-700">
                  ¿Confirmas{' '}
                  {exitActionType === 'Desvinculado'
                    ? 'la desvinculación de'
                    : 'registrar la renuncia de'}{' '}
                  <b>{selectedPerson.name}</b>?
                </p>

                <p className="text-xs text-slate-500">
                  El perfil pasará a{' '}
                  <b>
                    {exitActionType === 'Desvinculado'
                      ? 'Ex trabajadores'
                      : 'Renuncias'}
                  </b>
                  , conservando sus datos y documentos.
                </p>

                <label className="block text-xs font-bold">
                  Fecha de término:
                  <input
                    required
                    disabled={!!busy}
                    type="date"
                    value={exitDate}
                    onChange={e => setExitDate(e.target.value)}
                    className={inputClass}
                  />
                </label>

                <div className="flex justify-end gap-2 pt-4 border-t">
                  <button
                    type="button"
                    disabled={!!busy}
                    onClick={closeModal}
                    className={buttonClass}
                  >
                    Cancelar
                  </button>

                  <button
                    type="submit"
                    disabled={!!busy}
                    className={dangerClass}
                  >
                    {busy
                      ? 'Guardando...'
                      : exitActionType === 'Desvinculado'
                        ? 'Confirmar desvinculación'
                        : 'Confirmar renuncia'}
                  </button>
                </div>
              </form>
            )}

            {/* VER PERFIL */}
            {modalType === 'perfil' && selectedPerson && (
              <div className="space-y-4">
                <div className="flex justify-between items-center gap-3 border-b pb-3">
                  <h2 className="text-xl font-black text-amber-900">
                    {selectedPerson.name}
                  </h2>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={!!busy}
                      onClick={() => openEdit(selectedPerson)}
                      className={buttonClass}
                    >
                      Editar perfil
                    </button>

                    <button
                      type="button"
                      disabled={!!busy}
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

                <div className="flex justify-between items-center gap-3 pt-2">
                  <h3 className="text-sm font-black text-slate-800">
                    Carpeta documental
                  </h3>

                  <button
                    type="button"
                    disabled={!!busy}
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
                      className="p-3 border rounded-xl flex justify-between items-center gap-3 flex-wrap text-xs"
                    >
                      <div className="min-w-0 flex-1">
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

                      <div className="flex gap-2 shrink-0">
                        <button
                          type="button"
                          disabled={!!busy}
                          onClick={() => void handleDownload(doc)}
                          className={buttonClass}
                        >
                          {downloadingId === String(doc.id)
                            ? 'Descargando...'
                            : 'Descargar'}
                        </button>

                        <button
                          type="button"
                          disabled={!!busy}
                          onClick={() =>
                            void handleDeleteDocument(doc)
                          }
                          className={dangerClass}
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

            {/* AGREGAR DOCUMENTO */}
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
                    disabled={!!busy}
                    onClick={() => setModalType('perfil')}
                    className={buttonClass}
                  >
                    Volver
                  </button>
                </div>

                <fieldset
                  disabled={!!busy}
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

                <div className="flex justify-end gap-2 pt-4 border-t">
                  <button
                    type="button"
                    disabled={!!busy}
                    onClick={() => setModalType('perfil')}
                    className={buttonClass}
                  >
                    Volver
                  </button>

                  <button
                    type="submit"
                    disabled={!!busy}
                    className={primaryClass}
                  >
                    {busy
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