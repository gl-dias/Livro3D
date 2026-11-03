import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { GRID, PAGE_H, PAGE_W, createSheetGeometryData, deformSheet, rootHeight, tFromTipX, tipX } from './deform.js'
import { FaceCache } from './textures.js'
import { pageFragment, pageVertex } from './shaders.js'
import { createDesk, lit } from './desk.js'
import { fit, pagePixels, placeCamera } from './camera.js'
import { DH, DW } from './pages.js'
import { LAST_F, PROJECTS, faceLeft, faceRight } from '../data/projects.js'

const W = PAGE_W
const H = PAGE_H
const SHEET_H = 0.011
const COVER_T = 0.02
const MARGIN = 0.022 // quanto a capa sobra além do miolo
const PAPER_SHEETS = 8
// Azul-marinho da encadernação, um pouco mais claro que a capa pra não sumir na mesa.
const BOARD_EDGE = '#24457C'
const TILT = { spreadOpen: 0.34, spreadClosed: 0.6, singleOpen: 0.08, singleClosed: 0.42 }

const paperLeft = (f) => Math.max(0, Math.min(PAPER_SHEETS, f - 1))
const paperRight = (f) => Math.max(0, Math.min(PAPER_SHEETS, LAST_F - 1 - f))
const lerp = (a, b, t) => a + (b - a) * t
const smooth = (x) => x * x * (3 - 2 * x)
const damp = (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt))

function pageMaterial(gutter, gloss) {
  return new THREE.ShaderMaterial({
    vertexShader: pageVertex,
    fragmentShader: pageFragment,
    side: THREE.DoubleSide,
    uniforms: {
      uFront: { value: null },
      uBack: { value: null },
      uTurn: { value: new THREE.Vector4(0, 0, 0, 0.2) },
      uGutter: { value: gutter },
      uGloss: { value: gloss },
    },
  })
}

function sheetGeometry(dynamic) {
  const data = createSheetGeometryData(GRID)
  const geo = new THREE.BufferGeometry()
  const pos = new THREE.BufferAttribute(data.position, 3)
  const nor = new THREE.BufferAttribute(data.normal, 3)
  if (dynamic) {
    pos.setUsage(THREE.DynamicDrawUsage)
    nor.setUsage(THREE.DynamicDrawUsage)
  }
  geo.setAttribute('position', pos)
  geo.setAttribute('normal', nor)
  geo.setAttribute('uv', new THREE.BufferAttribute(data.uv, 2))
  geo.setIndex(new THREE.BufferAttribute(data.index, 1))
  return { data, geo }
}

function createBook() {
  const group = new THREE.Group()

  // Folha em movimento: a única malha que muda a cada quadro.
  const turning = sheetGeometry(true)
  const turnMat = pageMaterial(0.42, 0)
  const turnMesh = new THREE.Mesh(turning.geo, turnMat)
  turnMesh.frustumCulled = false
  turnMesh.visible = false
  group.add(turnMesh)

  // Páginas de cima de cada lado. Já curvadas na dobra, e nunca mudam de forma.
  const restR = sheetGeometry(false)
  deformSheet(restR.data, 0)
  const restL = sheetGeometry(false)
  deformSheet(restL.data, 1)
  const matR = pageMaterial(0.42, 0)
  const matL = pageMaterial(0.42, 0)
  const pageR = new THREE.Mesh(restR.geo, matR)
  const pageL = new THREE.Mesh(restL.geo, matL)
  pageR.frustumCulled = false
  pageL.frustumCulled = false
  group.add(pageR, pageL)

  // Blocos de páginas
  const blockGeo = new THREE.BoxGeometry(W - 0.002, 1, H - 0.002)
  const blockMat = lit('#FFFFFF', 0, 1100)
  blockMat.uniforms.uColor.value.setRGB(1.7, 1.62, 1.42)
  const blockR = new THREE.Mesh(blockGeo, blockMat)
  const blockL = new THREE.Mesh(blockGeo, blockMat)
  blockR.position.x = (W - 0.002) / 2
  blockL.position.x = -(W - 0.002) / 2
  group.add(blockR, blockL)

  // Capas: placa rígida com duas faces desenhadas.
  const boardW = W + MARGIN
  const boardH = H + MARGIN * 2
  const outerGeo = new THREE.PlaneGeometry(boardW, boardH)
  outerGeo.rotateX(-Math.PI / 2)
  outerGeo.translate(boardW / 2, 0, 0)
  // O lado de dentro tem o tamanho exato da página, e a borda azul da placa aparece em volta.
  const innerGeo = new THREE.PlaneGeometry(W, H, 1, 1)
  innerGeo.rotateX(-Math.PI / 2)
  innerGeo.translate(W / 2, 0, 0)
  const boardMat = lit(BOARD_EDGE, 0.1)
  const makeCover = (outerOnTop) => {
    const pivot = new THREE.Group()
    const box = new THREE.Mesh(new THREE.BoxGeometry(boardW, COVER_T, boardH), boardMat)
    box.position.x = boardW / 2
    pivot.add(box)
    const matTop = pageMaterial(outerOnTop ? 0 : 0.36, outerOnTop ? 0.012 : 0)
    const matBottom = pageMaterial(outerOnTop ? 0.36 : 0, outerOnTop ? 0 : 0.012)
    const top = new THREE.Mesh(outerOnTop ? outerGeo : innerGeo, matTop)
    top.position.y = COVER_T / 2 + 0.0006
    const bottom = new THREE.Mesh(outerOnTop ? innerGeo : outerGeo, matBottom)
    bottom.position.y = -COVER_T / 2 - 0.0006
    pivot.add(top, bottom)
    group.add(pivot)
    return { pivot, matTop, matBottom }
  }
  const coverFront = makeCover(true)
  const coverBack = makeCover(false)

  // Lombada, que só aparece com o livro fechado.
  const spine = new THREE.Mesh(new THREE.BoxGeometry(0.032, 1, H + MARGIN * 2), lit(BOARD_EDGE, 0.1))
  group.add(spine)

  return { group, turning, turnMesh, turnMat, pageR, pageL, matR, matL, blockR, blockL, coverFront, coverBack, spine }
}

export default function Scene({ store, onFlat, onReady, debug }) {
  const { gl, camera, size, invalidate } = useThree()
  const desk = useMemo(createDesk, [])
  const book = useMemo(createBook, [])
  const rig = useRef({
    poses: null,
    lookX: 0,
    open: store.f > 0 && store.f < LAST_F ? 1 : 0,
    parX: 0,
    parY: 0,
    parGoalX: 0,
    parGoalY: 0,
    first: true,
    frames: 0,
    deformCost: [],
    lastT: -1,
    lastSkew: 0,
    bookX: 0,
  })

  // Resolução das páginas: o suficiente pra tela, sem desperdiçar memória.
  const cache = useMemo(() => {
    const dpr = gl.getPixelRatio()
    const cssPage = Math.min(window.innerWidth, (window.innerHeight * DW) / DH)
    const texW = Math.min(1536, Math.max(1024, Math.ceil(cssPage * dpr * 0.9)))
    return new FaceCache(gl, texW, () => {
      applyFaces()
      invalidate()
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gl])

  function neighbours(f) {
    const out = []
    for (let k = f - 2; k <= f + 2; k++) {
      if (k < 0 || k > LAST_F) continue
      if (k > 0) out.push(faceLeft(k))
      if (k < LAST_F) out.push(faceRight(k))
    }
    return out
  }

  function applyFaces() {
    const { f, turn } = store
    const low = turn ? turn.low : f
    const high = turn ? turn.high : f
    const b = book

    // Capa e contracapa têm faces fixas, e só seguram textura quando dá pra ver.
    const frontSeen = low <= 1
    const backSeen = high >= LAST_F - 1
    b.coverFront.matTop.uniforms.uFront.value = frontSeen ? cache.get(0) : cache.placeholder
    b.coverFront.matBottom.uniforms.uBack.value = frontSeen ? cache.get(1) : cache.placeholder
    b.coverBack.matTop.uniforms.uFront.value = backSeen ? cache.get(18) : cache.placeholder
    b.coverBack.matBottom.uniforms.uBack.value = backSeen ? cache.get(19) : cache.placeholder

    if (paperLeft(low) > 0) b.matL.uniforms.uBack.value = cache.get(faceLeft(low))
    if (paperRight(high) > 0) b.matR.uniforms.uFront.value = cache.get(faceRight(high))
    if (turn && low > 0 && high < LAST_F) {
      b.turnMat.uniforms.uFront.value = cache.get(faceRight(low))
      b.turnMat.uniforms.uBack.value = cache.get(faceLeft(high))
    }
  }

  const pointer = useRef({ down: false, decided: null })
  const tmp = useMemo(
    () => ({ ray: new THREE.Raycaster(), ndc: new THREE.Vector2(), hit: new THREE.Vector3(), plane: new THREE.Plane(new THREE.Vector3(0, 1, 0), 0) }),
    [],
  )

  useEffect(() => {
    store.wake = () => invalidate()
    store.needsFaces = (low, high) => {
      cache.ensure(faceRight(low))
      cache.ensure(faceLeft(high))
      cache.ensure(faceRight(high))
      cache.ensure(faceLeft(low))
    }
    const unsub = store.subscribe(() => {
      applyFaces()
      if (!store.turn) cache.keep(neighbours(store.f))
      invalidate()
    })
    return () => {
      unsub()
      store.wake = () => {}
      store.needsFaces = () => {}
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store, cache, invalidate])

  // Primeiro carregamento: só mostra quando a página atual estiver pronta.
  useEffect(() => {
    let live = true
    const start = [0, 1, 2, faceLeft(store.f), faceRight(store.f)].filter((x) => x >= 0 && x <= 19)
    Promise.all(start.map((x) => cache.ensure(x, true))).then(() => {
      if (!live) return
      applyFaces()
      invalidate()
      onReady?.()
      cache.keep(neighbours(store.f))
    })
    return () => {
      live = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cache])

  useEffect(
    () => () => {
      cache.dispose()
    },
    [cache],
  )

  // Enquadramentos pra cada tamanho de janela
  useEffect(() => {
    const short = size.height < 520
    const view = {
      w: size.width,
      h: size.height,
      top: short ? 44 : 56,
      bottom: short ? 58 : size.width < 700 ? 118 : 92,
      side: size.width < 700 ? 10 : 20,
    }
    const m = MARGIN + 0.01
    const spreadRect = { x0: -W - m, x1: W + m, z0: -H / 2 - m, z1: H / 2 + m, y: 0.2 }
    const wideSpread = { ...spreadRect, x0: -W - 0.14, x1: W + 0.14 }
    const singleRect = { x0: -W / 2 - m, x1: W / 2 + m, z0: -H / 2 - m, z1: H / 2 + m, y: 0.03 }
    const closedSpread = { x0: -1.6, x1: 1.6, z0: -1.12, z1: 1.14, y: 0.25 }

    const openSpread = fit(camera, size.width / size.height > 1.45 ? wideSpread : spreadRect, TILT.spreadOpen, view)
    const pxSpread = pagePixels(camera, openSpread, TILT.spreadOpen, view, W)
    const singleOpen = fit(camera, singleRect, TILT.singleOpen, view)
    const pxSingle = pagePixels(camera, singleOpen, TILT.singleOpen, view, W)

    const layout = pxSpread >= 320 ? 'spread' : 'single'
    const poses =
      layout === 'spread'
        ? {
            open: { ...openSpread, tilt: TILT.spreadOpen },
            closed: { ...fit(camera, closedSpread, TILT.spreadClosed, view), tilt: TILT.spreadClosed },
          }
        : {
            open: { ...singleOpen, tilt: TILT.singleOpen },
            closed: {
              ...fit(camera, { x0: -0.72, x1: 0.72, z0: -H / 2 - 0.1, z1: H / 2 + 0.1, y: 0.2 }, TILT.singleClosed, view),
              tilt: TILT.singleClosed,
            },
          }
    rig.current.poses = poses
    rig.current.pagePx = layout === 'spread' ? pxSpread : pxSingle
    rig.current.first = true
    store.layout = layout
    store.emit()
    // Se nem uma página sozinha fica legível, a versão plana serve melhor.
    if (layout === 'single' && pxSingle < 262) onFlat?.('tela')
    invalidate()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size.width, size.height, camera])

  // Perda de contexto: cai na versão plana em vez de deixar a tela preta.
  useEffect(() => {
    const canvas = gl.domElement
    const lost = (e) => {
      e.preventDefault()
      onFlat?.('contexto')
    }
    canvas.addEventListener('webglcontextlost', lost)
    const vis = () => {
      if (!document.hidden) invalidate()
    }
    document.addEventListener('visibilitychange', vis)
    return () => {
      canvas.removeEventListener('webglcontextlost', lost)
      document.removeEventListener('visibilitychange', vis)
    }
  }, [gl, invalidate, onFlat])

  // Ponteiro
  useEffect(() => {
    const el = gl.domElement

    const pick = (e) => {
      const r = el.getBoundingClientRect()
      tmp.ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1)
      tmp.ray.setFromCamera(tmp.ndc, camera)
      const top = Math.max(COVER_T + paperLeft(store.f) * SHEET_H, COVER_T + paperRight(store.f) * SHEET_H)
      tmp.plane.constant = -top
      return tmp.ray.ray.intersectPlane(tmp.plane, tmp.hit) ? { x: tmp.hit.x - rig.current.bookX, z: tmp.hit.z } : null
    }

    // O que tem embaixo do ponteiro, com o livro parado.
    const probe = (e) => {
      const p = pick(e)
      if (!p || Math.abs(p.z) > H / 2 + MARGIN) return null
      const { f } = store
      if (f === 0) return p.x >= 0 && p.x <= W ? { p, zone: 'cover' } : { p }
      if (f === LAST_F) return p.x <= 0 && p.x >= -W ? { p, zone: 'backcover' } : { p }
      if (Math.abs(p.x) > W + MARGIN) return { p }
      const right = p.x >= 0
      const face = right ? faceRight(f) : faceLeft(f)
      const px = (Math.abs(p.x) / W) * DW
      const py = ((p.z + H / 2) / H) * DH
      const hit = cache.hits(face).find((h) => px >= h.x && px <= h.x + h.w && py >= h.y && py <= h.y + h.h)
      const edge = Math.abs(p.x) > W * 0.76
      return { p, right, hit, edge }
    }

    const act = (hit) => {
      if (hit.goto) store.goto(hit.goto)
      else if (hit.href) {
        if (hit.href.startsWith('http')) window.open(hit.href, '_blank', 'noopener')
        else window.location.href = hit.href
      }
    }

    const down = (e) => {
      if (e.button) return
      el.setPointerCapture?.(e.pointerId)
      const info = probe(e)
      pointer.current = {
        down: true,
        decided: null,
        sx: e.clientX,
        sy: e.clientY,
        time: performance.now(),
        info,
        startX: info?.p?.x ?? 0,
        skew: info?.p ? Math.max(-1, Math.min(1, info.p.z / (H / 2))) : 0,
      }
      if (e.pointerType !== 'touch') el.style.cursor = 'grabbing'
      rig.current.dragging = true
    }

    const decide = (dx) => {
      const ptr = pointer.current
      const forward = dx < 0
      const { f, side, layout } = store
      if (store.reduced) {
        ptr.decided = 'swipe'
        return
      }
      if (layout === 'single' && f > 0 && f < LAST_F) {
        if (forward && side === 'L') {
          ptr.decided = 'pan'
          ptr.panDir = 1
          return
        }
        if (!forward && side === 'R') {
          ptr.decided = 'pan'
          ptr.panDir = -1
          return
        }
      }
      const ok = store.beginDrag(forward ? 1 : -1, ptr.skew * 0.8)
      if (ok) {
        ptr.decided = 'turn'
        ptr.dir = forward ? 1 : -1
        ptr.px0 = e0.x
        const lowCover = store.turn.low === 0 || store.turn.high === LAST_F
        ptr.useDx = layout === 'single' || lowCover
        // A ponta sai de onde está e chega no outro extremo quando o dedo chegar
        // na borda oposta, sem pular, seja onde for que a pessoa pegou.
        ptr.grabX = forward ? Math.max(ptr.startX, W * 0.25) : Math.min(ptr.startX, -W * 0.25)
      } else {
        ptr.decided = 'none'
      }
    }
    const e0 = { x: 0 }

    const move = (e) => {
      const ptr = pointer.current
      if (!ptr.down) {
        hover(e)
        return
      }
      const dx = e.clientX - ptr.sx
      const dy = e.clientY - ptr.sy
      if (!ptr.decided) {
        if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return
        if (Math.abs(dx) < Math.abs(dy) * 0.6) {
          ptr.decided = 'none'
          return
        }
        e0.x = e.clientX
        decide(dx)
      }
      if (ptr.decided === 'pan') {
        const world = (dx / size.width) * W * 1.05
        store.pan = ptr.panDir > 0 ? Math.max(-W, Math.min(0, world)) : Math.min(W, Math.max(0, world))
        invalidate()
      } else if (ptr.decided === 'turn') {
        let goal
        if (ptr.useDx) {
          const span = size.width * (store.layout === 'single' ? 0.78 : 0.42)
          goal = ptr.dir > 0 ? -dx / span : 1 - dx / span
        } else {
          const p = pick(e)
          if (!p) return
          if (ptr.dir > 0) {
            const tip = lerp(-W, W, (p.x + W) / (ptr.grabX + W))
            goal = tFromTipX(tip)
          } else {
            const tip = lerp(-W, W, (p.x - ptr.grabX) / (W - ptr.grabX))
            goal = tFromTipX(tip)
          }
        }
        store.dragTo(Math.max(0, Math.min(1, goal)))
      }
    }

    const up = (e) => {
      const ptr = pointer.current
      if (!ptr.down) return
      ptr.down = false
      rig.current.dragging = false
      el.style.cursor = ''
      const dx = e.clientX - ptr.sx
      if (ptr.decided === 'turn') {
        const tr = store.turn
        if (tr) {
          const prog = ptr.dir > 0 ? tr.t : 1 - tr.t
          const vel = ptr.dir > 0 ? tr.v : -tr.v
          store.endDrag(prog > 0.42 || vel > 1.1)
        }
      } else if (ptr.decided === 'pan') {
        const commit = Math.abs(dx) > size.width * 0.14
        if (commit) store.side = ptr.panDir > 0 ? 'R' : 'L'
        store.panSettle = true
        store.touched = true
        store.emit()
        invalidate()
      } else if (ptr.decided === 'swipe') {
        if (Math.abs(dx) > 30) (dx < 0 ? store.next : store.prev)()
      } else if (!ptr.decided) {
        // toque sem arrasto
        const info = probe(e)
        const { f } = store
        if (info?.zone === 'cover' || info?.zone === 'backcover') {
          if (f === 0) store.next()
          else store.prev()
        } else if (info?.hit) {
          if (!store.turn || store.turn.peek) act(info.hit)
        } else if (info?.p && store.layout === 'spread' && info.edge) {
          if (info.right) store.next()
          else store.prev()
        } else if (store.layout === 'single' && info?.p) {
          const r = el.getBoundingClientRect()
          const u = (e.clientX - r.left) / r.width
          if (u > 0.72) store.next()
          else if (u < 0.28) store.prev()
        }
      }
    }

    const hover = (e) => {
      if (e.pointerType === 'touch') return
      const info = probe(e)
      let cursor = ''
      let peek = 0
      if (info?.zone) cursor = 'pointer'
      else if (info?.hit) cursor = 'pointer'
      else if (info?.p && Math.abs(info.p.x) <= W) {
        cursor = info.edge ? 'pointer' : 'grab'
        if (info.edge && store.layout === 'spread') peek = info.right ? 1 : -1
      }
      el.style.cursor = cursor
      if (peek && store.f > 0 && store.f < LAST_F) store.peek(peek)
      else store.peek(0)

      if (!store.reduced && store.layout === 'spread') {
        const r = el.getBoundingClientRect()
        rig.current.parGoalX = ((e.clientX - r.left) / r.width - 0.5) * 2
        rig.current.parGoalY = ((e.clientY - r.top) / r.height - 0.5) * 2
        invalidate()
      }
    }

    const leave = () => {
      if (!pointer.current.down) store.peek(0)
    }

    const key = (e) => {
      if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        e.preventDefault()
        store.next()
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault()
        store.prev()
      } else if (e.key === 'Home') {
        store.goto(1)
      } else if (e.key === 'End') {
        store.goto(LAST_F - 1)
      }
    }

    el.addEventListener('pointerdown', down)
    el.addEventListener('pointermove', move)
    el.addEventListener('pointerup', up)
    el.addEventListener('pointercancel', up)
    el.addEventListener('pointerleave', leave)
    window.addEventListener('keydown', key)
    return () => {
      el.removeEventListener('pointerdown', down)
      el.removeEventListener('pointermove', move)
      el.removeEventListener('pointerup', up)
      el.removeEventListener('pointercancel', up)
      el.removeEventListener('pointerleave', leave)
      window.removeEventListener('keydown', key)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gl, camera, size.width, store, cache, invalidate])

  if (debug) {
    window.__livro = { store, rig: rig.current, cache, projects: PROJECTS, gl }
  }

  useFrame((state, rawDt) => {
    const dt = Math.min(0.05, rawDt)
    const r = rig.current
    if (!r.poses) return
    r.frames++

    const moving = store.tick(dt)
    applyFaces()
    const tr = store.turn
    const f = store.f
    const low = tr ? tr.low : f
    const high = tr ? tr.high : f
    const t = tr ? tr.t : 0

    // Altura dos blocos, de forma contínua durante a virada.
    const nL = lerp(paperLeft(low), paperLeft(high), t)
    const nR = lerp(paperRight(low), paperRight(high), t)
    const leftTop = COVER_T + nL * SHEET_H
    const rightTop = COVER_T + nR * SHEET_H

    const coverTurn = tr && low === 0
    const backTurn = tr && high === LAST_F

    // Livro fechado fica centrado na mesa.
    let bookX = 0
    if (tr) {
      if (low === 0) bookX = lerp(-W / 2, 0, smooth(t))
      else if (high === LAST_F) bookX = lerp(0, W / 2, smooth(t))
    } else if (f === 0) bookX = -W / 2
    else if (f === LAST_F) bookX = W / 2
    r.bookX = bookX

    const b = book
    b.group.position.x = bookX

    // Folha de papel em movimento
    const paperTurn = tr && !coverTurn && !backTurn
    b.turnMesh.visible = !!paperTurn
    if (paperTurn && (t !== r.lastT || tr.skew !== r.lastSkew)) {
      const a = performance.now()
      deformSheet(b.turning.data, t, tr.skew)
      b.turning.geo.attributes.position.needsUpdate = true
      b.turning.geo.attributes.normal.needsUpdate = true
      if (debug) r.deformCost.push(performance.now() - a)
      r.lastT = t
      r.lastSkew = tr.skew
    }
    if (paperTurn) {
      b.turnMesh.position.y = rootHeight(t, rightTop, leftTop) + 0.0016 + 0.012 * Math.sin(Math.PI * t)
      // Brilho só com a folha curvada, pra não dar salto de cor quando ela pousa.
      b.turnMat.uniforms.uGloss.value = 0.018 * Math.sin(Math.PI * t)
    }

    // Páginas e blocos parados
    // Com o livro fechado, o morrinho da dobra furaria a capa: a página de cima some.
    const showL = paperLeft(low) > 0 && !(f === LAST_F && !tr) && !(backTurn && t > 0.97)
    const showR = paperRight(high) > 0 && !(f === 0 && !tr) && !(coverTurn && t < 0.03)
    b.pageL.visible = showL
    b.pageR.visible = showR
    b.pageL.position.y = leftTop
    b.pageR.position.y = rightTop
    const hL = Math.max(0.0001, nL * SHEET_H)
    const hR = Math.max(0.0001, nR * SHEET_H)
    // Bloco sem página por cima mostraria o topo branco, então só aparece quando tem página.
    b.blockL.visible = nL > 0.01 && paperLeft(low) > 0
    b.blockR.visible = nR > 0.01 && paperRight(high) > 0
    b.blockL.scale.y = hL
    b.blockR.scale.y = hR
    b.blockL.position.y = COVER_T + hL / 2 - 0.0006
    b.blockR.position.y = COVER_T + hR / 2 - 0.0006

    // Capa da frente
    const tFront = coverTurn ? t : f >= 1 ? 1 : 0
    b.coverFront.pivot.rotation.z = Math.PI * tFront
    // A dobradiça só desce depois que a placa passou da vertical, pra não cortar o bloco.
    b.coverFront.pivot.position.y = lerp(rightTop + COVER_T / 2 + 0.0012, COVER_T / 2, smooth(Math.max(0, tFront - 0.5) * 2))

    // Contracapa
    const tBack = backTurn ? t : f >= LAST_F ? 1 : 0
    b.coverBack.pivot.rotation.z = Math.PI * tBack
    b.coverBack.pivot.position.y = lerp(COVER_T / 2, leftTop + COVER_T / 2 + 0.0012, smooth(Math.min(1, tBack * 2)))

    // Lombada: alta com o livro fechado, some embaixo das páginas com ele aberto.
    const openAmt = coverTurn ? t : backTurn ? 1 - t : f > 0 && f < LAST_F ? 1 : 0
    const closedH = COVER_T * 2 + PAPER_SHEETS * SHEET_H - 0.008
    const spineH = lerp(closedH, Math.max(0.005, Math.min(leftTop, rightTop) - 0.004), smooth(openAmt))
    b.spine.scale.y = spineH
    b.spine.position.y = spineH / 2
    // Sempre do lado de fora da dobra: à esquerda com a capa em cima, à direita com a contracapa.
    b.spine.position.x = lerp(-0.016, 0.016, tBack)

    // Sombra da folha em movimento nas páginas de baixo
    const tip = paperTurn || coverTurn || backTurn ? tipX(t) : 0
    const strength = paperTurn ? 0.62 * Math.sin(Math.PI * t) : coverTurn || backTurn ? 0.7 * Math.sin(Math.PI * t) : 0
    const xA = bookX + Math.min(0, tip)
    const xB = bookX + Math.max(0, tip)
    const soft = 0.1 + 0.3 * Math.sin(Math.PI * t)
    for (const m of [b.matL, b.matR, b.coverBack.matTop, b.coverFront.matBottom]) {
      m.uniforms.uTurn.value.set(xA, xB, strength, soft)
    }

    // Sombra do livro na mesa
    const rigidTip = coverTurn || backTurn ? Math.cos(Math.PI * t) * W : 0
    let xMin
    let xMax
    if (coverTurn) {
      xMin = bookX + Math.min(0, rigidTip)
      xMax = bookX + W + MARGIN
    } else if (backTurn) {
      xMin = bookX - W - MARGIN
      xMax = bookX + Math.max(0, rigidTip)
    } else if (f === 0) {
      xMin = bookX
      xMax = bookX + W + MARGIN
    } else if (f === LAST_F) {
      xMin = bookX - W - MARGIN
      xMax = bookX
    } else {
      xMin = bookX - W - MARGIN
      xMax = bookX + W + MARGIN
    }
    const tm = desk.tableMat.uniforms
    tm.uBook.value.set(xMin, xMax, -H / 2 - MARGIN, H / 2 + MARGIN)
    tm.uBookH.value = Math.max(leftTop, rightTop) + (coverTurn || backTurn ? 0.25 * Math.sin(Math.PI * t) : 0)

    // Câmera
    const openGoal = openAmt
    const xFor = (ff, side) => {
      if (store.layout !== 'single' || ff <= 0 || ff >= LAST_F) return 0
      return side === 'L' ? -W / 2 : W / 2
    }
    let lookGoal
    if (tr) lookGoal = lerp(xFor(low, 'R'), xFor(high, 'L'), t)
    else lookGoal = xFor(f, store.side)

    if (store.panSettle) {
      store.pan = damp(store.pan, 0, 16, dt)
      if (Math.abs(store.pan) < 0.0015) {
        store.pan = 0
        store.panSettle = false
      }
    }
    const lookWithPan = lookGoal - store.pan

    const snap = store.reduced || r.first
    r.first = false
    const dragging = tr?.dragging
    r.open = snap ? openGoal : tr ? openGoal : damp(r.open, openGoal, 7, dt)
    r.lookX = snap || dragging ? lookWithPan : damp(r.lookX, lookWithPan, tr ? 14 : 9, dt)

    r.parX = store.reduced ? 0 : damp(r.parX, r.dragging ? r.parX : r.parGoalX, 3.2, dt)
    r.parY = store.reduced ? 0 : damp(r.parY, r.dragging ? r.parY : r.parGoalY, 3.2, dt)

    const o = smooth(r.open)
    const { open: po, closed: pc } = r.poses
    const tilt = lerp(pc.tilt, po.tilt, o) + r.parY * 0.012
    // A câmera recua um pouco com a folha em pé, pra ela não sair do quadro.
    const d = lerp(pc.d, po.d, o) * (1 + (tr && !tr.peek ? 0.06 * Math.sin(Math.PI * t) : 0))
    const shift = lerp(pc.shift, po.shift, o)
    placeCamera(camera, r.lookX + r.parX * 0.035, tilt, d)
    camera.lookAt(r.lookX, 0, 0)
    camera.setViewOffset(size.width, size.height, 0, shift, size.width, size.height)
    camera.updateProjectionMatrix()
    camera.updateMatrixWorld()

    const settling =
      !store.reduced &&
      (Math.abs(r.lookX - lookWithPan) > 0.0005 ||
        Math.abs(r.open - openGoal) > 0.0005 ||
        Math.abs(r.parX - r.parGoalX) > 0.002 ||
        Math.abs(r.parY - r.parGoalY) > 0.002)
    if (!document.hidden && (moving || settling || store.panSettle)) state.invalidate()
  })

  return (
    <>
      <primitive object={desk.group} />
      <primitive object={book.group} />
    </>
  )
}
