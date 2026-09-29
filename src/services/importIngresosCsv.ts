import { supabase } from './supabase'

export interface CsvImportRowError {
  row: number
  message: string
}

export interface CsvImportResult {
  totalRows: number
  importedPayments: number
  createdCompanies: number
  existingCompanies: number
  errors: CsvImportRowError[]
}

interface CsvIncomeRow {
  rut: string
  nombre: string
  direccion: string
  representanteLegal: string
  rutRepresentante: string
  contacto: string
  frecuencia: string
  estado: string
  fechaPago: string
  formaPago: string
  bruto: string
  proximoPago: string
}

function parseCsv(text: string): string[][] {
  const candidates = [',', ';', '\t']
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/)
  const delimiter = candidates.reduce((best, candidate) => {
    let count = 0
    for (const line of lines) {
      let inQuotes = false
      let lineCount = 0
      for (let index = 0; index < line.length; index += 1) {
        if (line[index] === '"') {
          if (inQuotes && line[index + 1] === '"') index += 1
          else inQuotes = !inQuotes
        } else if (!inQuotes && line[index] === candidate) {
          lineCount += 1
        }
      }
      count = Math.max(count, lineCount)
    }
    return count > best.count ? { delimiter: candidate, count } : best
  }, { delimiter: ',', count: 0 }).delimiter

  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false
  const source = text.replace(/^\uFEFF/, '')

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index]
    if (character === '"') {
      if (inQuotes && source[index + 1] === '"') {
        field += '"'
        index += 1
      } else {
        inQuotes = !inQuotes
      }
    } else if (character === delimiter && !inQuotes) {
      row.push(field.trim())
      field = ''
    } else if ((character === '\n' || character === '\r') && !inQuotes) {
      if (character === '\r' && source[index + 1] === '\n') index += 1
      row.push(field.trim())
      if (row.some((value) => value.length > 0)) rows.push(row)
      row = []
      field = ''
    } else {
      field += character
    }
  }

  row.push(field.trim())
  if (row.some((value) => value.length > 0)) rows.push(row)
  return rows
}

function mapCsvRowByPosition(values: string[]): CsvIncomeRow {
  return {
    nombre: values[0] ?? '',
    rut: values[1] ?? '',
    direccion: values[2] ?? '',
    representanteLegal: values[3] ?? '',
    rutRepresentante: values[4] ?? '',
    contacto: values[5] ?? '',
    frecuencia: values[6] ?? '',
    fechaPago: values[7] ?? '',
    formaPago: values[8] ?? '',
    bruto: values[9] ?? '',
    estado: values[12] || values[13] || '',
    proximoPago: values[14] ?? '',
  }
}

function normalizeHeader(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('es-CL')
    .replace(/[^a-z0-9]/g, '')
}

function normalizeRut(value: string): string {
  return value.toLocaleUpperCase('es-CL').replace(/[^0-9K]/g, '')
}

function parseLocaleNumber(value: string): number | null {
  let normalized = value.trim().replace(/[^\d,.-]/g, '')
  if (!normalized) return null

  const commaIndex = normalized.lastIndexOf(',')
  const dotIndex = normalized.lastIndexOf('.')
  if (commaIndex >= 0 && dotIndex >= 0) {
    const decimalSeparator = commaIndex > dotIndex ? ',' : '.'
    const thousandsSeparator = decimalSeparator === ',' ? '.' : ','
    normalized = normalized.split(thousandsSeparator).join('')
    if (decimalSeparator === ',') normalized = normalized.replace(',', '.')
  } else if (commaIndex >= 0) {
    normalized = normalized.replace(/\./g, '').replace(',', '.')
  }

  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

function parseDate(value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed) return null

  const dmy = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/)
  if (dmy) {
    const [, day, month, year] = dmy
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
  }

  // Excel serial dates are counted from 1899-12-30.
  if (/^\d{5}(?:\.\d+)?$/.test(trimmed)) {
    const date = new Date(Date.UTC(1899, 11, 30) + Number(trimmed) * 86_400_000)
    return date.toISOString().slice(0, 10)
  }

  const parsed = new Date(trimmed)
  if (Number.isNaN(parsed.getTime())) return null
  return parsed.toISOString().slice(0, 10)
}

function nextPaymentDate(paymentDate: string, frequency: string): string {
  const monthIntervals: Record<string, number> = {
    mensual: 1,
    trimestral: 3,
    semestral: 6,
    anual: 12,
  }
  const normalizedFrequency = normalizeHeader(frequency)
  const frequencyKey = Object.keys(monthIntervals).find((period) => normalizedFrequency.includes(period))
  const monthsToAdd = frequencyKey ? monthIntervals[frequencyKey] : 1
  const nextDate = new Date(`${paymentDate}T00:00:00.000Z`)
  nextDate.setUTCMonth(nextDate.getUTCMonth() + monthsToAdd)
  return nextDate.toISOString().slice(0, 10)
}

function normalizeFrequency(value: string): string {
  const normalized = normalizeHeader(value)
  const frequencies = ['mensual', 'trimestral', 'semestral', 'anual']
  const match = frequencies.find((frequency) => normalized.includes(frequency))
  if (!match) return value.trim()
  return match.charAt(0).toLocaleUpperCase('es-CL') + match.slice(1)
}

/**
 * Imports the fixed-column income-history CSV (columns A:O). It tolerates
 * title/header rows before the first data row and skips lines with an empty RUT.
 * Both comma- and semicolon-delimited CSV files are supported.
 */
export async function importIngresosCsv(file: File | string): Promise<CsvImportResult> {
  const text = typeof file === 'string' ? file : await file.text()
  const rows = parseCsv(text)
  if (rows.length < 2) {
    throw new Error('El CSV debe incluir una cabecera y al menos una fila de ingresos.')
  }

  // El archivo HISTORIAL DE INGRESO NUEVO tiene una línea de título y columnas fijas.
  // Se localiza la primera fila que parece dato (RUT en posición 1) y se empieza allí.
  const headerIndex = rows.findIndex((row) => {
    const normalizedFirstColumn = normalizeHeader(row[0] ?? '')
    const normalizedSecondColumn = normalizeHeader(row[1] ?? '')
    return normalizedFirstColumn === 'empresa' && normalizedSecondColumn === 'rut'
  })
  const firstDataIndex = headerIndex >= 0
    ? headerIndex + 1
    : rows.findIndex((row) => normalizeRut(row[1] ?? '').length >= 8)

  if (firstDataIndex < 0) {
    throw new Error('No se encontraron filas de ingresos con la estructura esperada (EMPRESA en columna A y RUT en B).')
  }

  const { data: existingCompanies, error: companyQueryError } = await supabase
    .from('empresas')
    .select('id, rut')
  if (companyQueryError) throw new Error(`No se pudieron consultar las empresas: ${companyQueryError.message}`)

  const companyIdsByRut = new Map<string, string | number>()
  const existingRutKeys = new Set<string>()
  for (const company of existingCompanies ?? []) {
    const key = normalizeRut(String(company.rut ?? ''))
    if (key && company.id !== null && company.id !== undefined) {
      companyIdsByRut.set(key, company.id as string | number)
      existingRutKeys.add(key)
    }
  }

  const result: CsvImportResult = {
    totalRows: rows.length - firstDataIndex,
    importedPayments: 0,
    createdCompanies: 0,
    existingCompanies: 0,
    errors: [],
  }
  const knownRutKeys = new Set<string>()

  for (let index = firstDataIndex; index < rows.length; index += 1) {
    const csvRow = mapCsvRowByPosition(rows[index])
    const rowNumber = index + 1
    const rut = csvRow.rut.trim()
    const rutKey = normalizeRut(rut)

    // Ignora filas vacías, separadores y filas sin RUT (p. ej. subtotales).
    if (!rutKey) continue

    const fechaPago = parseDate(csvRow.fechaPago)
    const brutoInput = parseLocaleNumber(csvRow.bruto)

    if (!fechaPago) {
      result.errors.push({ row: rowNumber, message: 'Fecha de pago vacía o inválida.' })
      continue
    }
    if (!csvRow.formaPago.trim()) {
      result.errors.push({ row: rowNumber, message: 'Forma de pago vacía.' })
      continue
    }
    if (brutoInput === null || brutoInput < 0) {
      result.errors.push({ row: rowNumber, message: 'Monto bruto vacío o inválido.' })
      continue
    }

    const firstOccurrence = !knownRutKeys.has(rutKey)
    const alreadyExisted = existingRutKeys.has(rutKey)
    const companyPayload = {
      rut: rut.trim(),
      nombre: csvRow.nombre.trim() || rut.trim(),
      direccion: csvRow.direccion.trim(),
      representante_legal: csvRow.representanteLegal.trim(),
      rut_representante: csvRow.rutRepresentante.trim(),
      contacto: csvRow.contacto.trim(),
      frecuencia: normalizeFrequency(csvRow.frecuencia) || 'Mensual',
      estado: csvRow.estado.trim() || 'VIGENTE',
    }
    const { data: company, error: companyUpsertError } = await supabase
      .from('empresas')
      .upsert(companyPayload, { onConflict: 'rut' })
      .select('id, rut')
      .single()

    if (companyUpsertError || !company?.id) {
      result.errors.push({
        row: rowNumber,
        message: companyUpsertError?.message ?? 'Supabase no devolvió el ID de la empresa guardada.',
      })
      continue
    }

    const empresaId = company.id as string | number
    companyIdsByRut.set(rutKey, empresaId)
    if (firstOccurrence) {
      if (alreadyExisted) result.existingCompanies += 1
      else result.createdCompanies += 1
    }
    existingRutKeys.add(rutKey)
    knownRutKeys.add(rutKey)

    const bruto = Math.round(brutoInput * 100) / 100
    const neto = Math.round((bruto / 1.19) * 100) / 100
    const iva = Math.round((bruto - neto) * 100) / 100
    const { error: paymentInsertError } = await supabase
      .from('pagos')
      .insert({
        empresa_id: String(empresaId),
        fecha_pago: fechaPago,
        forma_pago: csvRow.formaPago.trim(),
        bruto,
        neto,
        iva,
        monto_liquido: bruto,
        comision_tarjeta: 0,
        proximo_pago: parseDate(csvRow.proximoPago) ?? nextPaymentDate(fechaPago, csvRow.frecuencia),
      })

    if (paymentInsertError) {
      result.errors.push({ row: rowNumber, message: `No se pudo registrar el pago: ${paymentInsertError.message}` })
      continue
    }
    result.importedPayments += 1
  }

  return result
}
