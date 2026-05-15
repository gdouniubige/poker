let ctx: AudioContext | null = null

function getCtx(): AudioContext {
  if (!ctx) ctx = new AudioContext()
  if (ctx.state === 'suspended') ctx.resume()
  return ctx
}

function tone(freq: number, duration: number, type: OscillatorType = 'sine', vol = 0.15, delay = 0) {
  const c = getCtx()
  const osc = c.createOscillator()
  const gain = c.createGain()
  osc.type = type; osc.frequency.value = freq
  gain.gain.setValueAtTime(vol, c.currentTime + delay)
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + delay + duration)
  osc.connect(gain); gain.connect(c.destination)
  osc.start(c.currentTime + delay); osc.stop(c.currentTime + delay + duration)
}

function tones(notes: [number, number][], type: OscillatorType = 'sine', vol = 0.12) {
  notes.forEach(([freq, dur], i) => {
    const delay = notes.slice(0, i).reduce((s, [, d]) => s + d, 0) * 0.8
    tone(freq, dur, type, vol, delay)
  })
}

// ─── Public sound effects ───

export function useSound() {
  return {
    /** Card dealt / flipped */
    card() { tone(1200, 0.08, 'square', 0.06) },

    /** Community card reveal (flop/turn/river) */
    reveal(count: number) {
      for (let i = 0; i < count; i++) {
        tone(800 + i * 200, 0.1, 'square', 0.07, i * 0.12)
      }
    },

    /** Player checks */
    check() { tone(400, 0.1, 'sine', 0.08) },

    /** Player calls */
    call() { tones([[600, 0.06], [800, 0.08]], 'sine', 0.1) },

    /** Player raises */
    raise() { tones([[500, 0.06], [650, 0.06], [800, 0.1]], 'triangle', 0.12) },

    /** Player folds */
    fold() { tone(300, 0.15, 'sawtooth', 0.05) },

    /** Player goes all-in */
    allIn() { tones([[600, 0.06], [900, 0.06], [1200, 0.15]], 'square', 0.1) },

    /** Your turn */
    yourTurn() { tones([[800, 0.08], [1000, 0.12]], 'sine', 0.12) },

    /** Win pot */
    win() {
      tones([[523, 0.1], [659, 0.1], [784, 0.1], [1047, 0.2]], 'triangle', 0.15)
    },

    /** Player eliminated */
    eliminated() {
      tones([[400, 0.2], [350, 0.2], [300, 0.3]], 'sawtooth', 0.06)
    },
  }
}
