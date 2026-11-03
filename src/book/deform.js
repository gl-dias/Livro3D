// Deformação da folha. Cada linha da malha é tratada como uma curva de
// comprimento fixo: o ângulo da tangente varia ao longo da folha e a posição sai
// da integral desse ângulo. Por isso o papel curva sem esticar, e as normais
// saem de graça, sem recalcular a malha.

export const PAGE_W = 1
export const PAGE_H = 1.25

// Malha escolhida depois de medir várias no protótipo (proto/).
export const GRID = { cols: 36, rows: 12 }

const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x)
const smooth = (x) => x * x * (3 - 2 * x)

// Morrinho que o papel faz ao sair da lombada. Vai a zero na borda da folha,
// pra encostar direitinho no bloco de páginas.
const HUMP = 0.026
export function hump(s) {
  return HUMP * Math.sin(Math.PI * Math.pow(s, 0.42))
}

export function createSheetGeometryData({ cols, rows } = GRID) {
  const nx = cols + 1
  const nz = rows + 1
  const count = nx * nz
  const position = new Float32Array(count * 3)
  const normal = new Float32Array(count * 3)
  const uv = new Float32Array(count * 2)
  const index = new (count > 65535 ? Uint32Array : Uint16Array)(cols * rows * 6)

  let k = 0
  for (let j = 0; j < nz; j++) {
    for (let i = 0; i < nx; i++) {
      uv[k * 2] = i / cols
      uv[k * 2 + 1] = 1 - j / rows
      k++
    }
  }
  let w = 0
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const a = j * nx + i
      const b = a + 1
      const c = a + nx
      const d = c + 1
      // sentido que deixa a normal da frente pra cima quando a folha está deitada
      index[w++] = a
      index[w++] = c
      index[w++] = b
      index[w++] = b
      index[w++] = c
      index[w++] = d
    }
  }
  // O que só depende da coluna fica pronto de antemão.
  const bendCol = new Float32Array(nx)
  const humpCol = new Float32Array(nx)
  for (let i = 0; i < nx; i++) {
    const s = i / cols
    bendCol[i] = s * s * (3 - 2 * s)
    humpCol[i] = hump(s)
  }
  return { position, normal, uv, index, cols, rows, nx, nz, bendCol, humpCol }
}

/**
 * Escreve em position/normal a folha no instante t.
 * t = 0: deitada à direita da lombada. t = 1: deitada à esquerda.
 * skew: de -1 a 1, qual canto puxa a virada (-1 em cima, 1 embaixo).
 * Só usa memória já alocada, não cria lixo por quadro.
 */
export function deformSheet(data, t, skew = 0, curl = 1) {
  const { position, normal, cols, rows, nx, nz, bendCol, humpCol } = data
  const ds = PAGE_W / cols
  const dz = PAGE_H / rows

  const tt = clamp01(t)
  const root = Math.PI * Math.pow(tt, 1.4)
  const tip = Math.PI * Math.pow(tt, 0.72)
  const lift = Math.sin(Math.PI * tt)
  // Só perde o morrinho depois de subir o bastante, senão a página de baixo fura a folha.
  const rest = 1 - smooth(clamp01((lift - 0.35) / 0.5))
  const bend = (tip - root) * curl
  const twist = 0.28 * skew * lift

  let p = 0
  for (let j = 0; j < nz; j++) {
    const v = j / rows - 0.5
    // o canto puxado adianta, o outro atrasa
    const lead = twist * v * 2
    const z = -PAGE_H / 2 + j * dz
    let x = 0
    let y = 0
    let phiPrev = root
    for (let i = 0; i < nx; i++) {
      const s = i / cols
      // Entre 0 e pi a folha nunca desce ao longo do comprimento: não mergulha no bloco.
      let phi = root + bend * bendCol[i] + lead * s
      if (phi < 0) phi = 0
      else if (phi > Math.PI) phi = Math.PI
      if (i > 0) {
        // regra do ponto médio: mantém o comprimento mesmo com poucas colunas
        const mid = (phi + phiPrev) * 0.5
        x += Math.cos(mid) * ds
        y += Math.sin(mid) * ds
      }
      phiPrev = phi
      // o morrinho só existe com a folha deitada
      const yy = y + humpCol[i] * rest
      position[p] = x
      position[p + 1] = yy
      position[p + 2] = z
      normal[p] = -Math.sin(phi)
      normal[p + 1] = Math.cos(phi)
      normal[p + 2] = 0
      p += 3
    }
  }
}

// Altura da lombada da folha em movimento. Os dois blocos têm alturas diferentes,
// e uma interpolação direta deixaria a raiz abaixo do bloco mais alto no meio da
// virada, com a página de baixo furando a folha colada na lombada. Por isso ela sobe
// logo no começo até o bloco mais alto, fica lá e só desce pro destino no fim.
export function rootHeight(t, rightTop, leftTop) {
  const top = Math.max(rightTop, leftTop)
  const up = smooth(clamp01(t / 0.15))
  const down = smooth(clamp01((t - 0.85) / 0.15))
  return rightTop + (top - rightTop) * up + (leftTop - top) * down
}

// Tabela t -> x da ponta, pra virada acompanhar o dedo: o ponteiro diz onde a
// borda da folha tem que estar e a tabela devolve o t correspondente.
const TIP_SAMPLES = 96
const tipTable = (() => {
  const out = new Float32Array(TIP_SAMPLES + 1)
  const ds = PAGE_W / 64
  for (let n = 0; n <= TIP_SAMPLES; n++) {
    const tt = n / TIP_SAMPLES
    const root = Math.PI * Math.pow(tt, 1.4)
    const tip = Math.PI * Math.pow(tt, 0.72)
    let x = 0
    let prev = root
    for (let i = 1; i <= 64; i++) {
      const s = i / 64
      const phi = root + (tip - root) * s * s * (3 - 2 * s)
      x += Math.cos((phi + prev) * 0.5) * ds
      prev = phi
    }
    out[n] = x
  }
  return out
})()

export function tipX(t) {
  const f = clamp01(t) * TIP_SAMPLES
  const a = Math.floor(f)
  const b = Math.min(TIP_SAMPLES, a + 1)
  return tipTable[a] + (tipTable[b] - tipTable[a]) * (f - a)
}

export function tFromTipX(x) {
  if (x >= tipTable[0]) return 0
  if (x <= tipTable[TIP_SAMPLES]) return 1
  let lo = 0
  let hi = TIP_SAMPLES
  while (hi - lo > 1) {
    const m = (lo + hi) >> 1
    if (tipTable[m] > x) lo = m
    else hi = m
  }
  return (lo + (tipTable[lo] - x) / (tipTable[lo] - tipTable[hi])) / TIP_SAMPLES
}
