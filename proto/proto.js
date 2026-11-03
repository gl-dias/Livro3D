// Passo 1 da nota: só a virada de página, sem conteúdo nenhum. Serve pra medir o
// custo da deformação por quadro em várias malhas antes de produzir o livro.
// Abrir com npm run dev em /proto/index.html. Não entra no build.
import * as THREE from 'three'
import { createSheetGeometryData, deformSheet, tFromTipX, PAGE_H } from '../src/book/deform.js'

const params = new URLSearchParams(location.search)
const cols = Number(params.get('cols') || 36)
const rows = Number(params.get('rows') || 12)

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
renderer.setSize(innerWidth, innerHeight)
document.body.appendChild(renderer.domElement)

const scene = new THREE.Scene()
scene.background = new THREE.Color('#0a0a0b')
const camera = new THREE.PerspectiveCamera(32, innerWidth / innerHeight, 0.1, 50)
camera.position.set(0, 3.6, 2.2)
camera.lookAt(0, 0, 0)

const data = createSheetGeometryData({ cols, rows })
const geo = new THREE.BufferGeometry()
geo.setAttribute('position', new THREE.BufferAttribute(data.position, 3).setUsage(THREE.DynamicDrawUsage))
geo.setAttribute('normal', new THREE.BufferAttribute(data.normal, 3).setUsage(THREE.DynamicDrawUsage))
geo.setAttribute('uv', new THREE.BufferAttribute(data.uv, 2))
geo.setIndex(new THREE.BufferAttribute(data.index, 1))

const mat = new THREE.MeshStandardMaterial({ color: '#ede9df', side: THREE.DoubleSide, roughness: 0.9 })
const sheet = new THREE.Mesh(geo, mat)
sheet.frustumCulled = false
scene.add(sheet)

// Base parada, pra enxergar a folha contra alguma coisa.
const base = new THREE.Mesh(
  new THREE.PlaneGeometry(2, PAGE_H),
  new THREE.MeshStandardMaterial({ color: '#2a2822', roughness: 1 }),
)
base.rotation.x = -Math.PI / 2
base.position.y = -0.004
scene.add(base)
scene.add(new THREE.AmbientLight('#ffffff', 0.5))
const key = new THREE.DirectionalLight('#fff3df', 2.2)
key.position.set(0.6, 3, 1)
scene.add(key)

const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
const ray = new THREE.Raycaster()
const hit = new THREE.Vector3()
const ndc = new THREE.Vector2()

let t = 0
let target = 0
let skew = 0
let drag = false

function pick(e) {
  ndc.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1)
  ray.setFromCamera(ndc, camera)
  return ray.ray.intersectPlane(plane, hit)
}

renderer.domElement.addEventListener('pointerdown', (e) => {
  renderer.domElement.setPointerCapture(e.pointerId)
  if (pick(e)) {
    drag = true
    skew = Math.max(-1, Math.min(1, hit.z / (PAGE_H / 2)))
    target = tFromTipX(hit.x)
  }
})
renderer.domElement.addEventListener('pointermove', (e) => {
  if (drag && pick(e)) target = tFromTipX(hit.x)
})
renderer.domElement.addEventListener('pointerup', () => {
  drag = false
  target = target > 0.5 ? 1 : 0
})

// Medidas: guardadas pra o script de teste ler.
const m = { deform: [], frame: [], inputLag: [], cols, rows, verts: (cols + 1) * (rows + 1) }
window.__proto = {
  metrics: m,
  reset() {
    m.deform.length = 0
    m.frame.length = 0
  },
  get t() {
    return t
  },
  get target() {
    return target
  },
}

const hud = document.getElementById('hud')
let last = performance.now()
function loop(now) {
  requestAnimationFrame(loop)
  const dt = Math.min(0.05, (now - last) / 1000)
  last = now

  const k = drag ? 1 - Math.exp(-dt * 24) : 1 - Math.exp(-dt * 7)
  t += (target - t) * k

  const a = performance.now()
  deformSheet(data, t, skew)
  geo.attributes.position.needsUpdate = true
  geo.attributes.normal.needsUpdate = true
  const b = performance.now()
  renderer.render(scene, camera)
  const c = performance.now()

  m.deform.push(b - a)
  m.frame.push(c - a)
  if (m.deform.length % 30 === 0) {
    const avg = m.deform.slice(-30).reduce((x, y) => x + y, 0) / 30
    hud.textContent = `malha ${cols}x${rows} (${m.verts} vértices)\nt ${t.toFixed(3)}\ndeformação ${avg.toFixed(3)} ms`
  }
}
requestAnimationFrame(loop)
