import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { supabase } from '../services/supabase'

const EXTERNAL_STATUSES = ['Activo', 'Finalizado', 'Inactivo']

const TYPES_DOCS = [
  'Boleta de honorarios',
  'Comprobante de pago',
  'Contrato de prestación',
  'Informe de trabajo',
  'Orden de compra',
  'Otro documento'
]

const STORAGE_BUCKET = 'rrhh-documentos'

const DOC_COLUMNS =
  'id, person_id, type, date, expiry, note, file_name, file_path'

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
  | null

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
    status: person.status || 'Activo',
    notes: person.notes || ''
  }
}

function storagePath(personId: string | number, file: File): string {
  const extension = file.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'bin'
  const unique = crypto.randomUUID()
  return `externos/${personId}/${unique}.${extension}`
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

export default function ExternosPage() {
  const [people, setPeople] = useState<any[]>([])
  const [docs, setDocs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [pageError, setPageError] = useState('')

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const [modalType, setModalType] = useState<ModalType>(null)
  const [selectedPerson, setSelectedPerson] = useState<any>(null)
  const [formValues, setFormValues] = useState<any>(getPersonForm())

  const [docValues, setDocValues] = useState(emptyDocument)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

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
        .eq('type', 'externos')

      if (peopleResult.error) throw peopleResult.error

      const nextPeople = peopleResult.data || []
      const nextDocs: any[] = []

      // Cargamos solo metadatos, sin file_data.
      for (let i = 0; i < nextPeople.length; i += 100) {
        const personIds = nextPeople
          .slice(i, i + 100)
          .map(person => person.id)

        // Paginamos los documentos de cada lote.
        const pageSize = 500

        for (let offset = 0; ; offset += pageSize) {
          const docsResult = await supabase
            .from('rrhh_documentos')
            .select(DOC_COLUMNS)
            .in('person_id', personIds)
            .order('id', { ascending: true })
            .range(offset, offset + pageSize - 1)

          if (docsResult.error) throw docsResult.error

          const batch = docsResult.data || []
          nextDocs.push(...batch)

          if (batch.length < pageSize) break
        }
      }

      setPeople(nextPeople)
      setDocs(nextDocs)
    } catch (error) {
      console.error('Error cargando personal externo:', error)
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
          .eq('type', 'externos')
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
            type: 'externos'
          }])
          .select('*')
          .single()

        if (error) throw error

        setPeople(current => [...current, data])
      }

      setModalType(null)
      setFormValues(getPersonForm())
    } catch (error) {
      console.error('Error guardando personal externo:', error)
      alert(`No se pudo guardar: ${getErrorMessage(error)}`)
    } finally {
      finishOperation()
    }
  }

  async function handleSaveDocument(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!selectedPerson) return
    if (!selectedFile) {
      alert('Selecciona un archivo antes de guardar.')
      return
    }
    if (!beginOperation('Guardando archivo...')) return

    const path = storagePath(selectedPerson.id, selectedFile)
    let uploaded = false

    try {
      const { error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(path, selectedFile, {
          contentType: selectedFile.type || 'application/octet-stream',
          upsert: false
        })
      if (uploadError) throw uploadError
      uploaded = true

      const { data, error } = await supabase
        .from('rrhh_documentos')
        .insert([{
          person_id: selectedPerson.id,
          type: docValues.type,
          date: docValues.date || null,
          expiry: docValues.expiry || null,
          note: docValues.note.trim(),
          file_name: selectedFile.name,
          file_path: path
        }])
        .select(DOC_COLUMNS)
        .single()
      if (error) throw error

      setDocs(current => [...current, data])
      setSelectedFile(null)
      setDocValues(emptyDocument())
      setModalType('perfil')
    } catch (error) {
      console.error('Error guardando documento:', error)
      if (uploaded) {
        const { error: cleanupError } = await supabase.storage
          .from(STORAGE_BUCKET)
          .remove([path])
        if (cleanupError) {
          console.warn('Archivo sin registro: requiere limpieza manual:', path, cleanupError)
        }
      }
      alert(`No se pudo completar el guardado: ${getErrorMessage(error)}`)
    } finally {
      finishOperation()
    }
  }

  async function handleDownload(doc: any) {
    if (!beginOperation('Descargando archivo...')) return
    setDownloadingId(String(doc.id))

    try {
      let blob: Blob
      let filename = doc.file_name || 'documento'

      if (doc.file_path) {
        const { data, error } = await supabase.storage
          .from(STORAGE_BUCKET)
          .download(doc.file_path)
        if (error) throw error
        blob = data
      } else {
        // Compatibilidad con archivos anteriores a la migración.
        const { data, error } = await supabase
          .from('rrhh_documentos')
          .select('file_data, file_name')
          .eq('id', doc.id)
          .eq('person_id', doc.person_id)
          .single()
        if (error) throw error
        if (!data?.file_data) throw new Error('Este documento no tiene un archivo adjunto.')
        blob = dataUrlToBlob(data.file_data)
        filename = data.file_name || filename
      }

      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.setTimeout(() => URL.revokeObjectURL(url), 60000)
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
    if (!confirmed || !beginOperation('Eliminando documento...')) return
    setDeletingId(String(doc.id))

    try {
      // Primero eliminamos el registro. Si falla, el archivo sigue intacto.
      const { data, error } = await supabase
        .from('rrhh_documentos')
        .delete()
        .eq('id', doc.id)
        .eq('person_id', selectedPerson.id)
        .select('id')
        .single()
      if (error) throw error
      if (!data) throw new Error('No se eliminó el documento. Revisa los permisos.')

      setDocs(current => current.filter(item => !sameId(item.id, doc.id)))

      if (doc.file_path) {
        const { error: storageError } = await supabase.storage
          .from(STORAGE_BUCKET)
          .remove([doc.file_path])
        if (storageError) {
          console.warn('Archivo pendiente de limpieza en Storage:', doc.file_path, storageError)
          alert('Se eliminó el registro, pero no el archivo de Storage. Avísale al administrador para limpiarlo.')
        }
      }
    } catch (error) {
      console.error('Error eliminando documento:', error)
      alert(`No se pudo eliminar: ${getErrorMessage(error)}`)
    } finally {
      setDeletingId(null)
      finishOperation()
    }
  }

  const filtered = people.filter(person => {
    const matchSearch = [
      person.name,
      person.rut,
      person.role
    ]
      .join(' ')
      .toLowerCase()
      .includes(search.toLowerCase())

    const matchStatus =
      !statusFilter || person.status === statusFilter

    return matchSearch && matchStatus
  })

  const personDocs = selectedPerson
    ? docs.filter(doc =>
        sameId(doc.person_id, selectedPerson.id)
      )
    : []

  if (loading) {
    return (
      <div className="p-8 text-sm text-slate-500 font-sans">
        Cargando personal externo...
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
            Personal externo
          </h1>

          <p className="text-xs text-slate-500 mt-1">
            Control de servicios, honorarios, pagos e informes.
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

      <div className="flex gap-3 flex-wrap">
        <input
          type="text"
          placeholder="Buscar por nombre, RUT o servicio"
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

          {EXTERNAL_STATUSES.map(status => (
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
                  No hay personas para estos filtros.
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
                      ? 'Agregar personal externo'
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
                      {EXTERNAL_STATUSES.map(status => (
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

            {/* VER PERFIL */}
            {modalType === 'perfil' && selectedPerson && (
              <div className="space-y-4">
                <div className="flex justify-between items-center gap-3 border-b pb-3">
                  <div>
                    <h2 className="text-xl font-black text-amber-900">
                      {selectedPerson.name}
                    </h2>

                    <span className="text-[10px] uppercase font-bold bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full">
                      Personal externo
                    </span>
                  </div>

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

                <p className="text-xs text-slate-600">
                  Cargo o servicio: {selectedPerson.role || '—'} ·{' '}
                  Estado: {selectedPerson.status || '—'}
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