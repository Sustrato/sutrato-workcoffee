import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { supabase } from '../services/supabase'
import { ArrowLeft, Printer, Building2, Edit3 } from 'lucide-react'

export default function PlantillaContratoFisicas() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  // Captura de datos enviados por URL
  const clienteId = searchParams.get('id') || ''
  const nombreParam = searchParams.get('nombre') || ''
  const rutParam = searchParams.get('rut') || ''
  const espacioParam = searchParams.get('espacio') || 'Oficina N°1'
  const montoParam = searchParams.get('monto') || '350000'
  const repNombreParam = searchParams.get('rep_nombre') || ''
  const repRutParam = searchParams.get('rep_rut') || ''

  // Estados de los campos
  const [fechaContrato, setFechaContrato] = useState('25 de Octubre de 2026')
  const [subarrendatarioNombre, setSubarrendatarioNombre] = useState(nombreParam)
  const [subarrendatarioRut, setSubarrendatarioRut] = useState(rutParam)
  const [subarrendatarioDomicilio, setSubarrendatarioDomicilio] = useState('18 de Septiembre #537, Arica')
  const [representanteNombre, setRepresentanteNombre] = useState(repNombreParam)
  const [representanteRut, setRepresentanteRut] = useState(repRutParam)
  const [oficinaNumero, setOficinaNumero] = useState(espacioParam)
  const [montoRenta, setMontoRenta] = useState(montoParam)

  // 📝 CLÁUSULAS EDITABLES EN VIVO
  const [clausulasTexto, setClausulasTexto] = useState(
`Primero: Objeto del Contrato
El Subarrendador da en subarriendo al Subarrendatario, y este acepta, una porción de oficina ubicada dentro del establecimiento comercial denominado “Sutrato Workcoffee”, situado en 18 de Septiembre #537, Arica, cuya propiedad está identificada con el Rol de Avalúo N° 96-3.

Segundo: Plazo
El presente contrato de subarriendo tendrá una duración indefinida, manteniéndose vigente mientras ambas partes así lo acuerden.
Cualquiera de las partes podrá poner término al contrato notificando a la otra con un mínimo de 30 días de anticipación, mediante comunicación escrita.
El contrato podrá ser revisado o modificado por mutuo acuerdo de las partes cada 12 meses.

Tercero: Renta y Forma de Pago
La renta mensual de subarriendo será de $350.000 pesos chilenos, pagadera dentro de los primeros cinco días de cada mes.
La renta de subarriendo se reajustará cada 1 año, conforme a la variación del Índice de Precios al Consumidor (IPC).
El pago de la renta podrá efectuarse mediante Pago Automático de Cuentas (PAC), previa inscripción y autorización del Subarrendatario, o mediante depósito o transferencia bancaria a la siguiente cuenta:
Titular: Sutrato Limitada | RUT: 77.935.903-4 | Banco: Banco de Chile | Tipo de cuenta: Cuenta Vista | Número de cuenta: 00-016-90243-54
En caso de pago por depósito o transferencia bancaria, el Subarrendatario deberá enviar el comprobante al correo electrónico que indique el Subarrendador.
Sutrato dispone de la modalidad PAC para el cobro automático de la renta mensual vigente. Su activación se realizará mediante la autorización correspondiente, y la fecha de cargo se informará al Subarrendatario dentro del plazo de pago establecido. Si el cargo automático no se realiza o es rechazado, el Subarrendatario deberá efectuar el pago mediante depósito o transferencia dentro del mismo plazo. La inscripción al PAC no modifica el monto ni el vencimiento de la renta.
El no pago de la renta dentro de los plazos establecidos facultará al Subarrendador para poner término inmediato al contrato, sin perjuicio de exigir los montos adeudados.

Cuarto: Mes de Garantía
El Subarrendatario pagará, al momento de la firma del presente contrato, un mes de garantía, equivalente a la renta vigente.
Este monto no podrá imputarse al pago de la renta mensual, salvo acuerdo expreso del Subarrendador.

Quinto: Pago Proporcional del Primer Mes y Garantía
• En caso de que el contrato se firme en una fecha posterior al primer día del mes, el Subarrendatario deberá pagar al momento de la firma el monto proporcional correspondiente a los días restantes del mes en curso, calculado sobre la renta mensual vigente, además del mes de garantía.
• El mes de garantía será equivalente a $350.000 CLP, y se pagará junto con el monto proporcional del primer mes.
• El mes de garantía será devuelto al Subarrendatario dentro de los 10 días hábiles posteriores a la restitución del inmueble, siempre que:
  - No existan deudas pendientes por renta u otros compromisos contractuales.
  - El espacio subarrendado se entregue en buenas condiciones, salvo el desgaste natural por uso legítimo.
  - No haya incumplimientos graves del contrato que justifiquen el uso de la garantía.
• En caso de que existan daños, deudas u otros incumplimientos, el Subarrendador podrá descontar del mes de garantía los valores correspondientes.

Sexto: Uso y Destino
El espacio subarrendado, identificado como Oficina N°2, deberá estar debidamente señalizado por el Subarrendador y se destinará exclusivamente a fines comerciales del rubro de servicios comerciales y administrativos, salvo acuerdo expreso entre las partes.
El Subarrendatario tendrá acceso a las áreas comunes, incluyendo salas de reuniones, cocina y baños, conforme a la disponibilidad y normativa interna del establecimiento.
El horario de apertura de la cafetería será de 09:00 a 20:00 horas.

Séptimo: Prohibiciones
El Subarrendatario no podrá ceder ni transferir este contrato a ningún título, ni subarrendar total o parcialmente el espacio objeto de este contrato.

Octavo: Término Anticipado
El Subarrendador podrá poner término anticipado al contrato en caso de incumplimiento grave por parte del Subarrendatario, especialmente por:
- No pago de la renta mensual en los plazos estipulados.
- Uso indebido del espacio o incumplimiento de las normas internas del establecimiento.
- Daños graves a la propiedad o alteraciones no autorizadas en el espacio arrendado.

Noveno: Restitución
Al término del contrato, el Subarrendatario deberá restituir el espacio subarrendado en las mismas condiciones en que lo recibió, con excepción del desgaste natural derivado del uso legítimo.
Si al momento de la restitución existen daños, el Subarrendador podrá retener total o parcialmente el mes de garantía hasta cubrir los costos de reparación.

Décimo: Exención de Responsabilidad y Embargos
El Subarrendatario declara conocer que el espacio subarrendado se encuentra dentro de un inmueble de uso compartido, destinado al funcionamiento del establecimiento Sutrato Workcoffee, y que comparte áreas comunes con otros arrendatarios y usuarios.
En consecuencia, el Subarrendador no asume responsabilidad alguna por embargos, fiscalizaciones, inspecciones u otros actos judiciales o administrativos que recaigan sobre el Subarrendatario y que se realicen en el inmueble objeto de este contrato.
En caso de que autoridades judiciales, tributarias o administrativas comparezcan en el inmueble por actos vinculados al Subarrendatario, el Subarrendador no será responsable por bienes, documentos o pertenencias del Subarrendatario, ni por los perjuicios que tales actuaciones pudieran generar.
El Subarrendatario se compromete a mantener indemne al Subarrendador frente a cualquier reclamo, daño o perjuicio derivado de procedimientos de embargo, fiscalización, uso indebido del espacio o cualquier acción originada por sus actividades comerciales o tributarias.
El Subarrendatario reconoce expresamente que este contrato no constituye arriendo de inmueble completo, sino únicamente el derecho de uso de una oficina o dependencia dentro del establecimiento, para fines comerciales, profesionales o administrativos.

Undécimo: Jurisdicción
Para todos los efectos legales derivados del presente contrato, las partes fijan domicilio en la ciudad de Arica y se someten expresamente a la competencia de sus Tribunales Ordinarios de Justicia.`
  )

  // 🔄 EFECTO: Si falta el representante en la URL, se consulta directo a Supabase por ID
  useEffect(() => {
    const cargarDatosSupabase = async () => {
      if (clienteId) {
        const { data, error } = await supabase
          .from('oficinas_fisicas')
          .select('*')
          .eq('id', clienteId)
          .single()

        if (data && !error) {
          if (data.nombre_cliente) setSubarrendatarioNombre(data.nombre_cliente)
          if (data.rut_empresa || data.rut) setSubarrendatarioRut(data.rut_empresa || data.rut)
          if (data.representante_legal) setRepresentanteNombre(data.representante_legal)
          if (data.rut_representante) setRepresentanteRut(data.rut_representante)
          if (data.espacio_asignado || data.tipo_espacio) setOficinaNumero(data.espacio_asignado || data.tipo_espacio)
          if (data.monto_mensual) setMontoRenta(String(data.monto_mensual))
        }
      }
    }

    // Cargar parámetros si vienen en URL
    if (nombreParam) setSubarrendatarioNombre(nombreParam)
    if (rutParam) setSubarrendatarioRut(rutParam)
    if (espacioParam) setOficinaNumero(espacioParam)
    if (montoParam) setMontoRenta(montoParam)
    if (repNombreParam) setRepresentanteNombre(repNombreParam)
    if (repRutParam) setRepresentanteRut(repRutParam)

    cargarDatosSupabase()
  }, [clienteId, nombreParam, rutParam, espacioParam, montoParam, repNombreParam, repRutParam])

  const handleImprimir = () => {
    window.print()
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 font-sans p-4 sm:p-6 text-slate-800">
      
      {/* 🚀 BARRA DE ACCIONES (Oculta al imprimir) */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-4 print:hidden">
        <button
          onClick={() => navigate('/oficinas-fisicas/contratos')}
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-slate-900 transition"
        >
          <ArrowLeft size={16} /> Volver a Contratos Físicos
        </button>

        <div className="flex items-center gap-3">
          <button
            onClick={handleImprimir}
            className="inline-flex items-center gap-2 bg-[#C5A059] hover:bg-[#b59049] text-slate-950 font-bold px-4 py-2 rounded-lg text-xs shadow transition"
          >
            <Printer size={16} /> Imprimir / Guardar PDF
          </button>
        </div>
      </div>

      {/* ⚙️ PANEL DE EDICIÓN DE DATOS Y CLÁUSULAS (Oculto al imprimir) */}
      <div className="space-y-6 print:hidden">
        
        {/* Formulario de Campos */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h2 className="font-bold text-slate-900 text-sm flex items-center gap-2">
            <Building2 size={18} className="text-[#C5A059]" />
            Completar datos del Contrato de Subarriendo
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block font-bold text-slate-600 mb-1">Fecha del Contrato</label>
              <input
                type="text"
                value={fechaContrato}
                onChange={(e) => setFechaContrato(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#C5A059]"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-600 mb-1">Subarrendatario (Empresa)</label>
              <input
                type="text"
                value={subarrendatarioNombre}
                onChange={(e) => setSubarrendatarioNombre(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#C5A059]"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-600 mb-1">RUT Subarrendatario</label>
              <input
                type="text"
                value={subarrendatarioRut}
                onChange={(e) => setSubarrendatarioRut(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#C5A059]"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-600 mb-1">Domicilio Subarrendatario</label>
              <input
                type="text"
                value={subarrendatarioDomicilio}
                onChange={(e) => setSubarrendatarioDomicilio(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#C5A059]"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-600 mb-1">Representante Legal</label>
              <input
                type="text"
                placeholder="Ej. Juan Pérez Soto"
                value={representanteNombre}
                onChange={(e) => setRepresentanteNombre(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#C5A059]"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-600 mb-1">RUT Representante</label>
              <input
                type="text"
                placeholder="Ej. 12.345.678-9"
                value={representanteRut}
                onChange={(e) => setRepresentanteRut(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#C5A059]"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-600 mb-1">Espacio / Oficina N°</label>
              <input
                type="text"
                value={oficinaNumero}
                onChange={(e) => setOficinaNumero(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#C5A059]"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-600 mb-1">Renta Mensual ($ CLP)</label>
              <input
                type="number"
                value={montoRenta}
                onChange={(e) => setMontoRenta(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#C5A059]"
              />
            </div>
          </div>
        </div>

        {/* Editor de Cláusulas */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Edit3 size={18} className="text-[#C5A059]" />
              Editor de Cláusulas (Modifica, agrega o elimina cualquier punto aquí)
            </h2>
            <span className="text-[11px] text-slate-400 font-medium">
              Actualización inmediata en la vista previa
            </span>
          </div>
          <textarea
            rows={14}
            value={clausulasTexto}
            onChange={(e) => setClausulasTexto(e.target.value)}
            className="w-full p-3 border border-slate-300 rounded-xl text-xs font-mono text-slate-800 leading-relaxed focus:outline-none focus:ring-1 focus:ring-[#C5A059] bg-slate-50/50"
          />
        </div>

      </div>

      {/* 📄 DOCUMENTO LEGAL VISTA PREVIA / IMPRIMIBLE */}
      <div className="bg-white p-8 sm:p-14 rounded-2xl border border-slate-300 shadow-md space-y-6 text-slate-900 text-xs sm:text-sm leading-relaxed print:border-none print:shadow-none print:p-0 print:space-y-4">
        
        {/* LOGO Y TÍTULO */}
        <div className="flex flex-col items-center justify-center text-center space-y-2 mb-6">
          <img 
            src="/Sustrato%20Logo.png" 
            alt="Sutrato Workcoffee Logo" 
            className="h-20 w-auto object-contain" 
            onError={(e) => { e.currentTarget.style.display = 'none' }}
          />
          <h1 className="text-xl sm:text-2xl font-black uppercase tracking-wider text-slate-900">
            CONTRATO DE SUBARRIENDO
          </h1>
        </div>

        {/* ENCABEZADO Y PARTES */}
        <p>
          En Arica, a <strong>{fechaContrato}</strong>, entre:
        </p>

        <div className="space-y-2 pl-2">
          <p>
            <strong>Subarrendador:</strong> Sutrato Limitada, RUT 77.935.903-4, representada por Jorge García Lira, RUT 19.905.955-6, con domicilio en 18 de Septiembre #537, Arica, en adelante “el Subarrendador”.
          </p>
          <p>
            <strong>Subarrendatario:</strong> {subarrendatarioNombre || '____________________________________________'}, RUT {subarrendatarioRut || '__________________'}, con domicilio en {subarrendatarioDomicilio || '____________________________________________'}, Arica, en adelante “el Subarrendatario”.
          </p>
        </div>

        {/* TEXTO DE CLÁUSULAS EDITABLE */}
        <div className="whitespace-pre-wrap text-justify pt-2 font-sans text-xs sm:text-sm leading-relaxed">
          {clausulasTexto}
        </div>

        {/* SECCIÓN DE FIRMAS */}
        <div className="pt-16 pb-8 border-t border-slate-200 mt-12 print:pt-12">
          <p className="font-bold text-center mb-12 uppercase tracking-wider text-xs">
            FIRMAN EN SEÑAL DE CONFORMIDAD:
          </p>

          <div className="grid grid-cols-2 gap-8 text-center text-xs">
            <div className="flex flex-col items-center">
              <div className="w-48 border-b border-slate-900 mb-2"></div>
              <p className="font-bold">Subarrendador</p>
              <p className="font-semibold text-slate-800">Sutrato Workcoffee</p>
              <p>RUT: 77.935.903-4</p>
              <p>Jorge García Lira</p>
              <p>RUT: 19.905.955-6</p>
            </div>

            <div className="flex flex-col items-center">
              <div className="w-48 border-b border-slate-900 mb-2"></div>
              <p className="font-bold">Subarrendatario</p>
              <p className="font-semibold text-slate-800">{subarrendatarioNombre || '________________________'}</p>
              <p>RUT: {subarrendatarioRut || '__________________'}</p>
              <p>Representante: {representanteNombre || '__________________'}</p>
              <p>RUT: {representanteRut || '__________________'}</p>
            </div>
          </div>
        </div>

      </div>

    </div>
  )
}