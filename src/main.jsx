import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './styles.css'

// As fontes já existem na raiz do site. Vão pelo FontFace (e não pelo CSS) pra o
// Vite não prefixar o caminho com /livro/, e os canvas só pintam depois delas.
const FONTS = [
  ['Anton', '/fonts/anton-latin.woff2', { weight: '400' }],
  ['Geist', '/fonts/geist-latin.woff2', { weight: '400 600' }],
  ['Geist Mono', '/fonts/geist-mono-latin.woff2', { weight: '400 500' }],
]

async function loadFonts() {
  await Promise.all(
    FONTS.map(async ([family, url, desc]) => {
      try {
        const face = new FontFace(family, `url(${url}) format('woff2')`, desc)
        document.fonts.add(await face.load())
      } catch {
        // Sem a fonte o livro abre com a alternativa do sistema.
      }
    }),
  )
}

loadFonts().finally(() => {
  createRoot(document.getElementById('root')).render(<App />)
})
