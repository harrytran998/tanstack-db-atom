import { defineConfig } from 'rolldown'

const external = ['@effect-atom/atom-react', '@tanstack/db', 'effect']

export default defineConfig([
	{
    input: 'src/index.ts',
    external,
		output: {
			file: 'dist/index.js',
      format: 'esm',
    },
	},
	{
    input: 'src/index.ts',
		external,
		output: {
			file: 'dist/index.cjs',
			format: 'cjs',
		},

	},
])
