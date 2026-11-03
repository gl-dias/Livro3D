import { Component, Suspense, lazy, useCallback, useEffect, useState } from 'react'
import Flat from './Flat.jsx'

// three.js só é baixado se o 3D for mesmo rodar.
const Stage = lazy(() => import('./book/Stage.jsx'))

// Se o 3D quebrar depois de começar (contexto recusado, por exemplo), cai na versão plana.
class Guard extends Component {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  render() {
    return this.state.failed ? <Flat reason="webgl" canBook={false} /> : this.props.children
  }
}

function hasWebGL() {
  try {
    const c = document.createElement('canvas')
    return !!(c.getContext('webgl2') || c.getContext('webgl'))
  } catch {
    return false
  }
}

const params = new URLSearchParams(window.location.search)
const askedFlat = params.has('plano')
const debug = params.has('debug')
const gl = hasWebGL()

export default function App() {
  const [flatReason, setFlatReason] = useState(askedFlat ? 'pedido' : gl ? null : 'webgl')
  const [reduced, setReduced] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const fn = () => setReduced(mq.matches)
    mq.addEventListener('change', fn)
    return () => mq.removeEventListener('change', fn)
  }, [])

  // Celular deitado cai na versão plana. Ao voltar a ficar em pé, o livro retorna.
  useEffect(() => {
    if (flatReason !== 'tela') return
    const fn = () => {
      if (window.innerHeight > 500) setFlatReason(null)
    }
    window.addEventListener('resize', fn)
    return () => window.removeEventListener('resize', fn)
  }, [flatReason])

  const onFlat = useCallback((why) => setFlatReason(why), [])

  useEffect(() => {
    const text = document.getElementById('altlink')
    if (text) text.hidden = !!flatReason
  }, [flatReason])

  if (flatReason) return <Flat reason={flatReason} canBook={gl && flatReason === 'pedido'} />
  return (
    <Guard>
      <Suspense fallback={<p className="loading" role="status">abrindo o livro</p>}>
        <Stage reduced={reduced} onFlat={onFlat} debug={debug} />
      </Suspense>
    </Guard>
  )
}
