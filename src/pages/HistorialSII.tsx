import { useEffect, useState } from 'react'
import { ExternalLink, FileText, FileUp, LoaderCircle, Trash2, X } from 'lucide-react'
import { deleteSiiNoticeResponse, getSiiNoticeHistory, type SiiNoticeRecord, uploadSiiNoticeResponse } from '../services/siiNotices'

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
  const [noticeToDeleteResponse, setNoticeToDeleteResponse] = useState<SiiNoticeRecord | null>(null)
  const [deleteConfirmation, setDeleteConfirmation] = useState('')
  const [isDeletingResponse, setIsDeletingResponse] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    getSiiNoticeHistory()
      .then((history) => { if (active) setNotices(history) })
      .catch((loadError: unknown) => {
        if (active) setError(loadError instanceof Error ? loadError.message : 'No se pudo cargar el historial SII.')
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
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'No se pudo subir la respuesta del SII.')
    } finally {
      setUploadingNoticeId(null)
    }
  }

  async function handleResponseDelete() {
    if (!noticeToDeleteResponse || deleteConfirmation !== 'Eliminar' || isDeletingResponse) return
    setIsDeletingResponse(true)
    setDeleteError('')
    setError('')
    try {
      await deleteSiiNoticeResponse(noticeToDeleteResponse)
      setNotices((current) => current.map((item) =>
        item.id === noticeToDeleteResponse.id ? { ...item, respuesta_sii_url: null } : item,
      ))
      setNoticeToDeleteResponse(null)
      setDeleteConfirmation('')
    } catch (deleteResponseError) {
      console.error('No se pudo eliminar la respuesta del SII:', deleteResponseError)
      setDeleteError(deleteResponseError instanceof Error ? deleteResponseError.message : 'No se pudo eliminar la respuesta del SII.')
    } finally {
      setIsDeletingResponse(false)
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="flex items-center gap-3">
        <span className="flex size-11 items-center justify-center rounded-lg bg-primary-50 text-primary-700"><FileText size={21} /></span>
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Historial SII</h1>
          <p className="mt-1 text-sm text-slate-500">Avisos consolidados generados y almacenados.</p>
        </div>
      </header>

      {error && <p role="alert" className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}
      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        {isLoading ? (
          <div className="flex items-center justify-center gap-2 p-12 text-sm text-slate-500"><LoaderCircle size={18} className="animate-spin" /> Cargando historial...</div>
        ) : notices.length === 0 ? (
          <p className="p-10 text-center text-sm text-slate-500">Aún no hay avisos SII registrados.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left">
              <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500">
                <tr><th className="px-5 py-3">Archivo</th><th className="px-5 py-3">Fecha de creación</th><th className="px-5 py-3 text-right">Documento</th><th className="px-5 py-3 text-right">Respuesta SII</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {notices.map((notice) => (
                  <tr key={notice.id}>
                    <td className="px-5 py-4 font-medium text-slate-800">{notice.nombre_archivo}</td>
                    <td className="px-5 py-4 text-slate-600"><time dateTime={notice.created_at}>{formatCreatedAt(notice.created_at)}</time></td>
                    <td className="px-5 py-4 text-right">
                      <a href={notice.documento_url} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-200 px-3 text-xs font-semibold text-slate-700 hover:border-primary-300 hover:bg-primary-50 hover:text-primary-700">
                        <ExternalLink size={15} /> Ver / descargar
                      </a>
                    </td>
                    <td className="px-5 py-4 text-right">
                      {notice.respuesta_sii_url ? (
                        <div className="flex justify-end gap-2">
                          <a href={notice.respuesta_sii_url} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-200 px-3 text-xs font-semibold text-slate-700 hover:border-primary-300 hover:bg-primary-50 hover:text-primary-700">
                            <ExternalLink size={15} /> Ver / descargar
                          </a>
                          <button
                            type="button"
                            onClick={() => {
                              setNoticeToDeleteResponse(notice)
                              setDeleteConfirmation('')
                              setDeleteError('')
                            }}
                            disabled={uploadingNoticeId !== null || isDeletingResponse}
                            className="inline-flex h-9 items-center gap-2 rounded-md border border-rose-200 px-3 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
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
                          <label htmlFor={`sii-response-${notice.id}`} className={`inline-flex h-9 cursor-pointer items-center gap-2 rounded-md border border-primary-200 px-3 text-xs font-semibold text-primary-700 hover:bg-primary-50 ${uploadingNoticeId !== null ? 'pointer-events-none opacity-60' : ''}`}>
                            {uploadingNoticeId === notice.id ? <LoaderCircle size={15} className="animate-spin" /> : <FileUp size={15} />}
                            {uploadingNoticeId === notice.id ? 'Subiendo...' : 'Subir respuesta'}
                          </label>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {noticeToDeleteResponse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4 backdrop-blur-[2px]">
          <section role="alertdialog" aria-modal="true" aria-labelledby="delete-sii-response-title" aria-describedby="delete-sii-response-warning" className="my-auto w-full max-w-lg overflow-hidden rounded-xl border border-rose-100 bg-white shadow-2xl shadow-slate-950/25">
            <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5">
              <div className="flex items-start gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-rose-50 text-rose-700"><Trash2 size={19} /></span>
                <div>
                  <h2 id="delete-sii-response-title" className="text-lg font-semibold text-slate-900">Eliminar respuesta SII</h2>
                  <p className="mt-1 text-sm text-slate-600">{noticeToDeleteResponse.nombre_archivo}</p>
                </div>
              </div>
              <button type="button" onClick={() => { setNoticeToDeleteResponse(null); setDeleteConfirmation(''); setDeleteError('') }} disabled={isDeletingResponse} aria-label="Cerrar confirmación" className="flex size-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50">
                <X size={19} />
              </button>
            </div>
            <div className="space-y-4 px-6 py-5">
              <p id="delete-sii-response-warning" className="text-sm leading-6 text-slate-700">Esta acción eliminará la respuesta del SII y su archivo almacenado.</p>
              <div>
                <label htmlFor="delete-sii-response-confirmation" className="mb-1.5 block text-sm font-medium text-slate-700">Escribe Eliminar para confirmar</label>
                <input
                  id="delete-sii-response-confirmation"
                  type="text"
                  autoComplete="off"
                  value={deleteConfirmation}
                  onChange={(event) => setDeleteConfirmation(event.target.value)}
                  disabled={isDeletingResponse}
                  className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-100 disabled:bg-slate-50"
                />
              </div>
              {deleteError && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{deleteError}</p>}
            </div>
            <div className="flex flex-col-reverse gap-3 border-t border-slate-100 px-6 py-4 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => { setNoticeToDeleteResponse(null); setDeleteConfirmation(''); setDeleteError('') }} disabled={isDeletingResponse} className="h-10 rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50">Cancelar</button>
              <button type="button" onClick={() => void handleResponseDelete()} disabled={isDeletingResponse || deleteConfirmation !== 'Eliminar'} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-rose-600 px-4 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50">
                {isDeletingResponse ? <LoaderCircle size={16} className="animate-spin" /> : <Trash2 size={16} />}
                {isDeletingResponse ? 'Eliminando...' : 'Eliminar definitivamente'}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}