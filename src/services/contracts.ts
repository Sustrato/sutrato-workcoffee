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

export const DEFAULT_CONTRACT_TEMPLATE = `<h2>CONTRATO DE ARRIENDO DE OFICINA VIRTUAL</h2>
<p>En Arica, a {{fecha_inicio}}, entre:</p>
<p><strong>Arrendador:</strong> Sutrato Limitada, RUT 77.935.903-4, con domicilio en 18 de septiembre #537, Arica, representada legalmente por Jorge García Lira, RUT 19.905.955-6, en adelante "el Arrendador".</p>
<p><strong>Arrendatario:</strong> {{cliente_nombre}}, RUT {{rut}}, con domicilio personal en {{direccion}}, representada legalmente por {{representante_legal}}, RUT {{rut_representante}}, en adelante "el Arrendatario".</p>
<p>Se ha convenido el siguiente contrato de arriendo de oficina virtual:</p>

<h3>1. Objeto del contrato:</h3>
<p>El Arrendador da en arrendamiento al Arrendatario una oficina virtual ubicada en calle 18 de septiembre N.°537, comuna y ciudad de Arica, Región de Arica y Parinacota, Chile, identificada con el Rol de Avalúo Fiscal N.°96-3 del Servicio de Impuestos Internos (SII), la cual será utilizada como oficina virtual conforme a las condiciones del presente contrato.</p>

<h3>2. Servicios incluidos:</h3>
<p>Los servicios ofrecidos al arrendatario dependerán de la modalidad de pago acordada ({{frecuencia}}), de la siguiente forma:</p>
<p><strong>a) Para contratos con pago mensual:</strong></p>
<ul>
  <li>Uso de la dirección como domicilio tributario.</li>
  <li>Recepción de correspondencia.</li>
  <li>Acceso a sala de reuniones por 2 horas mensuales (previa reserva).</li>
</ul>
<p><strong>b) Para contratos con pago anual anticipado:</strong> Además de los servicios anteriores, el Arrendatario tendrá derecho a los siguientes beneficios adicionales:</p>
<ul>
  <li>Descuento de 5% en cafetería.</li>
  <li>Descuento de 5% en asesoría en proyectos.</li>
  <li>Descuento de 5% en servicio de impresión de documentos.</li>
  <li>Descuento de 5% en arriendo de sala de reuniones con proyector, telón, etc.</li>
</ul>
<p>El pago anual deberá realizarse al inicio del contrato para que estos beneficios apliquen.</p>

<h3>3. Plazo:</h3>
<p>El contrato tendrá una duración de 12 meses, renovable automáticamente por períodos iguales, salvo que alguna de las partes manifieste su intención de no renovar con al menos 30 días de anticipación al término del período en curso.</p>

<h3>4. Renta:</h3>
<ul>
  <li>El Arrendatario pagará una renta mensual de {{valor_neto}} (Neto) más IVA, totalizando {{total}}, pagadera por adelantado los primeros 5 días de cada mes.</li>
  <li>Alternativamente, el Arrendatario podrá optar por el pago anual anticipado, equivalente al total de 12 meses de arriendo, lo que dará derecho a los beneficios indicados en la cláusula 2.b.</li>
  <li>El pago se realizará mediante transferencia electrónica a la cuenta bancaria proporcionada por el Arrendador: <strong>SUTRATO LIMITADA | RUT: 77935903-4 | Banco de Chile | FAN Emprende | N° Cuenta 169024354 | Email: gestion@sutrato.com</strong></li>
  <li>El no pago de la renta por 2 meses consecutivos facultará al Arrendador para terminar el contrato de manera unilateral.</li>
</ul>

<h3>5. Uso:</h3>
<ul>
  <li>El Arrendatario utilizará la dirección exclusivamente para fines comerciales y tributarios legales.</li>
  <li>Queda estrictamente prohibido el uso de la dirección para actividades ilícitas o que puedan dañar la reputación del Arrendador.</li>
</ul>

<h3>6. Término:</h3>
<ul>
  <li>Cualquiera de las partes podrá poner término al contrato con 30 días de anticipación mediante carta certificada o correo electrónico con acuse de recibo.</li>
  <li>El Arrendador podrá terminar el contrato de inmediato en caso de uso indebido de la dirección o incumplimiento grave de las obligaciones del Arrendatario.</li>
</ul>

<h3>7. Confidencialidad:</h3>
<p>Ambas partes se comprometen a mantener la confidencialidad de la información comercial y personal que puedan conocer en virtud de este contrato.</p>

<h3>8. Responsabilidad:</h3>
<ul>
  <li>El Arrendatario es responsable de mantener actualizados sus datos de contacto.</li>
  <li>El Arrendador no será responsable por la pérdida o daño de correspondencia una vez que esta haya sido entregada a servicios de reenvío en caso de solicitarse.</li>
</ul>

<h3>9. Servicios adicionales:</h3>
<ul>
  <li>El uso de la sala de reuniones por más de 2 horas mensuales o el reenvío de correspondencia tendrán un costo extra según la tarifa vigente.</li>
  <li>Estos servicios adicionales deberán ser solicitados con al menos 48 horas de anticipación.</li>
</ul>

<h3>10. Facturación:</h3>
<p>La facturación se realizará bajo uno de los siguientes giros:</p>
<ul>
  <li>Alquiler de bienes inmuebles amoblados o con equipos y maquinarias.</li>
  <li>Actividades combinadas de servicios administrativos de oficina.</li>
</ul>

<h3>11. Modificaciones:</h3>
<p>Cualquier modificación a este contrato deberá ser acordada por escrito y firmada por ambas partes.</p>

<h3>12. Legislación y jurisdicción:</h3>
<ul>
  <li>Este contrato se rige por las leyes de la República de Chile.</li>
  <li>Para cualquier controversia derivada de este contrato, las partes se someten a la jurisdicción de los tribunales de Arica.</li>
</ul>

<h3>13. Notificaciones:</h3>
<p>Todas las notificaciones relacionadas con este contrato se harán por escrito a las direcciones de correo electrónico proporcionadas por las partes.</p>

<h3>14. Exención de responsabilidad y embargos:</h3>
<ul>
  <li>El Arrendatario declara conocer que la dirección arrendada es una oficina virtual de uso compartido, sin asignación exclusiva de espacios físicos ni custodia de bienes materiales.</li>
  <li>En consecuencia, el Arrendador no asume responsabilidad alguna por embargos, fiscalizaciones, inspecciones u otros actos judiciales o administrativos que recaigan sobre el Arrendatario y que se realicen en el domicilio del servicio.</li>
  <li>En caso de que autoridades judiciales, tributarias o administrativas comparezcan en el domicilio por actos relacionados con el Arrendatario, el Arrendador colaborará dentro de sus facultades, pero no será responsable por bienes, documentos o pertenencias del Arrendatario, ni por los perjuicios que tales actuaciones puedan ocasionar.</li>
  <li>El Arrendatario se compromete a mantener indemne al Arrendador frente a cualquier reclamo, daño o perjuicio derivado de procedimientos de embargo, fiscalización o uso indebido de la dirección.</li>
  <li>El Arrendatario reconoce que no se arriendan bienes muebles ni inmuebles, sino únicamente el derecho de uso de la dirección para administrar, tributar o comercializar.</li>
</ul>

<p><strong>Firman en señal de conformidad:</strong></p>
<br><br>
<p>___________________________________<br>Jorge García Lira<br>RUT 19.905.955-6<br>Representante Legal de Sutrato Limitada</p>
<br>
<p>___________________________________<br>{{representante_legal}}<br>RUT {{rut_representante}}<br>Representante Legal del Arrendatario</p>`

export const PATRIMONIS_TEMPLATE = `<h2>CONTRATO DE ARRIENDO DE OFICINA VIRTUAL</h2>
<p>En Arica, a {{fecha_firma}}, entre:</p>
<p><strong>Arrendador:</strong> Sutrato Limitada, RUT 77.935.903-4, con domicilio en 18 de Septiembre N.º 537, Arica, representada legalmente por Jorge García Lira, RUT 19.905.955-6, en adelante "el Arrendador".</p>
<p><strong>Arrendatario:</strong> {{razon_social}}, RUT {{rut}}, con domicilio en {{direccion}}, representada legalmente por {{representante_legal}}, RUT {{rut_representante}}, vinculada al proyecto "Patrimonis Online: Turismo Circular", código 26INE-315933, del programa Semilla Inicia de CORFO, en adelante "el Arrendatario".</p>
<p>Se ha convenido el siguiente contrato de arriendo de oficina virtual:</p>

<h3>1. Objeto del contrato</h3>
<p>El Arrendador proporciona al Arrendatario el servicio de oficina virtual en calle 18 de Septiembre N.º 537, comuna y ciudad de Arica, Región de Arica y Parinacota, Chile, correspondiente al inmueble identificado con el Rol de Avalúo Fiscal N.º 96-3 del Servicio de Impuestos Internos, conforme a las condiciones del presente contrato.</p>
<p>El servicio se contrata para apoyar las actividades administrativas, comerciales y tributarias del Arrendatario relacionadas con el proyecto "Patrimonis Online: Turismo Circular", código 26INE-315933. Esta identificación no convierte a CORFO en parte del contrato ni en responsable de los pagos.</p>

<h3>2. Servicios incluidos</h3>
<p>La modalidad de contratación y pago será mensual, e incluirá:</p>
<ul>
  <li>Uso de la dirección como domicilio tributario, sujeto a los requisitos y autorizaciones que correspondan ante los organismos competentes.</li>
  <li>Recepción de correspondencia.</li>
  <li>Acceso a sala de reuniones por 2 horas mensuales, previa reserva y disponibilidad.</li>
</ul>
<p>Los beneficios asociados al pago anual anticipado del formato general de contratación no serán aplicables a esta modalidad mensual. Cualquier cambio de modalidad deberá acordarse por escrito.</p>

<h3>3. Plazo y renovación automática</h3>
<p>El contrato comenzará a regir el 5 de noviembre de 2026 y tendrá un período inicial de vigencia hasta el 31 de diciembre de 2026.</p>
<p>A contar del 1 de enero de 2027, se renovará automáticamente por períodos sucesivos de 12 meses, manteniendo la renta, los servicios y el vencimiento mensual pactados, salvo modificación acordada por escrito.</p>
<p>Cualquiera de las partes podrá manifestar su intención de no renovar o poner término anticipado mediante aviso escrito con al menos 30 días de anticipación, conforme a las cláusulas 6 y 13. La renovación no requerirá la firma de un nuevo contrato.</p>

<h3>4. Renta, calendario y forma de pago</h3>
<p>El Arrendatario pagará una renta mensual total de $15.000 (quince mil pesos), IVA incluido. Como referencia para la facturación, este total corresponde a $12.605 netos más $2.395 de IVA, considerando la tasa del 19% y el redondeo a pesos. El total mensual pactado es $15.000.</p>
<p>La renta se pagará por adelantado, con vencimiento el día 5 de cada mes, comenzando el 5 de noviembre de 2026, según el siguiente calendario de cuotas:</p>

<ul style="line-height: 1.8; margin-bottom: 15px;">
  <li><strong>Cuota 1:</strong> Noviembre de 2026 — Vencimiento: 05/11/2026 — Monto: $15.000</li>
  <li><strong>Cuota 2:</strong> Diciembre de 2026 — Vencimiento: 05/12/2026 — Monto: $15.000</li>
  <li><strong>Cuota 3:</strong> Enero de 2027 — Vencimiento: 05/01/2027 — Monto: $15.000</li>
  <li><strong>Cuota 4:</strong> Febrero de 2027 — Vencimiento: 05/02/2027 — Monto: $15.000</li>
  <li><strong>Cuota 5:</strong> Marzo de 2027 — Vencimiento: 05/03/2027 — Monto: $15.000</li>
  <li><strong>Cuota 6:</strong> Abril de 2027 — Vencimiento: 05/04/2027 — Monto: $15.000</li>
  <li><strong>Cuota 7:</strong> Mayo de 2027 — Vencimiento: 05/05/2027 — Monto: $15.000</li>
  <li><strong>Cuota 8:</strong> Junio de 2027 — Vencimiento: 05/06/2027 — Monto: $15.000</li>
  <li><strong>Cuota 9:</strong> Julio de 2027 — Vencimiento: 05/07/2027 — Monto: $15.000</li>
  <li><strong>Cuota 10:</strong> Agosto de 2027 — Vencimiento: 05/08/2027 — Monto: $15.000</li>
  <li><strong>Cuota 11:</strong> Septiembre de 2027 — Vencimiento: 05/09/2027 — Monto: $15.000</li>
  <li><strong>Cuota 12:</strong> Octubre de 2027 — Vencimiento: 05/10/2027 — Monto: $15.000</li>
  <li><strong>Cuota 13:</strong> Noviembre de 2027 — Vencimiento: 05/11/2027 — Monto: $15.000</li>
  <li><strong>Cuota 14:</strong> Diciembre de 2027 — Vencimiento: 05/12/2027 — Monto: $15.000</li>
</ul>

<p>En las renovaciones posteriores, los pagos continuarán venciendo el día 5 de cada mes: 05/01/2028, 05/02/2028 y así sucesivamente mientras el contrato permanezca vigente. El calendario no limita la duración de las renovaciones automáticas ni exige emitir un nuevo contrato para continuar los cobros.</p>
<p>El pago se realizará mediante transferencia electrónica a la siguiente cuenta:</p>
<ul>
  <li><strong>Titular:</strong> Sutrato Limitada</li>
  <li><strong>RUT:</strong> 77.935.903-4</li>
  <li><strong>Banco:</strong> Banco de Chile</li>
  <li><strong>Tipo de cuenta:</strong> FAN Emprende</li>
  <li><strong>Número de cuenta:</strong> 169024354</li>
  <li><strong>Correo para comprobantes:</strong> gestion@sutrato.com</li>
</ul>
<p>El no pago de 2 mensualidades consecutivas facultará al Arrendador para poner término al contrato mediante comunicación escrita al Arrendatario, sin perjuicio del cobro de las sumas adeudadas.</p>

<h3>5. Uso</h3>
<p>El Arrendatario utilizará la dirección exclusivamente para fines administrativos, comerciales y tributarios legales. Queda prohibido el uso de la dirección para actividades ilícitas o que puedan dañar la reputación del Arrendador. El contrato no autoriza actividades presenciales permanentes, almacenamiento de productos ni ocupación exclusiva de espacios físicos.</p>

<h3>6. Término</h3>
<p>Cualquiera de las partes podrá poner término al contrato con al menos 30 días de anticipación, mediante carta certificada o correo electrónico con acuse de recibo. El Arrendador podrá terminar el contrato de inmediato, mediante comunicación escrita, en caso de uso indebido de la dirección o incumplimiento grave del Arrendatario.</p>
<p>El término del contrato no extinguirá las rentas ni los servicios adicionales pendientes de pago. Al finalizar el contrato, el Arrendatario deberá gestionar el cambio de domicilio ante el SII y los demás organismos o entidades donde haya registrado la dirección, entregando al Arrendador el respaldo correspondiente.</p>

<h3>7. Confidencialidad</h3>
<p>Ambas partes se comprometen a mantener la confidencialidad de la información comercial y personal que conozcan en virtud de este contrato, salvo su entrega cuando sea legalmente exigible por una autoridad competente.</p>

<h3>8. Responsabilidad</h3>
<p>El Arrendatario será responsable de mantener actualizados sus datos de contacto. Si solicita reenvío de correspondencia, las condiciones y costos deberán acordarse previamente. Una vez entregada la correspondencia al servicio de reenvío convenido, su transporte quedará sujeto a las condiciones de dicho prestador, sin perjuicio de las responsabilidades que legalmente correspondan al Arrendador por sus propios actos u omisiones.</p>

<h3>9. Servicios adicionales</h3>
<p>El uso de la sala de reuniones por más de 2 horas mensuales y el reenvío de correspondencia tendrán un costo adicional, informado y aceptado previamente por el Arrendatario. Estos servicios deberán solicitarse con al menos 48 horas de anticipación y estarán sujetos a disponibilidad.</p>

<h3>10. Facturación</h3>
<p>El Arrendador emitirá el documento tributario que corresponda al servicio efectivamente prestado, bajo sus actividades económicas registradas y conforme a la normativa aplicable.</p>
<p>La descripción podrá indicar: "Servicio mensual de oficina virtual, correspondiente a {{mes_año}}, proyecto Patrimonis Online: Turismo Circular, código 26INE-315933".</p>
<p>Los documentos se emitirán a nombre y RUT del Arrendatario identificado en este contrato.</p>

<h3>11. Modificaciones</h3>
<p>Cualquier modificación a la renta, servicios, modalidad de pago u otras condiciones deberá acordarse por escrito y ser firmada por ambas partes.</p>

<h3>12. Legislación y jurisdicción</h3>
<p>Este contrato se regirá por las leyes de la República de Chile. Para las controversias derivadas de este contrato, las partes se someten a los tribunales competentes de Arica, sin perjuicio de las reglas de competencia que sean legalmente obligatorias.</p>

<h3>13. Notificaciones</h3>
<p>Las notificaciones relacionadas con este contrato se realizarán por escrito a los siguientes correos:</p>
<p><strong>Arrendador:</strong> gestion@sutrato.com<br><strong>Arrendatario:</strong> {{correo_arrendatario}}</p>
<p>Cada parte deberá comunicar oportunamente cualquier cambio de correo. Para los avisos de término o no renovación se utilizará el mecanismo señalado en la cláusula 6.</p>

<h3>14. Responsabilidad ante embargos, fiscalizaciones y actuaciones de autoridades</h3>
<p>El Arrendatario declara conocer que la oficina virtual es un servicio de uso compartido de dirección, sin asignación exclusiva de espacios físicos ni custodia de bienes materiales.</p>
<p>El servicio comprende el uso de la dirección y las prestaciones expresamente indicadas en este contrato; no entrega posesión exclusiva del inmueble ni de sus bienes muebles.</p>
<p>El Arrendador no asume las deudas, obligaciones tributarias, comerciales ni judiciales del Arrendatario. Ante actuaciones de autoridades relacionadas con el Arrendatario, el Arrendador colaborará dentro de sus facultades y obligaciones legales.</p>
<p>El Arrendatario responderá por los daños acreditados que cause al Arrendador por uso ilícito de la dirección o incumplimiento de este contrato. Estas estipulaciones no limitan las facultades de las autoridades ni excluyen responsabilidades que legalmente correspondan al Arrendador.</p>

<p><strong>Firman en señal de conformidad:</strong></p>
<br><br>
<p>_____________________________________<br>Jorge García Lira<br>RUT 19.905.955-6<br>Representante legal de Sutrato Limitada</p>
<br>
<p>_____________________________________<br>{{representante_legal}}<br>RUT {{rut_representante}}<br>Representante legal de {{razon_social}}</p>`

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
    razon_social: company.nombre,
    rut: company.rut,
    direccion: company.direccion,
    plan: company.frecuencia || 'Servicio de oficina virtual',
    frecuencia: company.frecuencia || 'Mensual',
    valor_neto: '$12.605',
    iva: '$2.395',
    total: '$15.000',
    fecha_inicio: formatDate(),
    fecha_firma: formatDate(),
    representante_legal: company.representante_legal,
    rut_representante: company.rut_representante,
    giro: 'Actividades de servicios',
    medio_pago: 'Transferencia electrónica',
    contacto: company.contacto,
    correo_arrendatario: company.contacto || 'gestion@cliente.com',
    mes_año: 'el mes en curso',
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
  try {
    const signedUrl = await getSignedContractUrl(company.contrato_url)
    if (!signedUrl) return null
    const res = await fetch(signedUrl)
    if (!res.ok) return null
    const htmlText = await res.text()
    const document = new DOMParser().parseFromString(htmlText, 'text/html')
    return document.body.innerHTML
  } catch (err) {
    console.warn('No se pudo recuperar el contrato guardado previamente, cargando plantilla por defecto.', err)
    return null
  }
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