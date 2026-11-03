import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'

// O build sai em Portif/livro, dentro do repo do site, que é o que o Cloudflare publica.
// emptyOutDir só limpa essa pasta. Fontes, prints e posts já existem na raiz
// do site, então no dev o Vite pede pro servidor local que serve o Portif.
const site = process.env.LIVRO_SITE || 'http://127.0.0.1:8080'

export default defineConfig({
  base: '/livro/',
  plugins: [react()],
  build: {
    outDir: fileURLToPath(new URL('../Portif/livro', import.meta.url)),
    emptyOutDir: true,
    chunkSizeWarningLimit: 1200,
  },
  server: {
    proxy: {
      '/fonts': site,
      '/images': site,
      '/posts': site,
    },
  },
})
