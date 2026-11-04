// Desenha cada face do livro num canvas. Tudo em unidades de 1024 x 1280, e o
// canvas recebe a escala certa pro aparelho. Os menores textos têm 38 unidades de
// propósito: é o que garante uns 13 px de tela numa página de 370 px de largura.
import { COPY, PROJECTS, SITE_HOME, WHATSAPP, describeFace, folioOf, printUrl, projectF } from '../data/projects.js'

export const DW = 1024
export const DH = 1280

const INK = '#0A0A0B'
const PAPER = '#EDE9DF'
const BLUE = '#4F8CFF' // acento sobre preto e marinho
const BLUE_ON_PAPER = '#1F4FBF' // o azul vivo não dá contraste no papel
const NAVY = '#14284B'
const DIM_ON_NAVY = '#C8CEDA'
const DIM_ON_PAPER = '#45433E'
const DIM_ON_INK = '#A9A79F'
const LINE_ON_PAPER = 'rgba(10,10,11,0.2)'

const DISPLAY = 'Anton, Impact, "Arial Narrow", sans-serif'
const SANS = 'Geist, system-ui, sans-serif'
const MONO = '"Geist Mono", ui-monospace, monospace'

const LED = { live: '#3F9A45', wip: '#C97F1C', paused: '#D97757', planned: null }
// Os LEDs têm significado e mantêm as cores do placar do site.
const LED_ON_INK = { live: '#7BC97F', wip: '#E8A040', paused: '#D97757', planned: null }

let grain = null
function grainPattern(ctx) {
  if (!grain) {
    const c = document.createElement('canvas')
    c.width = c.height = 192
    const g = c.getContext('2d')
    const d = g.createImageData(192, 192)
    for (let i = 0; i < d.data.length; i += 4) {
      const v = Math.random() * 255
      d.data[i] = d.data[i + 1] = d.data[i + 2] = v
      d.data[i + 3] = 255
    }
    g.putImageData(d, 0, 0)
    grain = c
  }
  return ctx.createPattern(grain, 'repeat')
}

function fill(ctx, color, grainAlpha = 0.035) {
  ctx.fillStyle = color
  ctx.fillRect(0, 0, DW, DH)
  ctx.save()
  ctx.globalAlpha = grainAlpha
  ctx.globalCompositeOperation = 'overlay'
  ctx.fillStyle = grainPattern(ctx)
  ctx.fillRect(0, 0, DW, DH)
  ctx.restore()
}

function font(ctx, family, size, weight = 400) {
  ctx.font = `${weight} ${size}px ${family}`
}

function tracking(ctx, px) {
  if ('letterSpacing' in ctx) ctx.letterSpacing = `${px}px`
}

function wrap(ctx, text, maxWidth) {
  const words = text.split(' ')
  const lines = []
  let line = ''
  for (const w of words) {
    const next = line ? `${line} ${w}` : w
    if (ctx.measureText(next).width > maxWidth && line) {
      lines.push(line)
      line = w
    } else {
      line = next
    }
  }
  if (line) lines.push(line)
  return lines
}

// Quebra o nome em até 2 linhas, escolhendo o que deixa a letra maior.
function fitDisplay(ctx, text, maxW, maxH, maxSize) {
  const upper = text.toUpperCase()
  const words = upper.split(' ')
  const options = [[upper]]
  for (let k = 1; k < words.length; k++) {
    options.push([words.slice(0, k).join(' '), words.slice(k).join(' ')])
  }
  font(ctx, DISPLAY, 100)
  let best = null
  for (const lines of options) {
    const widest = Math.max(...lines.map((l) => ctx.measureText(l).width))
    const lh = 1.12
    const size = Math.min(maxSize, (100 * maxW) / widest, maxH / (lines.length * lh))
    if (!best || size > best.size) best = { lines, size, lh }
  }
  return best
}

function drawDisplay(ctx, lines, size, x, bottomY, color, lh = 1.12) {
  font(ctx, DISPLAY, size)
  ctx.fillStyle = color
  ctx.textBaseline = 'alphabetic'
  ctx.textAlign = 'left'
  let y = bottomY - (lines.length - 1) * size * lh
  for (const l of lines) {
    ctx.fillText(l, x, y)
    y += size * lh
  }
}

function led(ctx, x, y, kind, onInk, r = 12) {
  const color = (onInk ? LED_ON_INK : LED)[kind]
  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
  if (color) {
    ctx.fillStyle = color
    ctx.fill()
  } else {
    ctx.lineWidth = 3.5
    ctx.strokeStyle = onInk ? DIM_ON_INK : DIM_ON_PAPER
    ctx.stroke()
  }
}

function arrow(ctx, x, y, s, color, width = 4) {
  ctx.strokeStyle = color
  ctx.lineWidth = width
  ctx.lineCap = 'square'
  ctx.beginPath()
  ctx.moveTo(x, y + s)
  ctx.lineTo(x + s, y)
  ctx.moveTo(x + s * 0.28, y)
  ctx.lineTo(x + s, y)
  ctx.lineTo(x + s, y + s * 0.72)
  ctx.stroke()
}

function button(ctx, hits, { x, y, w, h, label, href, solid = true, onInk = false, external = true }) {
  const bg = solid ? (onInk ? BLUE : INK) : 'transparent'
  const fg = solid ? (onInk ? INK : PAPER) : onInk ? PAPER : INK
  ctx.beginPath()
  ctx.rect(x, y, w, h)
  if (solid) {
    ctx.fillStyle = bg
    ctx.fill()
  } else {
    ctx.lineWidth = 3
    ctx.strokeStyle = fg
    ctx.stroke()
  }
  font(ctx, MONO, 38, 500)
  ctx.fillStyle = fg
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  const tw = ctx.measureText(label).width
  const total = tw + (external ? 40 : 0)
  const tx = x + (w - total) / 2
  ctx.fillText(label, tx, y + h / 2 + 2)
  if (external) arrow(ctx, tx + tw + 16, y + h / 2 - 11, 22, fg)
  hits.push({ x, y, w, h, href, label })
}

function folio(ctx, n, side, onInk) {
  font(ctx, MONO, 32)
  ctx.fillStyle = onInk ? DIM_ON_INK : DIM_ON_PAPER
  ctx.textBaseline = 'alphabetic'
  ctx.textAlign = side === 'left' ? 'left' : 'right'
  ctx.fillText(String(n), side === 'left' ? 64 : DW - 64, DH - 52)
  ctx.textAlign = 'left'
}

function paintCover(ctx) {
  fill(ctx, NAVY, 0.09)
  // faixa azul perto da lombada
  ctx.fillStyle = BLUE
  ctx.fillRect(52, 0, 10, DH)

  const x = 118
  const w = DW - x - 64
  font(ctx, DISPLAY, 100)
  const a = (100 * w) / ctx.measureText('GUILHERME').width
  const b = (100 * w) / ctx.measureText('DIAS').width
  const bSize = Math.min(b, 520)
  const yB = DH - 300
  drawDisplay(ctx, ['DIAS'], bSize, x, yB, PAPER)
  drawDisplay(ctx, ['GUILHERME'], a, x, yB - bSize * 1.06, PAPER)

  ctx.beginPath()
  ctx.arc(x + 15, 118, 15, 0, Math.PI * 2)
  ctx.fillStyle = BLUE
  ctx.fill()
  font(ctx, MONO, 36)
  ctx.fillStyle = DIM_ON_NAVY
  ctx.textBaseline = 'middle'
  ctx.fillText('rio de janeiro', x + 54, 120)

  font(ctx, MONO, 40, 500)
  ctx.fillStyle = PAPER
  ctx.textBaseline = 'alphabetic'
  ctx.fillText('portfólio', x, DH - 160)
  ctx.fillStyle = DIM_ON_NAVY
  ctx.fillText('7 projetos', x, DH - 104)
}

function paintBack(ctx) {
  fill(ctx, NAVY, 0.09)
  ctx.fillStyle = BLUE
  ctx.fillRect(DW - 62, 0, 10, DH)
  ctx.beginPath()
  ctx.arc(DW / 2 - 118, DH / 2, 13, 0, Math.PI * 2)
  ctx.fillStyle = BLUE
  ctx.fill()
  font(ctx, MONO, 38, 500)
  ctx.fillStyle = PAPER
  ctx.textBaseline = 'middle'
  ctx.fillText('gl-dias.dev', DW / 2 - 88, DH / 2 + 2)
}

function paintOpening(ctx, hits) {
  // Guarda do livro: mesmo marinho da capa.
  fill(ctx, NAVY, 0.07)
  const x = 72
  const w = DW - x * 2
  font(ctx, DISPLAY, 100)
  const titles = COPY.openingTitle.map((l) => l.toUpperCase())
  const widest = Math.max(...titles.map((l) => ctx.measureText(l).width))
  const size = Math.min(236, (100 * w) / widest)
  drawDisplay(ctx, titles, size, x, 110 + size * 1.12 * 2 - 0.12 * size, PAPER)

  let y = 110 + size * 2.24 + 70
  font(ctx, SANS, 52, 500)
  ctx.fillStyle = PAPER
  ctx.textBaseline = 'alphabetic'
  for (const l of wrap(ctx, COPY.openingLead, w)) {
    ctx.fillText(l, x, y)
    y += 68
  }
  y += 26
  font(ctx, MONO, 38)
  ctx.fillStyle = DIM_ON_NAVY
  for (const l of wrap(ctx, COPY.openingNote, w)) {
    ctx.fillText(l, x, y)
    y += 52
  }
  button(ctx, hits, {
    x,
    y: DH - 200,
    w,
    h: 118,
    label: 'voltar pro site',
    href: SITE_HOME,
    onInk: true,
    external: false,
  })
}

function paintToc(ctx, hits) {
  fill(ctx, PAPER)
  drawDisplay(ctx, ['SUMÁRIO'], 128, 64, 196, INK)
  const top = 248
  const rowH = 132
  PROJECTS.forEach((p, i) => {
    const y = top + i * rowH
    ctx.fillStyle = LINE_ON_PAPER
    ctx.fillRect(64, y, DW - 128, 2)

    font(ctx, MONO, 38, 500)
    ctx.fillStyle = BLUE_ON_PAPER
    ctx.textBaseline = 'alphabetic'
    ctx.textAlign = 'left'
    ctx.fillText(p.num, 64, y + 58)

    font(ctx, SANS, 44, 500)
    ctx.fillStyle = INK
    ctx.fillText(p.name, 148, y + 58)

    led(ctx, 158, y + 98, p.led, false, 10)
    font(ctx, MONO, 34)
    ctx.fillStyle = DIM_ON_PAPER
    ctx.fillText(p.status, 182, y + 110)

    font(ctx, MONO, 38)
    ctx.textAlign = 'right'
    ctx.fillStyle = DIM_ON_PAPER
    ctx.fillText(String(folioOf(i)[0]), DW - 64, y + 58)
    ctx.textAlign = 'left'

    // A linha para antes da borda externa, que continua servindo pra virar a página.
    hits.push({ x: 40, y, w: 730, h: rowH, goto: projectF(i), label: p.name })
  })
  ctx.fillStyle = LINE_ON_PAPER
  ctx.fillRect(64, top + 7 * rowH, DW - 128, 2)
  folio(ctx, 1, 'right', false)
}

function paintPlate(ctx, p, y, h) {
  if (p.plate === 'hipoteses') {
    // A home diz "testei 6 hipóteses, matei todas". Não tem tela pra mostrar,
    // então a página mostra exatamente isso.
    ctx.fillStyle = '#17171A'
    ctx.fillRect(0, y, DW, h)
    const rowH = h / 6
    for (let i = 0; i < 6; i++) {
      const ry = y + rowH * i
      const label = `HIPÓTESE ${i + 1}`
      font(ctx, DISPLAY, 66)
      ctx.fillStyle = '#6F6E68'
      ctx.textBaseline = 'middle'
      ctx.textAlign = 'left'
      ctx.fillText(label, 64, ry + rowH / 2 + 3)
      const tw = ctx.measureText(label).width
      ctx.fillStyle = '#D97757'
      ctx.fillRect(52, ry + rowH / 2 - 2, tw + 24, 7)
      if (i > 0) {
        ctx.fillStyle = 'rgba(237,233,223,0.1)'
        ctx.fillRect(0, ry, DW, 2)
      }
    }
    return
  }
  // Midas ainda não existe: moldura vazia, sem fingir que tem tela.
  ctx.save()
  ctx.strokeStyle = 'rgba(237,233,223,0.42)'
  ctx.lineWidth = 3
  ctx.setLineDash([16, 16])
  ctx.strokeRect(64, y + 20, DW - 128, h - 40)
  ctx.restore()
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  font(ctx, MONO, 40, 500)
  ctx.fillStyle = PAPER
  ctx.fillText('em planejamento', DW / 2, y + h / 2 - 30)
  font(ctx, MONO, 36)
  ctx.fillStyle = DIM_ON_INK
  ctx.fillText('ainda sem tela pra mostrar', DW / 2, y + h / 2 + 30)
  ctx.textAlign = 'left'
}

function paintProjectLeft(ctx, p, i, img) {
  fill(ctx, INK, 0.05)
  const printY = 128
  const printH = 640

  font(ctx, MONO, 38, 500)
  ctx.fillStyle = BLUE
  ctx.textBaseline = 'middle'
  ctx.textAlign = 'left'
  ctx.fillText(`${p.num} / 07`, 64, 68)
  font(ctx, MONO, 38)
  ctx.fillStyle = DIM_ON_INK
  ctx.textAlign = 'right'
  ctx.fillText(p.kind, DW - 64, 68)
  ctx.textAlign = 'left'

  if (p.print) {
    if (img) {
      ctx.drawImage(img, 0, printY, DW, printH)
    } else {
      ctx.fillStyle = '#17171A'
      ctx.fillRect(0, printY, DW, printH)
    }
  } else {
    paintPlate(ctx, p, printY, printH)
  }

  const fit = fitDisplay(ctx, p.name, DW - 128, 310, 240)
  drawDisplay(ctx, fit.lines, fit.size, 64, DH - 118, PAPER, fit.lh)
  folio(ctx, folioOf(i)[0], 'left', true)
}

function paintProjectRight(ctx, p, i, hits) {
  fill(ctx, PAPER)
  const x = 64
  const w = DW - 128

  led(ctx, x + 12, 68, p.led, false, 13)
  font(ctx, MONO, 38, 500)
  ctx.fillStyle = INK
  ctx.textBaseline = 'middle'
  ctx.fillText(p.status, x + 42, 70)

  const fit = fitDisplay(ctx, p.name, w, 90, 90)
  drawDisplay(ctx, [fit.lines.join(' ')], Math.min(fit.size, 78), x, 196, INK)

  ctx.fillStyle = INK
  ctx.fillRect(x, 226, w, 5)

  let y = 306
  const longTag = p.tagline.length > 90
  const tagSize = longTag ? 56 : 62
  const tagLh = tagSize * 1.24
  font(ctx, SANS, tagSize, 500)
  ctx.fillStyle = INK
  ctx.textBaseline = 'alphabetic'
  for (const l of wrap(ctx, p.tagline, w)) {
    ctx.fillText(l, x, y)
    y += tagLh
  }

  y += 22
  const block = (label, value) => {
    font(ctx, MONO, 34)
    ctx.fillStyle = DIM_ON_PAPER
    ctx.fillText(label, x, y)
    y += 50
    font(ctx, MONO, 38, 500)
    ctx.fillStyle = INK
    for (const l of wrap(ctx, value, w)) {
      ctx.fillText(l, x, y)
      y += 50
    }
    y += 24
  }
  block('papel', p.role)
  block('stack', p.stack.join(' · '))

  // Os chips só entram se couberem acima do botão.
  const btnY = DH - 228
  if (p.chips.length && y + 70 < btnY) {
    let cx = x
    font(ctx, MONO, 34)
    for (const c of p.chips) {
      const cw = ctx.measureText(c).width + 36
      if (cx + cw > x + w) {
        cx = x
        y += 74
        if (y + 50 > btnY - 12) break
      }
      ctx.lineWidth = 2.5
      ctx.strokeStyle = 'rgba(10,10,11,0.45)'
      ctx.strokeRect(cx, y - 8, cw, 58)
      ctx.fillStyle = DIM_ON_PAPER
      ctx.textBaseline = 'middle'
      ctx.fillText(c, cx + 18, y + 22)
      ctx.textBaseline = 'alphabetic'
      cx += cw + 16
    }
  }

  if (p.links.length === 1) {
    const l = p.links[0]
    button(ctx, hits, { x, y: btnY, w, h: 118, label: l.label, href: l.href, external: l.href.startsWith('http') })
  } else if (p.links.length === 2) {
    const gap = 20
    const bw = (w - gap) / 2
    p.links.forEach((l, k) => {
      button(ctx, hits, {
        x: x + k * (bw + gap),
        y: btnY,
        w: bw,
        h: 118,
        label: l.label,
        href: l.href,
        solid: k === 0,
      })
    })
  } else {
    font(ctx, MONO, 38)
    ctx.fillStyle = DIM_ON_PAPER
    ctx.textBaseline = 'middle'
    ctx.fillText('sem link: ainda em planejamento', x, btnY + 59)
  }
  folio(ctx, folioOf(i)[1], 'right', false)
}

function paintEnd(ctx, hits) {
  fill(ctx, INK, 0.05)
  const x = 64
  const w = DW - x * 2
  font(ctx, DISPLAY, 100)
  const lines = COPY.endTitle.map((l) => l.toUpperCase())
  const widest = Math.max(...lines.map((l) => ctx.measureText(l).width))
  const size = Math.min(200, (100 * w) / widest)
  drawDisplay(ctx, lines, size, x, 110 + size * 1.12 * 3 - 0.2 * size, PAPER)
  button(ctx, hits, {
    x,
    y: DH - 338,
    w,
    h: 118,
    label: 'chamar no WhatsApp',
    href: WHATSAPP,
    onInk: true,
  })
  button(ctx, hits, {
    x,
    y: DH - 200,
    w,
    h: 118,
    label: 'voltar pro site',
    href: SITE_HOME,
    solid: false,
    onInk: true,
    external: false,
  })
}

function paintMade(ctx) {
  fill(ctx, PAPER)
  const x = 64
  const w = DW - 128
  drawDisplay(ctx, [COPY.madeTitle.toUpperCase()], 104, x, 190, INK)
  ctx.fillStyle = INK
  ctx.fillRect(x, 226, w, 5)
  let y = 310
  font(ctx, SANS, 48, 400)
  ctx.fillStyle = INK
  ctx.textBaseline = 'alphabetic'
  for (const l of wrap(ctx, COPY.madeBody, w)) {
    ctx.fillText(l, x, y)
    y += 66
  }
  y += 34
  font(ctx, MONO, 34)
  ctx.fillStyle = DIM_ON_PAPER
  ctx.fillText('stack', x, y)
  y += 50
  font(ctx, MONO, 38, 500)
  ctx.fillStyle = INK
  for (const l of wrap(ctx, COPY.madeStack, w)) {
    ctx.fillText(l, x, y)
    y += 50
  }
}

export function needsImage(face) {
  const d = describeFace(face)
  return d.type === 'projectLeft' && d.project.print ? d.project.print : null
}

// Pinta a face e devolve as áreas clicáveis, em unidades de página.
export function paintFace(ctx, face, img) {
  const hits = []
  const d = describeFace(face)
  switch (d.type) {
    case 'cover':
      paintCover(ctx)
      break
    case 'back':
      paintBack(ctx)
      break
    case 'opening':
      paintOpening(ctx, hits)
      break
    case 'toc':
      paintToc(ctx, hits)
      break
    case 'end':
      paintEnd(ctx, hits)
      break
    case 'made':
      paintMade(ctx)
      break
    case 'projectLeft':
      paintProjectLeft(ctx, d.project, d.index, img)
      break
    case 'projectRight':
      paintProjectRight(ctx, d.project, d.index, hits)
      break
  }
  return hits
}

export { printUrl, tracking }
