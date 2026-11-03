// Enquadramento: acha a distância em que um retângulo da mesa cabe na área livre
// da tela (descontando a barra de cima e a de baixo), pra qualquer tamanho de janela.
import * as THREE from 'three'

const v = new THREE.Vector3()

export function placeCamera(camera, lookX, tilt, distance) {
  camera.position.set(lookX, Math.cos(tilt) * distance, Math.sin(tilt) * distance)
  camera.up.set(0, 1, 0)
  camera.lookAt(lookX, 0, 0)
  camera.updateMatrixWorld()
}

function measure(camera, rect, tilt, d) {
  placeCamera(camera, 0, tilt, d)
  let x = 0
  let yMin = 9
  let yMax = -9
  for (const px of [rect.x0, rect.x1]) {
    for (const pz of [rect.z0, rect.z1]) {
      for (const py of [0, rect.y || 0]) {
        v.set(px, py, pz).project(camera)
        x = Math.max(x, Math.abs(v.x))
        yMin = Math.min(yMin, v.y)
        yMax = Math.max(yMax, v.y)
      }
    }
  }
  return { x, yMin, yMax }
}

/**
 * Devolve distância e deslocamento vertical (em px) que encaixam rect na área livre.
 * rect: x0, x1, z0, z1 em coordenadas do mundo, relativo ao centro do olhar.
 */
export function fit(camera, rect, tilt, view) {
  const { w, h, top, bottom, side } = view
  const limX = 1 - (2 * side) / w
  const limY = (h - top - bottom) / h
  camera.aspect = w / h
  camera.clearViewOffset()
  camera.updateProjectionMatrix()

  let lo = 1
  let hi = 60
  for (let i = 0; i < 26; i++) {
    const d = (lo + hi) / 2
    const m = measure(camera, rect, tilt, d)
    if (m.x <= limX && (m.yMax - m.yMin) / 2 <= limY) hi = d
    else lo = d
  }
  const m = measure(camera, rect, tilt, hi)
  // Centro do retângulo projetado vai pro centro da área livre.
  const center = (m.yMax + m.yMin) / 2
  const shift = (center * h) / 2 + (top - bottom) / 2
  return { d: hi, shift }
}

// Largura em px de tela de uma página no centro do enquadramento.
export function pagePixels(camera, pose, tilt, view, pageW) {
  camera.aspect = view.w / view.h
  camera.clearViewOffset()
  camera.updateProjectionMatrix()
  placeCamera(camera, 0, tilt, pose.d)
  v.set(-pageW / 2, 0, 0).project(camera)
  const a = v.x
  v.set(pageW / 2, 0, 0).project(camera)
  return ((v.x - a) * view.w) / 2
}
