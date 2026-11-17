// Same escaping as apps/api/src/lib/csv.ts (formula-injection prefix, then quote).
export function csvEscape(v: unknown): string {
	let s = String(v ?? '')
	if (/^\s*[=+\-@]/.test(s) || /^[\t\r]/.test(s)) s = `'${s}`
	if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) return `"${s.replace(/"/g, '""')}"`
	return s
}

export function toCsv(columns: string[], rows: unknown[][]): string {
	const header = columns.map(csvEscape).join(',')
	const body = rows.map((row) => row.map(csvEscape).join(',')).join('\n')
	return body ? `${header}\n${body}` : header
}

