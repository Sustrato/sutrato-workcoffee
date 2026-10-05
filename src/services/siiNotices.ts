import { supabase } from './supabase'

const SII_NOTICES_BUCKET = 'avisos-sii'
const SII_RESPONSE_STORAGE_PREFIX = `/storage/v1/object/public/${SII_NOTICES_BUCKET}/`
export const EMPRESAS_UPDATED_EVENT = 'sutrato:empresas-updated'

export interface SiiNoticeRecord {
  id: string
  nombre_archivo: string
  documento_url: string
  respuesta_sii_url: string | null
  created_at: string
}

export async function uploadSiiNoticeResponse(noticeId: string, file: File): Promise<string> {
  const extension = file.name.split('.').pop()?.toLocaleLowerCase()
  const mimeType = file.type || (extension === 'pdf' ? 'application/pdf' : `image/${extension === 'jpg' ? 'jpeg' : extension}`)
  const isAllowedMimeType = mimeType === 'application/pdf' || mimeType === 'image/jpeg' || mimeType === 'image/png'
  const isAllowedExtension = ['pdf', 'jpg', 'jpeg', 'png'].includes(extension ?? '')
  if (!isAllowedMimeType || !isAllowedExtension) {
    throw new Error('Selecciona una respuesta en PDF, JPG o PNG.')
  }
  if (file.size > 20 * 1024 * 1024) throw new Error('La respuesta no puede superar 20 MB.')

  const safeFilename = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const storagePath = `respuestas/${noticeId}/${crypto.randomUUID()}-${safeFilename}`
  const { error: uploadError } = await supabase.storage
    .from(SII_NOTICES_BUCKET)
    .upload(storagePath, file, { contentType: mimeType, upsert: false })

  if (uploadError) throw new Error(`No se pudo subir la respuesta del SII: ${uploadError.message}`)

  const { data: publicUrlData } = supabase.storage
    .from(SII_NOTICES_BUCKET)
    .getPublicUrl(storagePath)
  const responseUrl = publicUrlData.publicUrl

  const { data: updatedNotice, error: updateError } = await supabase
    .from('avisos_sii_historial')
    .update({ respuesta_sii_url: responseUrl })
    .eq('id', noticeId)
    .select('id')
  if (updateError || (updatedNotice ?? []).length !== 1) {
    await supabase.storage.from(SII_NOTICES_BUCKET).remove([storagePath])
    const detail = updateError?.message ?? 'No se encontró el aviso indicado o no tienes permiso para actualizarlo.'
    throw new Error(`El archivo se subió, pero no se pudo actualizar el aviso: ${detail}`)
  }

  return responseUrl
}

export async function deleteSiiNoticeResponse(notice: SiiNoticeRecord): Promise<void> {
  if (!notice.respuesta_sii_url) throw new Error('El aviso no tiene una respuesta del SII para eliminar.')

  let storagePath: string
  try {
    const responseUrl = new URL(notice.respuesta_sii_url)
    const prefixIndex = responseUrl.pathname.indexOf(SII_RESPONSE_STORAGE_PREFIX)
    if (prefixIndex < 0) throw new Error('La URL no pertenece al almacenamiento de respuestas SII.')
    storagePath = decodeURIComponent(responseUrl.pathname.slice(prefixIndex + SII_RESPONSE_STORAGE_PREFIX.length))
  } catch (pathError) {
    throw new Error(`No se pudo identificar el archivo de respuesta en Storage: ${pathError instanceof Error ? pathError.message : 'URL inválida.'}`)
  }

  if (!storagePath.startsWith(`respuestas/${notice.id}/`) || storagePath.split('/').some((segment) => segment === '..')) {
    throw new Error('La ruta del archivo de respuesta no corresponde al aviso seleccionado.')
  }

  const { data: updatedNotice, error: updateError } = await supabase
    .from('avisos_sii_historial')
    .update({ respuesta_sii_url: null })
    .eq('id', notice.id)
    .eq('respuesta_sii_url', notice.respuesta_sii_url)
    .select('id')

  if (updateError || (updatedNotice ?? []).length !== 1) {
    throw new Error(`No se pudo eliminar el registro de respuesta: ${updateError?.message ?? 'La respuesta cambió o el aviso ya no existe.'}`)
  }

  const { error: storageError } = await supabase.storage
    .from(SII_NOTICES_BUCKET)
    .remove([storagePath])

  if (storageError) {
    const { error: restoreError } = await supabase
      .from('avisos_sii_historial')
      .update({ respuesta_sii_url: notice.respuesta_sii_url })
      .eq('id', notice.id)
      .is('respuesta_sii_url', null)

    if (restoreError) {
      throw new Error(`No se pudo eliminar el archivo de Storage (${storageError.message}) ni restaurar el registro (${restoreError.message}).`)
    }
    throw new Error(`No se pudo eliminar el archivo de respuesta en Storage: ${storageError.message}`)
  }
}

export async function saveSiiNotice(
  pdf: Blob,
  filename: string,
  companyIds: Array<string | number>,
): Promise<SiiNoticeRecord> {
  const storagePath = `${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}-${filename}`
  const { error: uploadError } = await supabase.storage
    .from(SII_NOTICES_BUCKET)
    .upload(storagePath, pdf, { contentType: 'application/pdf', upsert: false })

  if (uploadError) throw new Error(`No se pudo subir el PDF del aviso: ${uploadError.message}`)

  const { data: publicUrlData } = supabase.storage
    .from(SII_NOTICES_BUCKET)
    .getPublicUrl(storagePath)
  const documentoUrl = publicUrlData.publicUrl

  const { data: notice, error: historyError } = await supabase
    .from('avisos_sii_historial')
    .insert({ nombre_archivo: filename, documento_url: documentoUrl })
    .select('id, nombre_archivo, documento_url, respuesta_sii_url, created_at')
    .single()

  if (historyError) {
    await supabase.storage.from(SII_NOTICES_BUCKET).remove([storagePath])
    throw new Error(`El PDF se subió, pero no se pudo registrar en el historial: ${historyError.message}`)
  }

  const { data: updatedCompanies, error: updateError } = await supabase
    .from('empresas')
    .update({ estado: 'DESVINCULADA' })
    .in('id', companyIds)
    .select('id')

  if (updateError || (updatedCompanies ?? []).length !== companyIds.length) {
    const detail = updateError?.message ?? 'No se actualizaron todas las empresas del aviso.'
    throw new Error(`El aviso quedó guardado en el historial, pero falló la desvinculación: ${detail}`)
  }

  window.dispatchEvent(new Event(EMPRESAS_UPDATED_EVENT))
  return notice as SiiNoticeRecord
}

export async function getSiiNoticeHistory(): Promise<SiiNoticeRecord[]> {
  const { data, error } = await supabase
    .from('avisos_sii_historial')
    .select('id, nombre_archivo, documento_url, respuesta_sii_url, created_at')
    .order('created_at', { ascending: false })

  if (error) throw new Error(`No se pudo cargar el historial SII: ${error.message}`)
  return (data ?? []) as SiiNoticeRecord[]
}