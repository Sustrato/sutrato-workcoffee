import type { DocumentRecord } from '../types'

const STORAGE_KEY = 'sustrato-planillas:documents'

const initialDocuments: DocumentRecord[] = [
  {
    id: 'doc-001',
    nombre: 'Planilla de remuneraciones - Septiembre 2026',
    nombre_archivo: 'remuneraciones_septiembre_2026.xlsx',
    categoria: 'Remuneraciones',
    tipo: 'Excel',
    fecha_subida: '2026-09-26T14:30:00.000Z',
    ruta_storage: '/mock-storage/remuneraciones_septiembre_2026.xlsx',
    usuario_id: 'usr-001',
  },
  {
    id: 'doc-002',
    nombre: 'Liquidaciones de sueldo - Septiembre 2026',
    nombre_archivo: 'liquidaciones_septiembre_2026.pdf',
    categoria: 'Liquidaciones',
    tipo: 'PDF',
    fecha_subida: '2026-09-25T10:15:00.000Z',
    ruta_storage: '/mock-storage/liquidaciones_septiembre_2026.pdf',
    usuario_id: 'usr-001',
  },
  {
    id: 'doc-003',
    nombre: 'Control de asistencia - Septiembre 2026',
    nombre_archivo: 'asistencia_septiembre_2026.xlsx',
    categoria: 'Asistencia',
    tipo: 'Excel',
    fecha_subida: '2026-09-24T16:45:00.000Z',
    ruta_storage: '/mock-storage/asistencia_septiembre_2026.xlsx',
    usuario_id: 'usr-002',
  },
  {
    id: 'doc-004',
    nombre: 'Resumen de cotizaciones previsionales - Septiembre 2026',
    nombre_archivo: 'cotizaciones_previsionales.pdf',
    categoria: 'Cotizaciones',
    tipo: 'PDF',
    fecha_subida: '2026-09-22T09:20:00.000Z',
    ruta_storage: '/mock-storage/cotizaciones_previsionales.pdf',
    usuario_id: 'usr-001',
  },
  {
    id: 'doc-005',
    nombre: 'Registro de vacaciones y permisos',
    nombre_archivo: 'vacaciones_permisos_septiembre_2026.xlsx',
    categoria: 'Asistencia',
    tipo: 'Excel',
    fecha_subida: '2026-09-19T11:05:00.000Z',
    ruta_storage: '/mock-storage/vacaciones_permisos_septiembre_2026.xlsx',
    usuario_id: 'usr-002',
  },
]

function isBrowser(): boolean {
  return typeof window !== 'undefined' && window.localStorage !== undefined
}

export function getDocuments(): DocumentRecord[] {
  if (!isBrowser()) return initialDocuments

  try {
    const storedDocuments = window.localStorage.getItem(STORAGE_KEY)
    if (storedDocuments === null) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(initialDocuments))
      return initialDocuments
    }

    return JSON.parse(storedDocuments) as DocumentRecord[]
  } catch {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(initialDocuments))
    return initialDocuments
  }
}

export function saveDocuments(documents: DocumentRecord[]): void {
  if (!isBrowser()) return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(documents))
}

export function addDocument(document: DocumentRecord): DocumentRecord[] {
  const documents = [...getDocuments(), document]
  saveDocuments(documents)
  return documents
}

export function deleteDocument(id: string): DocumentRecord[] {
  const documents = getDocuments().filter((document) => document.id !== id)
  saveDocuments(documents)
  return documents
}
