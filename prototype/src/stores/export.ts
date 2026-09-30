import { useDataStore } from './data'
import type { Reservation } from '../domain/types'

const CSV_COLUMNS = [
  'bookingCode', 'date', 'time', 'partySize', 'status', 'source',
  'guestName', 'phone', 'email', 'country',
  'seatingArea', 'occasion',
  'allergies', 'accessibility', 'guestNotes', 'internalNotes',
  'createdAt', 'updatedAt',
]

function escapeCSV(value: unknown): string {
  if (value === null || value === undefined) return ''
  const str = String(value)
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

export function reservationsCSV(reservations: Reservation[]): string {
  const data = useDataStore()
  const headers = CSV_COLUMNS
  const lines = [headers.join(',')]
  for (const r of reservations) {
    const g = data.getGuest(r.guestId)
    const area = data.settings.seatingAreas.find((a) => a.id === r.seatingAreaId)
    const row = [
      r.bookingCode,
      r.date,
      r.time,
      r.partySize,
      r.status,
      r.source,
      g?.fullName ?? '',
      g?.phone ?? '',
      g?.email ?? '',
      g?.country ?? '',
      area?.name ?? '',
      r.occasion ?? '',
      (g?.allergies ?? []).join('; '),
      g?.accessibility ?? '',
      r.guestNotes ?? '',
      r.internalNotes ?? '',
      r.createdAt,
      r.updatedAt,
    ]
    lines.push(row.map(escapeCSV).join(','))
  }
  return lines.join('\n')
}

export function downloadCSV(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}