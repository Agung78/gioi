import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'

const apiRoot = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
	test: {
		include: ['src/__tests__/db/**'],
		alias: {
			'@gioi/domain': resolve(apiRoot, '../../packages/domain/src/index.ts'),
		},
	},
})
