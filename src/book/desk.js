// Mesa, caneca e caneta. Tudo simples, com a mesma conta de luz do livro.
import * as THREE from 'three'
import { litFragment, litVertex, tableFragment, tableVertex } from './shaders.js'

export const MUG = { x: 1.37, z: -0.4, r: 0.235 }
export const PEN = { ax: -1.42, az: 0.56, bx: -1.2, bz: 1.08 }

function woodTexture() {
  const W = 1024
  const H = 512
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const g = c.getContext('2d')
  g.fillStyle = '#231b15'
  g.fillRect(0, 0, W, H)

  // veios longos, ondulados, no sentido da largura
  const seedA = Math.random() * 10
  for (let i = 0; i < 620; i++) {
    const y0 = Math.random() * H
    const amp = 0.8 + Math.random() * 3.2
    const cycles = 1 + Math.floor(Math.random() * 3)
    const dark = Math.random() < 0.68
    const alpha = 0.025 + Math.random() * 0.08
    g.strokeStyle = dark ? `rgba(8,5,3,${alpha * 1.5})` : `rgba(136,108,80,${alpha * 0.7})`
    g.lineWidth = 0.5 + Math.random() * 2.2
    g.beginPath()
    for (let x = -8; x <= W + 8; x += 16) {
      // periódico em x, pra emenda da textura não aparecer
      const y = y0 + amp * Math.sin((x / W) * Math.PI * 2 * cycles + seedA + i)
      if (x < 0) g.moveTo(x, y)
      else g.lineTo(x, y)
    }
    g.stroke()
  }
  const t = new THREE.CanvasTexture(c)
  t.wrapS = THREE.RepeatWrapping
  t.wrapT = THREE.RepeatWrapping
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 4
  return t
}

function lit(color, gloss = 0.2, stripes = 0) {
  return new THREE.ShaderMaterial({
    vertexShader: litVertex,
    fragmentShader: litFragment,
    uniforms: {
      uColor: { value: new THREE.Color(color) },
      uGloss: { value: gloss },
      uStripes: { value: stripes },
    },
  })
}

export { lit }

export function createDesk() {
  const group = new THREE.Group()

  const wood = woodTexture()
  const tableMat = new THREE.ShaderMaterial({
    vertexShader: tableVertex,
    fragmentShader: tableFragment,
    uniforms: {
      uWood: { value: wood },
      uBook: { value: new THREE.Vector4(-0.5, 0.5, -0.65, 0.65) },
      uBookH: { value: 0.16 },
      uMug: { value: new THREE.Vector3(MUG.x, MUG.z, MUG.r) },
      uPen: { value: new THREE.Vector4(PEN.ax, PEN.az, PEN.bx, PEN.bz) },
    },
  })
  const table = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), tableMat)
  table.rotation.x = -Math.PI / 2
  group.add(table)

  // Caneca no pires
  const ceramic = lit('#E6E1D6', 0.34)
  const prof = (pts) => pts.map(([x, y]) => new THREE.Vector2(x, y))
  const saucer = new THREE.Mesh(
    new THREE.LatheGeometry(
      prof([
        [0, 0.004],
        [0.09, 0.006],
        [0.17, 0.018],
        [0.235, 0.038],
        [0.228, 0.042],
        [0.16, 0.026],
        [0, 0.016],
      ]),
      40,
    ),
    ceramic,
  )
  saucer.position.set(MUG.x, 0, MUG.z)
  group.add(saucer)

  const cup = new THREE.Mesh(
    new THREE.LatheGeometry(
      prof([
        [0, 0.02],
        [0.075, 0.022],
        [0.112, 0.06],
        [0.13, 0.14],
        [0.136, 0.205],
        [0.126, 0.207],
        [0.118, 0.14],
        [0.1, 0.07],
        [0, 0.05],
      ]),
      40,
    ),
    ceramic,
  )
  cup.position.set(MUG.x, 0, MUG.z)
  group.add(cup)

  const coffee = new THREE.Mesh(new THREE.CircleGeometry(0.122, 40), lit('#2B170B', 0.7))
  coffee.rotation.x = -Math.PI / 2
  coffee.position.set(MUG.x, 0.178, MUG.z)
  group.add(coffee)

  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.012, 10, 24), ceramic)
  handle.position.set(MUG.x + 0.14, 0.125, MUG.z + 0.045)
  handle.rotation.y = -0.3
  group.add(handle)

  // Caneta
  const pen = new THREE.Group()
  const dx = PEN.bx - PEN.ax
  const dz = PEN.bz - PEN.az
  const len = Math.hypot(dx, dz)
  const bodyLen = len * 0.86
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.0125, 0.0125, bodyLen, 14), lit('#17171A', 0.55))
  barrel.position.y = bodyLen / 2 + len * 0.14
  pen.add(barrel)
  const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.0125, 0.002, len * 0.14, 14), lit('#B9B4A8', 0.8))
  tip.position.y = len * 0.07
  pen.add(tip)
  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.0132, 0.0132, 0.03, 14), lit('#4F8CFF', 0.6))
  band.position.y = len * 0.68
  pen.add(band)
  // deita a caneta, com a ponta no ponto a
  pen.position.set(PEN.ax, 0.0135, PEN.az)
  pen.rotation.order = 'YXZ'
  pen.rotation.y = Math.atan2(dx, dz)
  pen.rotation.x = Math.PI / 2
  group.add(pen)

  return { group, tableMat }
}
