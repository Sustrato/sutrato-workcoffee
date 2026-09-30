import { supabase } from './supabase'
import { deleteContract, getSignedContractUrl, uploadContract } from './supabaseStorage'

export interface ContractTemplate {
  id: string
  version: number
  content: string
  is_active: boolean
  created_at: string
}

export interface ContractCompany {
  id: string | number
  nombre: string
  rut: string
  direccion: string
  representante_legal: string
  rut_representante: string
  contacto: string
  frecuencia?: string | null
  estado: string | boolean | null
  contrato_url?: string | null
}

export const DEFAULT_CONTRACT_TEMPLATE = `<h1>CONTRATO DE PRESTACIÓN DE SERVICIOS</h1>
<p>En Arica, a {{fecha_inicio}}, comparecen, por una parte, SUTRATO LIMITADA, RUT 77.935.903-4, representada legalmente por {{representante_legal}}, en adelante el prestador; y por la otra, {{cliente_nombre}}, RUT {{rut}}, con domicilio en {{direccion}}, giro {{giro}}, representada por {{representante_legal}}, en adelante el cliente, quienes acuerdan lo siguiente:</p>
<h2>PRIMERO: Servicio contratado</h2>
<p>El prestador proporcionará al cliente el servicio {{plan}}, conforme a las condiciones de oficina virtual acordadas entre las partes.</p>
<h2>SEGUNDO: Precio y forma de pago</h2>
<p>El valor neto mensual del servicio es {{valor_neto}}, más IVA de {{iva}}, totalizando {{total}}. El pago se realizará mediante {{medio_pago}}.</p>
<h2>TERCERO: Vigencia</h2>
<p>El presente contrato comienza a regir el {{fecha_inicio}} y continuará vigente de acuerdo con la frecuencia de pago convenida, sin perjuicio de las causales de término que establece la ley y las condiciones pactadas por las partes.</p>
<h2>CUARTO: Domicilio y comunicaciones</h2>
<p>Para todos los efectos derivados de este contrato, las partes fijan su domicilio en la ciudad de Arica y señalan como datos del cliente los indicados en la comparecencia.</p>
<p>Leído el presente instrumento, las partes lo aceptan y firman en dos ejemplares del mismo tenor.</p>
<p><br></p>
<p>_______________________________<br>SUTRATO LIMITADA<br>Representante legal: {{representante_legal}}</p>
<p>_______________________________<br>{{cliente_nombre}}<br>RUT {{rut}}</p>`

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character] ?? character)
}

function formatDate(value?: string | null): string {
  const date = value ? new Date(`${value.slice(0, 10)}T12:00:00`) : new Date()
  return new Intl.DateTimeFormat('es-CL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date)
}

export function renderContractTemplate(template: string, company: ContractCompany): string {
  const values: Record<string, string> = {
    cliente_nombre: company.nombre,
    rut: company.rut,
    direccion: company.direccion,
    plan: company.frecuencia || 'Servicio de oficina virtual',
    frecuencia: company.frecuencia || 'No informada',
    valor_neto: '',
    iva: '',
    total: '',
    fecha_inicio: formatDate(),
    representante_legal: company.representante_legal,
    rut_representante: company.rut_representante,
    giro: '',
    medio_pago: '',
    contacto: company.contacto,
    estado: String(company.estado ?? ''),
  }

  return template.replace(/\{\{\s*([a-z_]+)\s*\}\}/gi, (placeholder, key: string) => {
    const value = values[key.toLocaleLowerCase('es-CL')]
    return value === undefined ? placeholder : escapeHtml(value)
  })
}

export async function getActiveContractTemplate(): Promise<ContractTemplate> {
  const { data, error } = await supabase
    .from('contract_templates')
    .select('id, version, content, is_active, created_at')
    .eq('is_active', true)
    .single()

  if (error) throw new Error(`No se pudo cargar la plantilla activa: ${error.message}`)
  return data as ContractTemplate
}

export async function saveContractTemplate(content: string): Promise<ContractTemplate> {
  const { data, error } = await supabase.rpc('save_contract_template', { template_content: content })
  if (error) throw new Error(`No se pudo guardar la plantilla: ${error.message}`)
  return data as ContractTemplate
}

export async function getContractCompany(id: string): Promise<ContractCompany> {
  const { data, error } = await supabase
    .from('empresas')
    .select('id, nombre, rut, direccion, representante_legal, rut_representante, contacto, frecuencia, estado, contrato_url')
    .eq('id', id)
    .single()

  if (error) throw new Error(`No se pudieron cargar los datos de la empresa: ${error.message}`)
  return data as ContractCompany
}

export async function getContractCompanies(): Promise<ContractCompany[]> {
  const { data, error } = await supabase
    .from('empresas')
    .select('id, nombre, rut, direccion, representante_legal, rut_representante, contacto, frecuencia, estado, contrato_url')
    .order('nombre', { ascending: true })

  if (error) throw new Error(`No se pudieron cargar las empresas: ${error.message}`)
  return (data ?? []) as ContractCompany[]
}

export async function getSavedContractContent(company: ContractCompany): Promise<string | null> {
  if (!company.contrato_url || !/\.doc$/i.test(company.contrato_url)) return null

  const signedUrl = await getSignedContractUrl(company.contrato_url)
  const response = await fetch(signedUrl)
  if (!response.ok) throw new Error('No se pudo recuperar el contrato guardado.')
  const document = new DOMParser().parseFromString(await response.text(), 'text/html')
  return document.body.innerHTML
}

export async function saveContractDocument(company: ContractCompany, content: string): Promise<string> {
  const safeRut = company.rut.replace(/[^a-zA-Z0-9-]/g, '') || String(company.id)
  const htmlDocument = `<!doctype html><html><head><meta charset="utf-8"><style>body{font-family:Georgia,serif;font-size:12pt;line-height:1.5;margin:2.5cm}h1,h2{text-align:center}p{text-align:justify}</style></head><body>${content}</body></html>`
  const file = new File([htmlDocument], `Contrato-${safeRut}.doc`, { type: 'application/msword' })
  const uploaded = await uploadContract(file, company.id)
  const { error } = await supabase
    .from('empresas')
    .update({ contrato_url: uploaded.url })
    .eq('id', company.id)
    .select('id')
    .single()

  if (error) {
    await deleteContract(uploaded.path)
    throw new Error(`No se pudo guardar el contrato: ${error.message}`)
  }

  if (company.contrato_url && company.contrato_url !== uploaded.url) {
    await deleteContract(company.contrato_url)
  }
  return uploaded.url
}