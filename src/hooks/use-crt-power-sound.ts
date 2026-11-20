import { useCallback, useEffect, useRef } from "react"

type AudioWindow = Window & {
  webkitAudioContext?: typeof AudioContext
}

function makeNoise(context: AudioContext, duration: number) {
  const frameCount = Math.ceil(context.sampleRate * duration)
  const buffer = context.createBuffer(1, frameCount, context.sampleRate)
  const channel = buffer.getChannelData(0)

  for (let index = 0; index < frameCount; index += 1) {
    channel[index] = Math.random() * 2 - 1
  }

  const source = context.createBufferSource()
  source.buffer = buffer
  return source
}

function addOscillator(
  context: AudioContext,
  destination: AudioNode,
  options: {
    start: number
    duration: number
    from: number
    to: number
    gain: number
    type: OscillatorType
  },
) {
  const oscillator = context.createOscillator()
  const envelope = context.createGain()
  const end = options.start + options.duration

  oscillator.type = options.type
  oscillator.frequency.setValueAtTime(options.from, options.start)
  oscillator.frequency.exponentialRampToValueAtTime(Math.max(options.to, 1), end)
  envelope.gain.setValueAtTime(0.0001, options.start)
  envelope.gain.exponentialRampToValueAtTime(options.gain, options.start + Math.min(.012, options.duration / 3))
  envelope.gain.exponentialRampToValueAtTime(0.0001, end)

  oscillator.connect(envelope).connect(destination)
  oscillator.start(options.start)
  oscillator.stop(end + .02)
}

function playPowerOn(context: AudioContext, outputLevel: number) {
  const now = context.currentTime
  const master = context.createGain()
  master.gain.setValueAtTime(outputLevel, now)
  master.connect(context.destination)

  // Relay click, low degaussing thump, a breath of tuner static, then the flyback whine.
  addOscillator(context, master, {
    start: now,
    duration: .055,
    from: 135,
    to: 48,
    gain: .55,
    type: "square",
  })
  addOscillator(context, master, {
    start: now + .018,
    duration: .24,
    from: 76,
    to: 39,
    gain: .42,
    type: "sine",
  })
  addOscillator(context, master, {
    start: now + .08,
    duration: .48,
    from: 11800,
    to: 14600,
    gain: .045,
    type: "sine",
  })

  const noise = makeNoise(context, .34)
  const noiseFilter = context.createBiquadFilter()
  const noiseEnvelope = context.createGain()
  noiseFilter.type = "bandpass"
  noiseFilter.frequency.setValueAtTime(1850, now)
  noiseFilter.Q.setValueAtTime(.55, now)
  noiseEnvelope.gain.setValueAtTime(0.0001, now + .04)
  noiseEnvelope.gain.exponentialRampToValueAtTime(.18, now + .09)
  noiseEnvelope.gain.exponentialRampToValueAtTime(0.0001, now + .34)
  noise.connect(noiseFilter).connect(noiseEnvelope).connect(master)
  noise.start(now + .04)
  noise.stop(now + .38)
}

function playTrackChange(context: AudioContext, outputLevel: number) {
  const now = context.currentTime
  const master = context.createGain()
  master.gain.setValueAtTime(outputLevel * .72, now)
  master.connect(context.destination)

  const noise = makeNoise(context, .52)
  const noiseFilter = context.createBiquadFilter()
  const noiseEnvelope = context.createGain()
  noiseFilter.type = "bandpass"
  noiseFilter.frequency.setValueAtTime(2100, now)
  noiseFilter.frequency.linearRampToValueAtTime(4300, now + .5)
  noiseFilter.Q.setValueAtTime(.7, now)
  noiseEnvelope.gain.setValueAtTime(0.0001, now)
  noiseEnvelope.gain.linearRampToValueAtTime(.22, now + .012)
  noiseEnvelope.gain.exponentialRampToValueAtTime(0.0001, now + .11)
  noiseEnvelope.gain.setValueAtTime(.15, now + .16)
  noiseEnvelope.gain.exponentialRampToValueAtTime(0.0001, now + .25)
  noiseEnvelope.gain.setValueAtTime(.1, now + .31)
  noiseEnvelope.gain.exponentialRampToValueAtTime(0.0001, now + .47)
  noise.connect(noiseFilter).connect(noiseEnvelope).connect(master)
  noise.start(now)
  noise.stop(now + .52)

  addOscillator(context, master, {
    start: now + .025,
    duration: .09,
    from: 420,
    to: 105,
    gain: .16,
    type: "square",
  })
  addOscillator(context, master, {
    start: now + .18,
    duration: .08,
    from: 760,
    to: 1480,
    gain: .09,
    type: "square",
  })
}

function playPowerOff(context: AudioContext, outputLevel: number) {
  const now = context.currentTime
  const master = context.createGain()
  master.gain.setValueAtTime(outputLevel * .82, now)
  master.connect(context.destination)

  // A dry switch click and the high-voltage/scan tone falling away as the raster collapses.
  addOscillator(context, master, {
    start: now,
    duration: .045,
    from: 110,
    to: 42,
    gain: .48,
    type: "square",
  })
  addOscillator(context, master, {
    start: now + .025,
    duration: .3,
    from: 7200,
    to: 180,
    gain: .075,
    type: "sine",
  })

  const noise = makeNoise(context, .16)
  const noiseFilter = context.createBiquadFilter()
  const noiseEnvelope = context.createGain()
  noiseFilter.type = "lowpass"
  noiseFilter.frequency.setValueAtTime(2400, now)
  noiseEnvelope.gain.setValueAtTime(.08, now + .02)
  noiseEnvelope.gain.exponentialRampToValueAtTime(0.0001, now + .16)
  noise.connect(noiseFilter).connect(noiseEnvelope).connect(master)
  noise.start(now + .02)
  noise.stop(now + .18)
}

export function useCrtPowerSound(
  isPoweredOn: boolean,
  volume: number,
  isMuted: boolean,
  trackChangeToken = 0,
) {
  const contextRef = useRef<AudioContext | null>(null)
  const previousPowerRef = useRef(isPoweredOn)
  const previousTrackTokenRef = useRef(trackChangeToken)
  const levelRef = useRef({ volume, isMuted })

  useEffect(() => {
    levelRef.current = { volume, isMuted }
  }, [isMuted, volume])

  const getContext = useCallback(() => {
    if (contextRef.current) return contextRef.current

    const AudioContextConstructor = window.AudioContext ?? (window as AudioWindow).webkitAudioContext
    if (!AudioContextConstructor) return null

    contextRef.current = new AudioContextConstructor()
    return contextRef.current
  }, [])

  const primeCrtAudio = useCallback(() => {
    const context = getContext()
    if (context?.state === "suspended") void context.resume().catch(() => undefined)
  }, [getContext])

  useEffect(() => {
    if (previousPowerRef.current === isPoweredOn) return
    previousPowerRef.current = isPoweredOn

    const context = getContext()
    if (!context) return

    const play = async () => {
      if (context.state === "suspended") await context.resume()

      const { volume: currentVolume, isMuted: currentlyMuted } = levelRef.current
      if (currentlyMuted || currentVolume === 0) return

      const outputLevel = .055 + (currentVolume / 100) * .07
      if (isPoweredOn) playPowerOn(context, outputLevel)
      else playPowerOff(context, outputLevel)
    }

    void play().catch(() => undefined)
  }, [getContext, isPoweredOn])

  useEffect(() => {
    if (previousTrackTokenRef.current === trackChangeToken) return
    previousTrackTokenRef.current = trackChangeToken

    const context = getContext()
    if (!context) return

    const play = async () => {
      if (context.state === "suspended") await context.resume()

      const { volume: currentVolume, isMuted: currentlyMuted } = levelRef.current
      if (currentlyMuted || currentVolume === 0) return

      playTrackChange(context, .055 + (currentVolume / 100) * .07)
    }

    void play().catch(() => undefined)
  }, [getContext, trackChangeToken])

  useEffect(() => () => {
    void contextRef.current?.close()
    contextRef.current = null
  }, [])

  return { primeCrtAudio }
}
