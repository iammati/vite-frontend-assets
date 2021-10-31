import { defineConfig, UserConfig } from 'vite'
import eslintPlugin from 'vite-plugin-eslint'
import { resolve } from 'path'
import { exec } from 'child_process'

const production = process.env.NODE_ENV === 'production'
const context = production ? 'production' : 'development'
const hot = __dirname + '/../../public/dist/hot'

exec(`echo ${context} > ${hot}`)

const configuration: UserConfig = {
    base: '/dist/',

    plugins: [
        eslintPlugin(),
        {
            name: 'custom-hot',
            enforce: 'post',

            handleHotUpdate ({ file, server }) {
                // console.log(file);
            }
        }
    ],

    build: {
        // mode: context,
        bundle: true,
        minify: true,
        reportCompressedSize: true,
        outDir: resolve(__dirname, '../../public/dist'),

        target: 'esnext',

        emptyOutDir: true,
        manifest: true,
        sourcemap: true,

        watch: {
            include: './src/**'
        },

        rollupOptions: {
            input: ['./src/TypeScript/app.ts'],
        }
    },

    server: {
        port: 3000
    }
}

export default defineConfig(configuration)
