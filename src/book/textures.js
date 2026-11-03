// Guarda as texturas das páginas. Nunca ficam todas em memória: só as vizinhas
// de onde a pessoa está. Depois de subir pra GPU, o canvas é zerado pra não ocupar
// a memória duas vezes.
import * as THREE from 'three'
import { paintFace, needsImage, DW, DH } from './pages.js'
import { printUrl } from '../data/projects.js'

const images = new Map()

function loadImage(slug, width) {
  const key = `${slug}-${width}`
  if (!images.has(key)) {
    images.set(
      key,
      new Promise((resolve) => {
        const img = new Image()
        img.decoding = 'async'
        img.onload = () => resolve(img)
        img.onerror = () => resolve(null)
        img.src = printUrl(slug, width)
      }),
    )
  }
  return images.get(key)
}

export class FaceCache {
  constructor(renderer, texW, onReady) {
    this.renderer = renderer
    this.texW = texW
    this.texH = Math.round((texW * DH) / DW)
    this.onReady = onReady
    this.entries = new Map()
    this.aniso = Math.min(8, renderer.capabilities.getMaxAnisotropy())
    this.paintMs = []
    this.queue = []
    this.pumping = false
    const data = new Uint8Array([24, 23, 22, 255])
    this.placeholder = new THREE.DataTexture(data, 1, 1)
    this.placeholder.colorSpace = THREE.SRGBColorSpace
    this.placeholder.needsUpdate = true
  }

  // Devolve o que já tiver: a textura pronta ou o tampão, enquanto pinta.
  get(face) {
    const e = this.entries.get(face)
    if (e?.texture) return e.texture
    this.ensure(face, true)
    return this.placeholder
  }

  hits(face) {
    return this.entries.get(face)?.hits || []
  }

  ready(face) {
    return !!this.entries.get(face)?.texture
  }

  // Urgente pinta na hora. O resto entra numa fila, uma face por vez e só com o
  // navegador livre, pra adiantar as próximas páginas sem travar o arrasto.
  ensure(face, urgent = false) {
    if (face < 0 || face > 19) return Promise.resolve()
    let e = this.entries.get(face)
    if (!e) {
      e = { texture: null, hits: [], promise: null, resolve: null, started: false, disposed: false }
      e.promise = new Promise((resolve) => {
        e.resolve = resolve
      })
      this.entries.set(face, e)
      if (!urgent) {
        this.queue.push([face, e])
        this.pump()
      }
    }
    if (urgent && !e.started) this.start(face, e)
    return e.promise
  }

  start(face, e) {
    e.started = true
    return this.paint(face, e).finally(() => e.resolve())
  }

  pump() {
    if (this.pumping) return
    this.pumping = true
    const idle = window.requestIdleCallback || ((fn) => setTimeout(fn, 16))
    const step = () => {
      let job = this.queue.shift()
      while (job && (job[1].started || job[1].disposed)) job = this.queue.shift()
      if (!job) {
        this.pumping = false
        return
      }
      this.start(job[0], job[1]).finally(() => idle(step, { timeout: 250 }))
    }
    idle(step, { timeout: 250 })
  }

  async paint(face, e) {
    const slug = needsImage(face)
    const img = slug ? await loadImage(slug, 1440) : null
    if (e.disposed) return
    const start = performance.now()
    const canvas = document.createElement('canvas')
    canvas.width = this.texW
    canvas.height = this.texH
    const ctx = canvas.getContext('2d')
    ctx.scale(this.texW / DW, this.texH / DH)
    e.hits = paintFace(ctx, face, img)
    const tex = new THREE.CanvasTexture(canvas)
    tex.colorSpace = THREE.SRGBColorSpace
    tex.minFilter = THREE.LinearMipmapLinearFilter
    tex.magFilter = THREE.LinearFilter
    tex.generateMipmaps = true
    tex.anisotropy = this.aniso
    tex.onUpdate = () => {
      canvas.width = 0
      canvas.height = 0
      tex.onUpdate = null
    }
    // Sobe já, pra virada não engasgar na primeira vez que a face aparece.
    this.renderer.initTexture(tex)
    e.texture = tex
    this.paintMs.push(performance.now() - start)
    this.onReady?.(face)
  }

  // Mantém só as faces da lista e libera o resto.
  keep(faces) {
    const set = new Set(faces)
    for (const [face, e] of this.entries) {
      if (!set.has(face) && (e.texture || !e.started)) {
        e.disposed = true
        e.texture?.dispose()
        e.resolve()
        this.entries.delete(face)
      }
    }
    for (const f of faces) this.ensure(f)
  }

  dispose() {
    for (const e of this.entries.values()) {
      e.disposed = true
      e.texture?.dispose()
      e.resolve()
    }
    this.entries.clear()
    this.queue.length = 0
    this.placeholder.dispose()
  }
}
