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

// RFC4180: quoted fields, "" escapes, commas/newlines inside quotes, \r\n; drops trailing empty line.
export function parseCsv(text: string): string[][] {
	const rows: string[][] = []
	let row: string[] = []
	let field = ''
	let inQuotes = false
	let i = 0
	const n = text.length
	while (i < n) {
		const c = text[i]
		if (inQuotes) {
			if (c === '"') {
				if (text[i + 1] === '"') {
					field += '"'
					i += 2
					continue
				}
				inQuotes = false
				i++
				continue
			}
			field += c
			i++
			continue
		}
		if (c === '"') {
			inQuotes = true
			i++
			continue
		}
		if (c === ',') {
			row.push(field)
			field = ''
			i++
			continue
		}
		if (c === '\r') {
			row.push(field)
			field = ''
			rows.push(row)
			row = []
			if (text[i + 1] === '\n') i++
			i++
			continue
		}
		if (c === '\n') {
			row.push(field)
			field = ''
			rows.push(row)
			row = []
			i++
			continue
		}
		field += c
		i++
	}
	if (field || row.length) {
		row.push(field)
		rows.push(row)
	}
	if (rows.length && rows[rows.length - 1].length === 1 && rows[rows.length - 1][0] === '') rows.pop()
	return rows
}
