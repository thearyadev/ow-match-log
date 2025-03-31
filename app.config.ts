// app.config.ts
import { defineConfig } from '@tanstack/react-start/config'
import tsConfigPaths from 'vite-tsconfig-paths'
import tailwindcss from '@tailwindcss/vite'
import autoprefixer from 'autoprefixer'

export default defineConfig({
    vite: {
        plugins: [
            tsConfigPaths({
                projects: ['./tsconfig.json'],
            }),
            tailwindcss(),
        ],
        css: {
            postcss: {
                plugins: [autoprefixer()],
            },
        },
    },
    server: {
        watchOptions: {
            ignored: ['owml.db'],
        },
        preset: 'node-server',
    },
})
