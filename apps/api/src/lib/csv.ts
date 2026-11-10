/** CSV cell: neutralizes spreadsheet formula injection, quotes when needed. */
export const csvEscape = (v: unknown) => {
	let s = String(v ?? '')
	if (/^\s*[=+\-@]/.test(s) || /^[\t\r]/.test(s)) s = `'${s}`
	if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) return `"${s.replace(/"/g, '""')}"`
	return s
}
