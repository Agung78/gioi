import { describe, it, expect } from 'vitest'
import { csvEscape } from '../lib/csv'

describe('csvEscape', () => {
	it('neutralizes formulas', () => {
		expect(csvEscape('=HYPERLINK("http://x","y")')).toBe('"\'=HYPERLINK(""http://x"",""y"")"')
		expect(csvEscape(' =1+1')).toBe("' =1+1")
		expect(csvEscape('+1')).toBe("'+1")
		expect(csvEscape('-1')).toBe("'-1")
		expect(csvEscape('@SUM(A1)')).toBe("'@SUM(A1)")
		expect(csvEscape('\t=1')).toBe("'\t=1")
	})
	it('leaves plain values and quotes commas', () => {
		expect(csvEscape('hello')).toBe('hello')
		expect(csvEscape(4)).toBe('4')
		expect(csvEscape('2026-11-15')).toBe('2026-11-15')
		expect(csvEscape(null)).toBe('')
		expect(csvEscape('a,b')).toBe('"a,b"')
	})
})
