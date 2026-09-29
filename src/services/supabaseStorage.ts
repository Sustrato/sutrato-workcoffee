import { supabase } from './supabase'

const VOUCHER_BUCKET = 'vouchers'
const CONTRACT_BUCKET = 'contratos'
const SIGNED_URL_TTL_SECONDS = 3600

type StorageBucket = typeof VOUCHER_BUCKET | typeof CONTRACT_BUCKET

function storagePathFromReference(bucket: StorageBucket, reference: string): string {
  const markerVariants = [
    `/storage/v1/object/public/${bucket}/`,
    `/storage/v1/object/sign/${bucket}/`,
    `/storage/v1/object/authenticated/${bucket}/`,
  ]
  for (const marker of markerVariants) {
    const markerIndex = reference.indexOf(marker)
    if (markerIndex >= 0) {
      const encodedPath = reference.slice(markerIndex + marker.length).split('?')[0]
      return decodeURIComponent(encodedPath)
    }
  }

  // New records store the bucket object path directly rather than an expiring URL.
  return reference.replace(/^\/+/, '')
}

async function uploadPrivateFile(
  bucket: StorageBucket,
  file: File,
  parentId: string | number,
): Promise<{ url: string; path: string }> {
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const path = `${parentId}/${Date.now()}-${safeName}`
  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, file, { contentType: file.type, upsert: false })

  if (error) throw new Error(`No se pudo subir el archivo: ${error.message}`)

  // Keep the durable object path in the database. Signed URLs expire and are generated on demand.
  return { url: path, path }
}

async function getSignedPrivateUrl(bucket: StorageBucket, reference: string): Promise<string> {
  const path = storagePathFromReference(bucket, reference)
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS)

  if (error) throw new Error(`No se pudo generar el enlace privado: ${error.message}`)
  return data.signedUrl
}

async function removePrivateFile(bucket: StorageBucket, reference: string): Promise<void> {
  const path = storagePathFromReference(bucket, reference)
  const { error } = await supabase.storage.from(bucket).remove([path])
  if (error) console.error(`No se pudo eliminar el archivo de ${bucket}:`, error.message)
}

export function uploadContract(file: File, companyId: string | number) {
  return uploadPrivateFile(CONTRACT_BUCKET, file, companyId)
}

export function getSignedContractUrl(pathOrUrl: string): Promise<string> {
  return getSignedPrivateUrl(CONTRACT_BUCKET, pathOrUrl)
}

export function deleteContract(path: string): Promise<void> {
  return removePrivateFile(CONTRACT_BUCKET, path)
}

export function deleteContractByPublicUrl(pathOrUrl: string): Promise<void> {
  return removePrivateFile(CONTRACT_BUCKET, pathOrUrl)
}

export function uploadVoucher(file: File, companyId: string | number) {
  return uploadPrivateFile(VOUCHER_BUCKET, file, companyId)
}

export function getSignedVoucherUrl(pathOrUrl: string): Promise<string> {
  return getSignedPrivateUrl(VOUCHER_BUCKET, pathOrUrl)
}

export function deleteVoucher(path: string): Promise<void> {
  return removePrivateFile(VOUCHER_BUCKET, path)
}

export function deleteVoucherByPublicUrl(pathOrUrl: string): Promise<void> {
  return removePrivateFile(VOUCHER_BUCKET, pathOrUrl)
}

export const empresaService = {
  getEmpresas: async () => {
    const { data, error } = await supabase
      .from('empresas')
      .select('*, pagos(*)')
      .order('nombre', { ascending: true })

    if (error) {
      console.error('Error al obtener empresas:', error)
      return []
    }
    return data
  },

  createEmpresa: async (empresaData: Record<string, unknown>) => {
    const { data, error } = await supabase
      .from('empresas')
      .insert([empresaData])
      .select()

    if (error) throw new Error(`Error al crear empresa: ${error.message}`)
    return data
  },

  updateEmpresa: async (id: string | number, empresaData: Record<string, unknown>) => {
    const { data, error } = await supabase
      .from('empresas')
      .update(empresaData)
      .eq('id', id)
      .select()
      .single()

    if (error) throw new Error(`Error al actualizar empresa: ${error.message}`)
    return data
  },

  createPago: async (pagoData: {
    empresa_id: string
    fecha_pago: string
    forma_pago: string
    bruto: number
    neto: number
    iva: number
    monto_liquido: number
    comision_tarjeta: number
    proximo_pago: string
    voucher_url?: string | null
  }) => {
    const { data, error } = await supabase
      .from('pagos')
      .insert([pagoData])
      .select()

    if (error) throw new Error(`Error al registrar pago: ${error.message}`)
    return data
  },

  updatePago: async (id: string | number, pagoData: {
    fecha_pago: string
    forma_pago: string
    bruto: number
    neto: number
    iva: number
    monto_liquido: number
    comision_tarjeta: number
    voucher_url?: string | null
  }) => {
    const { data, error } = await supabase
      .from('pagos')
      .update(pagoData)
      .eq('id', id)
      .select()
      .single()

    if (error) throw new Error(`Error al actualizar pago: ${error.message}`)
    return data
  },
}
