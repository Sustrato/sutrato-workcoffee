import { useEffect, useState } from 'react'
import { ExternalLink, FileText, FileUp, LoaderCircle } from 'lucide-react'
import { getSiiNoticeHistory, type SiiNoticeRecord, uploadSiiNoticeResponse } from '../services/siiNotices'

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
                        <a href={notice.respuesta_sii_url} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-200 px-3 text-xs font-semibold text-slate-700 hover:border-primary-300 hover:bg-primary-50 hover:text-primary-700">
                          <ExternalLink size={15} /> Ver / descargar
                        </a>
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
    </div>
  )
}