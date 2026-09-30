import { supabase } from './supabase'
import { deleteContract, uploadContract } from './supabaseStorage'

export interface EmpresaContrato {
  id: string
  empresa_id: string
  contrato_url: string
  nombre_archivo: string
  created_at: string
}

export async function getEmpresaContratos(empresaId: string | number): Promise<EmpresaContrato[]> {
  const { data, error } = await supabase
    .from('empresa_contratos')
    .select('id, empresa_id, contrato_url, nombre_archivo, created_at')
    .eq('empresa_id', String(empresaId))
    .order('created_at', { ascending: false })

  if (error) throw new Error(`No se pudo cargar el historial de contratos: ${error.message}`)
  return (data ?? []) as EmpresaContrato[]
}

export async function uploadEmpresaContrato(
  empresaId: string | number,
  file: File,
  previousContractUrl: string | null,
): Promise<EmpresaContrato> {
  const uploaded = await uploadContract(file, empresaId)
  const { error: companyUpdateError } = await supabase
    .from('empresas')
    .update({ contrato_url: uploaded.url })
    .eq('id', empresaId)
    .select('id')
    .single()

  if (companyUpdateError) {
    await deleteContract(uploaded.path)
    throw new Error(`No se pudo actualizar el acceso rápido al contrato: ${companyUpdateError.message}`)
  }

  const { data, error } = await supabase
    .from('empresa_contratos')
    .insert({
      empresa_id: String(empresaId),
      contrato_url: uploaded.url,
      nombre_archivo: file.name,
    })
    .select('id, empresa_id, contrato_url, nombre_archivo, created_at')
    .single()

  if (error) {
    await supabase.from('empresas').update({ contrato_url: previousContractUrl }).eq('id', empresaId)
    await deleteContract(uploaded.path)
    throw new Error(`El archivo se subió, pero no se pudo registrar en el historial: ${error.message}`)
  }

  return data as EmpresaContrato
}