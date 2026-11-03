// Estado do livro, sem nada de three. Quem desenha lê daqui a cada quadro.
//
// f = quantas folhas já viraram (0 fechado na capa, 10 fechado na contracapa).
// turn = folha em movimento, entre os estados low e high. O t é geométrico:
// t = 0 a folha está deitada à direita (estado low), t = 1 à esquerda (estado high).
// Isso vale nos dois sentidos, e simplifica tudo o que depende do t.
import { LAST_F, describeSpread } from '../data/projects.js'

const OMEGA = 7.5

export function createStore({ reduced = false, f = 0 } = {}) {
  const listeners = new Set()
  const s = {
    f,
    side: 'L', // só usado no modo uma página por vez
    layout: 'spread',
    reduced,
    turn: null,
    pending: [],
    pan: 0, // arrasto entre as duas páginas, no modo uma página por vez
    panTarget: 0,
    touched: false,
    wake: () => {},
    needsFaces: () => {},

    subscribe(fn) {
      listeners.add(fn)
      return () => listeners.delete(fn)
    },
    snapshot: 0,
    getSnapshot: () => s.snapshot,
    emit() {
      s.snapshot++
      listeners.forEach((fn) => fn())
    },

    spread() {
      return describeSpread(s.f)
    },
    canNext() {
      if (s.layout === 'single' && s.f > 0 && s.f < LAST_F && s.side === 'L') return true
      return s.f < LAST_F
    },
    canPrev() {
      if (s.layout === 'single' && s.f > 0 && s.f < LAST_F && s.side === 'R') return true
      return s.f > 0
    },

    next() {
      s.touched = true
      if (s.turn && !s.turn.peek) {
        if (s.pending.length < 3) s.pending.push('next')
        s.emit()
        return
      }
      if (s.layout === 'single' && s.f > 0 && s.f < LAST_F && s.side === 'L') {
        s.side = 'R'
        s.wake()
        s.emit()
        return
      }
      if (s.f < LAST_F) s.startTurn(s.f, s.f + 1, 1)
    },
    prev() {
      s.touched = true
      if (s.turn && !s.turn.peek) {
        if (s.pending.length < 3) s.pending.push('prev')
        s.emit()
        return
      }
      if (s.layout === 'single' && s.f > 0 && s.f < LAST_F && s.side === 'R') {
        s.side = 'L'
        s.wake()
        s.emit()
        return
      }
      if (s.f > 0) s.startTurn(s.f - 1, s.f, 0)
    },
    goto(g) {
      if (g === s.f) {
        if (s.layout === 'single' && s.side !== 'L') {
          s.side = 'L'
          s.wake()
          s.emit()
        }
        return
      }
      s.touched = true
      if (s.turn?.peek) s.turn = null
      if (s.turn) return
      if (g > s.f) s.startTurn(s.f, g, 1)
      else s.startTurn(g, s.f, 0)
    },

    // Abre uma virada entre low e high, indo pro alvo (0 ou 1).
    startTurn(low, high, target, opts = {}) {
      s.needsFaces(low, high)
      if (s.reduced) {
        s.f = target === 1 ? high : low
        s.side = target === 1 ? 'L' : 'R'
        s.turn = null
        s.wake()
        s.emit()
        return
      }
      const existing = s.turn
      if (existing && existing.peek && existing.low === low && existing.high === high) {
        existing.peek = false
        existing.target = target
        s.wake()
        s.emit()
        return
      }
      s.turn = {
        low,
        high,
        t: target === 1 ? 0 : 1,
        v: 0,
        target,
        skew: opts.skew ?? 0.22,
        dragging: !!opts.dragging,
        peek: !!opts.peek,
        goal: 0,
      }
      s.turn.goal = s.turn.t
      s.wake()
      s.emit()
    },

    // Levanta só a pontinha, pra mostrar que dá pra pegar.
    peek(dir) {
      if (s.reduced) return
      if (s.turn && !s.turn.peek) return
      if (dir === 0) {
        if (s.turn?.peek) {
          s.turn.target = s.turn.home
          s.wake()
        }
        return
      }
      const low = dir > 0 ? s.f : s.f - 1
      const high = low + 1
      if (low < 0 || high > LAST_F) return
      if (s.turn?.peek && s.turn.low === low) {
        s.turn.target = dir > 0 ? 0.03 : 0.97
        s.wake()
        return
      }
      if (s.turn) return
      s.startTurn(low, high, dir > 0 ? 1 : 0, { peek: true, skew: 0.5 })
      s.turn.home = dir > 0 ? 0 : 1
      s.turn.target = dir > 0 ? 0.03 : 0.97
    },

    beginDrag(dir, skew) {
      s.touched = true
      if (s.turn && !s.turn.peek) return false
      const low = dir > 0 ? s.f : s.f - 1
      const high = low + 1
      if (low < 0 || high > LAST_F) return false
      if (s.turn?.peek) {
        s.turn.peek = false
        s.turn.dragging = true
        s.turn.skew = skew
        s.turn.goal = s.turn.t
        s.turn.dir = dir
        s.emit()
        return true
      }
      s.startTurn(low, high, dir > 0 ? 0 : 1, { dragging: true, skew })
      if (s.turn) s.turn.dir = dir
      return !!s.turn
    },
    dragTo(goal) {
      if (s.turn?.dragging) {
        s.turn.goal = goal
        s.wake()
      }
    },
    endDrag(commit) {
      const tr = s.turn
      if (!tr?.dragging) return
      tr.dragging = false
      tr.target = commit ? (tr.dir > 0 ? 1 : 0) : tr.dir > 0 ? 0 : 1
      s.wake()
    },

    // Avança a física. Devolve true enquanto tiver algo se mexendo.
    tick(dt) {
      const tr = s.turn
      if (!tr) return false
      if (tr.dragging) {
        const k = 1 - Math.exp(-dt * 26)
        const before = tr.t
        tr.t += (tr.goal - tr.t) * k
        tr.v = dt > 0 ? (tr.t - before) / dt : 0
        return true
      }
      const omega = s.pending.length ? OMEGA * 1.9 : tr.peek ? OMEGA * 1.4 : OMEGA
      const a = omega * omega * (tr.target - tr.t) - 2 * omega * tr.v
      tr.v += a * dt
      tr.t += tr.v * dt
      if (tr.t < 0) {
        tr.t = 0
        tr.v = 0
      } else if (tr.t > 1) {
        tr.t = 1
        tr.v = 0
      }
      if (Math.abs(tr.target - tr.t) < 0.0015 && Math.abs(tr.v) < 0.02) {
        if (tr.peek) {
          // pontinha levantada fica parada; quando volta pra casa, some
          tr.t = tr.target
          tr.v = 0
          if (tr.target === tr.home) {
            s.turn = null
            return false
          }
          return false
        }
        s.finishTurn()
        return !!s.turn
      }
      return true
    },

    finishTurn() {
      const tr = s.turn
      const forward = tr.target === 1
      const changed = (forward ? tr.high : tr.low) !== s.f
      s.f = forward ? tr.high : tr.low
      if (changed) s.side = forward ? 'L' : 'R'
      s.turn = null
      s.emit()
      const nxt = s.pending.shift()
      if (nxt === 'next') s.next()
      else if (nxt === 'prev') s.prev()
    },
  }
  return s
}
