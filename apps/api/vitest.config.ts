import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'

const apiRoot = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
	test: {
		include: ['src/**/*.test.ts'],
		exclude: ['src/**/__tests__/db/**'],
		alias: {
			'@gioi/domain': resolve(apiRoot, '../../packages/domain/src/index.ts'),
		},
	},
})
