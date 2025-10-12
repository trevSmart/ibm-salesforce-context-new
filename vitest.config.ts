import { defineConfig } from 'vitest/config'
export default defineConfig({
	test: {
		globals: true,
		environment: 'node',
		setupFiles: ['./test/setup.ts'],
		testTimeout: 10000,
		hookTimeout: 12000,
		retry: 2,
		// Force single worker to avoid multiple server instances
		pool: 'threads',
		poolOptions: {
			threads: {
				singleThread: true
			}
		},
		include: ['test/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
		coverage: {
			enabled: false,
			reporter: [],
			reportsDirectory: 'node_modules/.vitest/coverage', //dummy
			include: ['*.js', '*.ts', 'src/**/*.js', 'src/**/*.ts'],
			provider: 'v8',
			all: true,
			exclude: [
				'**/*.test.*',
				'**/__tests__/**',
				'node_modules/**',
				'dist/**',
				'vitest.config.ts',
				'index.js',
			],
		},
	},
})
