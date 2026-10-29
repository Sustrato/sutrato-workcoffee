import { useEffect, useState } from 'react'
import { ExternalLink, FileText, FileUp, LoaderCircle, Trash2, X, CheckCircle2, AlertCircle } from 'lucide-react'
import { deleteSiiNoticeResponse, deleteSiiNoticeRecord, getSiiNoticeHistory, type SiiNoticeRecord, uploadSiiNoticeResponse } from '../services/siiNotices'

function formatCreatedAt(value: string): string {
  return new Intl.DateTimeFormat('es-CL', {
    dateStyle: 'medium',
    timeStyle: 'medium',
  }).format(new Date(value))
}

export default function HistorialSII() {
  const [notices, setNotices] = useState<SiiNoticeRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [uploadingNoticeId, setUploadingNoticeId] = useState<string | null>(null)
  
  // Estados de modales
  const [noticeToDeleteResponse, setNoticeToDeleteResponse] = useState<SiiNoticeRecord | null>(null)
  const [noticeToDeleteRecord, setNoticeToDeleteRecord] = useState<SiiNoticeRecord | null>(null)

  const [deleteConfirmation, setDeleteConfirmation] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  
  // Mensajes flotantes / notificaciones profesionales
  const [mensajeExito, setMensajeExito] = useState<string | null>(null)
  const [error, setError] = useState('')

  const mostrarExito = (msg: string) => {
    setMensajeExito(msg)
    setTimeout(() => setMensajeExito(null), 4000)
  }

  useEffect(() => {
    let active = true
    getSiiNoticeHistory()
      .then((history) => { if (active) setNotices(history) })
      .catch((loadError: unknown) => {
        if (active) {
          console.error('Error cargando historial SII:', loadError)
          setError('No se pudo cargar el historial del SII en este momento.')
        }
      })
      .finally(() => { if (active) setIsLoading(false) })
    return () => { active = false }
  }, [])

  async function handleResponseUpload(notice: SiiNoticeRecord, file: File | undefined) {
    if (!file || uploadingNoticeId) return
    setUploadingNoticeId(notice.id)
    setError('')
    try {
      const responseUrl = await uploadSiiNoticeResponse(notice.id, file)
      setNotices((current) => current.map((item) =>
        item.id === notice.id ? { ...item, respuesta_sii_url: responseUrl } : item,
      ))
      mostrarExito('¡Respuesta del SII subida correctamente!')
    } catch (uploadError) {
      console.error('Error al subir respuesta SII:', uploadError)
      setError('No se pudo completar la subida de la respuesta del SII. Inténtalo nuevamente.')
    } finally {
      setUploadingNoticeId(null)
    }
  }

  async function handleResponseDelete() {
    if (!noticeToDeleteResponse || deleteConfirmation !== 'ELIMINAR' || isDeleting) return
    setIsDeleting(true)
    setDeleteError('')
    setError('')
    try {
      await deleteSiiNoticeResponse(noticeToDeleteResponse)
      setNotices((current) => current.map((item) =>
        item.id === noticeToDeleteResponse.id ? { ...item, respuesta_sii_url: null } : item,
      ))
      setNoticeToDeleteResponse(null)
      setDeleteConfirmation('')
      mostrarExito('Se borró con éxito la respuesta del SII de la base de datos.')
    } catch (deleteResponseError) {
      console.error('No se pudo eliminar la respuesta del SII:', deleteResponseError)
      setDeleteError('No se pudo eliminar la respuesta del SII de forma remota.')
    } finally {
      setIsDeleting(false)
    }
  }

  async function handleRecordDelete() {
    if (!noticeToDeleteRecord || deleteConfirmation !== 'ELIMINAR' || isDeleting) return
    setIsDeleting(true)
    setDeleteError('')
    setError('')
    try {
      await deleteSiiNoticeRecord(noticeToDeleteRecord)
      setNotices((current) => current.filter((item) => item.id !== noticeToDeleteRecord.id))
      setNoticeToDeleteRecord(null)
      setDeleteConfirmation('')
      mostrarExito('Se borró con éxito el registro completo de la base de datos.')
    } catch (deleteRecordError) {
      console.error('No se pudo eliminar el registro completo:', deleteRecordError)
      setDeleteError('No se pudo eliminar el registro completo de la base de datos.')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 relative">
      
      {/* NOTIFICACIONES FLOTANTES SUPERIORES */}
      {(mensajeExito || error) && (
        <div className="fixed top-6 right-6 z-[9999] max-w-md">
          {mensajeExito && (
            <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-900 text-emerald-50 px-5 py-4 shadow-2xl">
              <CheckCircle2 size={22} className="text-emerald-400 shrink-0" />
              <div className="text-xs font-bold">{mensajeExito}</div>
              <button onClick={() => setMensajeExito(null)} className="ml-auto text-emerald-300 hover:text-white"><X size={16} /></button>
            </div>
          )}
          {error && (
            <div className="flex items-center gap-3 rounded-2xl border border-rose-200 bg-rose-950 text-rose-50 px-5 py-4 shadow-2xl">
              <AlertCircle size={22} className="text-rose-400 shrink-0" />
              <div className="text-xs font-bold">{error}</div>
              <button onClick={() => setError('')} className="ml-auto text-rose-300 hover:text-white"><X size={16} /></button>
            </div>
          )}
        </div>
      )}

      <header className="flex items-center gap-3">
        <span className="flex size-11 items-center justify-center rounded-xl bg-red-100 text-red-700">
          <FileText size={21} />
        </span>
        <div>
          <h1 className="text-xl font-bold text-red-700">Historial SII</h1>
          <p className="mt-1 text-sm text-slate-500">Avisos consolidados generados y almacenados.</p>
        </div>
      </header>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {isLoading ? (
          <div className="flex items-center justify-center gap-2 p-12 text-sm text-slate-500 font-medium">
            <LoaderCircle size={18} className="animate-spin text-red-700" /> Cargando historial...
          </div>
        ) : notices.length === 0 ? (
          <p className="p-10 text-center text-sm text-slate-500 font-medium">Aún no hay avisos SII registrados.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[950px] text-left">
              <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-3">Archivo</th>
                  <th className="px-5 py-3">Fecha de creación</th>
                  <th className="px-5 py-3 text-right">Documento</th>
                  <th className="px-5 py-3 text-right">Respuesta SII</th>
                  <th className="px-5 py-3 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm font-medium">
                {notices.map((notice) => (
                  <tr key={notice.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-5 py-4 text-slate-800">{notice.nombre_archivo}</td>
                    <td className="px-5 py-4 text-slate-600">
                      <time dateTime={notice.created_at}>{formatCreatedAt(notice.created_at)}</time>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <a 
                        href={notice.documento_url} 
                        target="_blank" 
                        rel="noreferrer" 
                        className="inline-flex h-9 items-center gap-2 rounded-xl border border-slate-200 px-3 text-xs font-bold text-slate-700 hover:border-red-300 hover:bg-red-50 hover:text-red-700 transition"
                      >
                        <ExternalLink size={15} /> Ver / descargar
                      </a>
                    </td>
                    <td className="px-5 py-4 text-right">
                      {notice.respuesta_sii_url ? (
                        <div className="flex justify-end gap-2">
                          <a 
                            href={notice.respuesta_sii_url} 
                            target="_blank" 
                            rel="noreferrer" 
                            className="inline-flex h-9 items-center gap-2 rounded-xl border border-slate-200 px-3 text-xs font-bold text-slate-700 hover:border-red-300 hover:bg-red-50 hover:text-red-700 transition"
                          >
                            <ExternalLink size={15} /> Ver / descargar
                          </a>
                          <button
                            type="button"
                            onClick={() => {
                              setNoticeToDeleteResponse(notice)
                              setDeleteConfirmation('')
                              setDeleteError('')
                            }}
                            disabled={uploadingNoticeId !== null || isDeleting}
                            className="inline-flex h-9 items-center gap-2 rounded-xl border border-rose-200 px-3 text-xs font-bold text-rose-700 hover:bg-rose-50 transition disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <Trash2 size={15} /> Eliminar respuesta
                          </button>
                        </div>
                      ) : (
                        <div className="flex justify-end">
                          <input
                            id={`sii-response-${notice.id}`}
                            type="file"
                            accept="application/pdf,image/jpeg,image/png,.pdf,.jpg,.jpeg,.png"
                            className="sr-only"
                            disabled={uploadingNoticeId !== null}
                            onChange={(event) => {
                              void handleResponseUpload(notice, event.target.files?.[0])
                              event.currentTarget.value = ''
                            }}
                          />
                          <label 
                            htmlFor={`sii-response-${notice.id}`} 
                            className={`inline-flex h-9 cursor-pointer items-center gap-2 rounded-xl border border-red-200 px-3 text-xs font-bold text-red-700 hover:bg-red-50 transition ${uploadingNoticeId !== null ? 'pointer-events-none opacity-60' : ''}`}
                          >
                            {uploadingNoticeId === notice.id ? <LoaderCircle size={15} className="animate-spin" /> : <FileUp size={15} />}
                            {uploadingNoticeId === notice.id ? 'Subiendo...' : 'Subir respuesta'}
                          </label>
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-4 text-center">
                      <button
                        type="button"
                        onClick={() => {
                          setNoticeToDeleteRecord(notice)
                          setDeleteConfirmation('')
                          setDeleteError('')
                        }}
                        disabled={isDeleting}
                        title="Eliminar registro completo"
                        className="inline-flex size-9 items-center justify-center rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 transition disabled:opacity-50"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* MODAL PARA ELIMINAR RESPUESTA */}
      {noticeToDeleteResponse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4 backdrop-blur-[2px]">
          <section role="alertdialog" aria-modal="true" className="my-auto w-full max-w-lg overflow-hidden rounded-3xl border border-rose-100 bg-white shadow-2xl shadow-slate-950/25">
            <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5">
              <div className="flex items-start gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-700"><Trash2 size={19} /></span>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Eliminar respuesta SII</h2>
                  <p className="mt-1 text-xs text-slate-600 font-medium">{noticeToDeleteResponse.nombre_archivo}</p>
                </div>
              </div>
              <button type="button" onClick={() => { setNoticeToDeleteResponse(null); setDeleteConfirmation(''); setDeleteError('') }} disabled={isDeleting} className="flex size-9 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50">
                <X size={19} />
              </button>
            </div>
            <div className="space-y-4 px-6 py-5">
              <p className="text-sm leading-6 text-slate-700 font-medium">Esta acción eliminará la respuesta del SII y su archivo almacenado.</p>
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-700">Escribe <span className="text-rose-600 font-black">ELIMINAR</span> para confirmar</label>
                <input
                  type="text"
                  autoComplete="off"
                  value={deleteConfirmation}
                  onChange={(event) => setDeleteConfirmation(event.target.value)}
                  disabled={isDeleting}
                  placeholder="ELIMINAR"
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-800 outline-none focus:border-rose-500 focus:ring-4 focus:ring-rose-100 disabled:bg-slate-50 uppercase"
                />
              </div>
              {deleteError && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-bold text-rose-700">{deleteError}</p>}
            </div>
            <div className="flex flex-col-reverse gap-3 border-t border-slate-100 px-6 py-4 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => { setNoticeToDeleteResponse(null); setDeleteConfirmation(''); setDeleteError('') }} disabled={isDeleting} className="h-11 rounded-2xl border border-slate-200 px-5 text-xs font-bold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50">Cancelar</button>
              <button type="button" onClick={() => void handleResponseDelete()} disabled={isDeleting || deleteConfirmation !== 'ELIMINAR'} className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-rose-600 px-5 text-xs font-bold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50 shadow-md">
                {isDeleting ? <LoaderCircle size={16} className="animate-spin" /> : <Trash2 size={16} />}
                {isDeleting ? 'Eliminando...' : 'Eliminar definitivamente'}
              </button>
            </div>
          </section>
        </div>
      )}

      {/* MODAL PARA ELIMINAR REGISTRO COMPLETO */}
      {noticeToDeleteRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4 backdrop-blur-[2px]">
          <section role="alertdialog" aria-modal="true" className="my-auto w-full max-w-lg overflow-hidden rounded-3xl border border-rose-100 bg-white shadow-2xl shadow-slate-950/25">
            <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5">
              <div className="flex items-start gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-700"><Trash2 size={19} /></span>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Eliminar registro completo</h2>
                  <p className="mt-1 text-xs text-slate-600 font-medium">{noticeToDeleteRecord.nombre_archivo}</p>
                </div>
              </div>
              <button type="button" onClick={() => { setNoticeToDeleteRecord(null); setDeleteConfirmation(''); setDeleteError('') }} disabled={isDeleting} className="flex size-9 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50">
                <X size={19} />
              </button>
            </div>
            <div className="space-y-4 px-6 py-5">
              <p className="text-sm leading-6 text-slate-700 font-medium">¡Atención! Esta acción eliminará por completo este aviso del historial, incluyendo su documento PDF y respuestas asociadas.</p>
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-700">Escribe <span className="text-rose-600 font-black">ELIMINAR</span> para confirmar</label>
                <input
                  type="text"
                  autoComplete="off"
                  value={deleteConfirmation}
                  onChange={(event) => setDeleteConfirmation(event.target.value)}
                  disabled={isDeleting}
                  placeholder="ELIMINAR"
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-800 outline-none focus:border-rose-500 focus:ring-4 focus:ring-rose-100 disabled:bg-slate-50 uppercase"
                />
              </div>
              {deleteError && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-bold text-rose-700">{deleteError}</p>}
            </div>
            <div className="flex flex-col-reverse gap-3 border-t border-slate-100 px-6 py-4 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => { setNoticeToDeleteRecord(null); setDeleteConfirmation(''); setDeleteError('') }} disabled={isDeleting} className="h-11 rounded-2xl border border-slate-200 px-5 text-xs font-bold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50">Cancelar</button>
              <button type="button" onClick={() => void handleRecordDelete()} disabled={isDeleting || deleteConfirmation !== 'ELIMINAR'} className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-rose-600 px-5 text-xs font-bold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50 shadow-md">
                {isDeleting ? <LoaderCircle size={16} className="animate-spin" /> : <Trash2 size={16} />}
                {isDeleting ? 'Eliminando...' : 'Eliminar registro completo'}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}