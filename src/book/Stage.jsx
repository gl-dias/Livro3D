import { useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import { Canvas } from '@react-three/fiber'
import Scene from './Scene.jsx'
import { createStore } from './store.js'
import { LAST_F } from '../data/projects.js'

function Hud({ store, ready }) {
  useSyncExternalStore(store.subscribe, store.getSnapshot)
  const s = store.spread()
  const total = LAST_F + 1
  return (
    <div className={`hud${ready ? ' is-ready' : ''}`}>
      <div className="hud-now">
        <span className="hud-label">
          {s.label}
          {s.sub ? <span className="hud-sub"> · {s.sub}</span> : null}
        </span>
        {s.links.length ? (
          <span className="hud-links">
            {s.links.map((l) => (
              <a key={l.href} href={l.href} {...(l.href.startsWith('http') ? { target: '_blank', rel: 'noopener' } : {})}>
                {l.label}
                {l.href.startsWith('http') ? <span aria-hidden="true"> ↗</span> : null}
              </a>
            ))}
          </span>
        ) : (
          <span className="hud-hint">{store.touched ? `${store.f + 1} de ${total}` : hintFor(store)}</span>
        )}
      </div>
      <button type="button" className="hud-btn hud-prev" onClick={() => store.prev()} disabled={!store.canPrev()} aria-label="página anterior">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" /></svg>
      </button>
      <button type="button" className="hud-btn hud-next" onClick={() => store.next()} disabled={!store.canNext()} aria-label="próxima página">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7" /></svg>
      </button>
      <p className="sr-only" aria-live="polite">{liveText(s)}</p>
    </div>
  )
}

function hintFor(store) {
  return store.f === 0 ? 'toque na capa ou arraste pra abrir' : 'arraste a página pra virar'
}

function liveText(s) {
  if (!s.project) return s.label
  const p = s.project
  return `${p.name}. ${p.status}. ${p.tagline} Stack: ${p.stack.join(', ')}.`
}

export default function Stage({ reduced, onFlat, debug }) {
  const store = useMemo(() => createStore({ reduced }), [reduced])
  const [ready, setReady] = useState(false)
  // Se o 3D não abrir em tempo razoável, a pessoa não fica olhando pro nada.
  useEffect(() => {
    if (ready) return undefined
    const id = setTimeout(() => onFlat('contexto'), 20000)
    return () => clearTimeout(id)
  }, [ready, onFlat])
  return (
    <>
      <div className={`stage${ready ? ' is-ready' : ''}`}>
        <Canvas
          flat
          frameloop="demand"
          dpr={[1, 2]}
          gl={{ antialias: true, powerPreference: 'high-performance', alpha: false, stencil: false }}
          camera={{ fov: 20, near: 1.5, far: 80, position: [0, 6, 2] }}
          onCreated={({ gl }) => gl.setClearColor('#0A0A0B')}
          aria-label="Livro 3D com os 7 projetos do portfólio. A versão em texto está no link acima."
        >
          <Scene store={store} onFlat={onFlat} onReady={() => setReady(true)} debug={debug} />
        </Canvas>
      </div>
      {!ready ? <p className="loading" role="status">abrindo o livro</p> : null}
      <Hud store={store} ready={ready} />
    </>
  )
}
