import type { AppLog } from '../AppLog.ts'
import { bytesAt } from '../BytesAt.ts'

export type SoundPlaying =
  | { readonly kind: 'once' }
  | { readonly kind: 'looped'; readonly loopFromSeconds: number; readonly loopToSeconds: number; readonly crossfadeSeconds: number; readonly fadeInSeconds: number; readonly fadeOutSeconds: number }
  | { readonly kind: 'streamedAndLooped'; readonly crossfadeSeconds: number; readonly fadeInSeconds: number; readonly fadeOutSeconds: number }

export type SoundFile = {
  readonly url: string
  readonly gain: number
  readonly playing: SoundPlaying
}

type LoopedPlaying = Extract<SoundPlaying, { readonly kind: 'looped' }>
type StreamedPlaying = Extract<SoundPlaying, { readonly kind: 'streamedAndLooped' }>

type LoopHeard = {
  readonly kind: 'looped'
  readonly loudness: GainNode
  readonly voices: AudioBufferSourceNode[]
  nextVoiceAtSeconds: number
}

type StreamHeard = {
  readonly kind: 'streamed'
  readonly players: readonly StreamPlayer[]
  playingIndex: number
  crossfadeEndsAtSeconds: number | null
}

type StreamPlayer = {
  readonly element: HTMLAudioElement
  readonly loudness: GainNode
}

type Heard = LoopHeard | StreamHeard

const secondsScheduledAhead = 1.5
const pointsInAFadeCurve = 64
const shortestFadeSeconds = 0.05
const millisecondsASoundWaitsForTheUnlock = 1000
const gesturesThatUnlockSound = ['pointerup', 'touchend', 'click', 'keydown'] as const

export class SoundBoard<SoundId extends string> {
  private readonly files: Readonly<Record<SoundId, SoundFile>>
  private readonly log: AppLog
  private readonly buffers = new Map<SoundId, AudioBuffer>()
  private readonly streamPlayers = new Map<SoundId, readonly StreamPlayer[]>()
  private readonly heard = new Map<SoundId, Heard>()
  private readonly soundsSkippedBeforeTheyLoaded = new Set<SoundId>()
  private context: AudioContext | null = null
  private overallLoudness: GainNode | null = null
  private overallLoudnessShare = 1
  private isThePageHidden = false
  private isUnlocking = false
  private readonly soundsWaitingForTheUnlock = new Map<SoundId, number>()

  constructor(files: Readonly<Record<SoundId, SoundFile>>, log: AppLog) {
    this.files = files
    this.log = log
  }

  setOverallLoudness(share: number): void {
    if (share === this.overallLoudnessShare) return
    this.overallLoudnessShare = share
    if (this.overallLoudness !== null) this.overallLoudness.gain.value = share
    this.log(`every sound plays at ${Math.round(share * 100)}% of its loudness`)
  }

  unlockOnEveryGestureOf(page: Document): void {
    for (const gesture of gesturesThatUnlockSound) page.addEventListener(gesture, () => this.unlock(gesture), { capture: true, passive: true })
  }

  async load(): Promise<void> {
    const context = this.audioContext()
    await Promise.all(this.soundIds().map(async (id) => {
      const file = this.files[id]
      try {
        switch (file.playing.kind) {
          case 'once':
          case 'looped':
            this.buffers.set(id, await context.decodeAudioData(await bytesAt(file.url)))
            return
          case 'streamedAndLooped':
            this.streamPlayers.set(id, await this.streamPlayersOf(file, context))
            return
        }
      } catch (error) {
        this.log(`sound ${id} could not be loaded, so it stays silent: ${String(error)}`, 'error')
      }
    }))
    this.log(`sounds loaded: ${[...this.buffers.keys(), ...this.streamPlayers.keys()].join(', ')}`)
  }

  playOnce(id: SoundId): void {
    const buffer = this.buffers.get(id)
    const context = this.context
    if (buffer === undefined || context === null) return this.logTheSkipOnce(id, 'it has not loaded')
    if (context.state !== 'running') {
      this.soundsWaitingForTheUnlock.set(id, performance.now())
      return this.log(`sound ${id} waits, because sound is still locked or paused`)
    }
    const loudness = context.createGain()
    loudness.gain.value = this.files[id].gain
    loudness.connect(this.overallLoudnessIn(context))
    const voice = context.createBufferSource()
    voice.buffer = buffer
    voice.connect(loudness)
    voice.start()
    this.log(`sound ${id} plays once`)
  }

  keepPlayingOnly(soundsLasting: ReadonlySet<SoundId>): void {
    const context = this.context
    if (context === null || context.state !== 'running' || this.isThePageHidden) return
    for (const id of this.soundIds()) {
      const file = this.files[id]
      const heard = this.heard.get(id)
      const shouldBeHeard = soundsLasting.has(id)
      if (shouldBeHeard && heard === undefined) this.start(id, file, context)
      else if (!shouldBeHeard && heard !== undefined) this.stop(id, file.playing, heard, context)
      else if (heard !== undefined) this.keepGoing(id, file, heard, context)
    }
  }

  pageHidden(): void {
    this.isThePageHidden = true
    for (const players of this.streamPlayers.values()) for (const player of players) player.element.pause()
    void this.context?.suspend()
    this.log('sounds pause while the page is hidden')
  }

  pageShown(): void {
    this.isThePageHidden = false
    void this.context?.resume()
    for (const [id, heard] of this.heard) if (heard.kind === 'streamed') this.playTheStream(id, heard.players[heard.playingIndex])
    this.log('sounds go on as the page is shown again')
  }

  private unlock(gesture: string): void {
    const context = this.audioContext()
    if (context.state !== 'running' && !this.isUnlocking) {
      this.isUnlocking = true
      void context.resume().then(() => {
        this.isUnlocking = false
        this.log(`sound is unlocked by a ${gesture}`)
        this.playTheSoundsThatWaitedForTheUnlock()
      }, (error: unknown) => {
        this.isUnlocking = false
        this.log(`sound stays locked after a ${gesture}: ${String(error)}`)
      })
    }
    for (const [id, players] of this.streamPlayers) for (const player of players) this.playOrPrimeInThisGesture(id, player.element)
  }

  private playOrPrimeInThisGesture(id: SoundId, element: HTMLAudioElement): void {
    if (this.isAPlayingStreamElement(element) && element.paused) return this.playTheStreamElement(id, element)
    this.primeInThisGesture(id, element)
  }

  private playTheSoundsThatWaitedForTheUnlock(): void {
    const now = performance.now()
    const waitingSounds = [...this.soundsWaitingForTheUnlock]
    this.soundsWaitingForTheUnlock.clear()
    for (const [id, askedAtMilliseconds] of waitingSounds) {
      if (now - askedAtMilliseconds <= millisecondsASoundWaitsForTheUnlock) this.playOnce(id)
      else this.log(`sound ${id} is not played, because it waited too long for the unlock`)
    }
  }

  private primeInThisGesture(id: SoundId, element: HTMLAudioElement): void {
    if (element.dataset['primed'] === 'yes' || !element.paused) return
    element.dataset['primed'] = 'yes'
    element.play().then(() => {
      if (!this.isAPlayingStreamElement(element)) element.pause()
    }, (error: unknown) => {
      element.dataset['primed'] = 'no'
      this.log(`sound ${id} could not be readied by a gesture: ${String(error)}`)
    })
  }

  private isAPlayingStreamElement(element: HTMLAudioElement): boolean {
    for (const heard of this.heard.values()) if (heard.kind === 'streamed' && heard.players[heard.playingIndex]?.element === element) return true
    return false
  }

  private start(id: SoundId, file: SoundFile, context: AudioContext): void {
    switch (file.playing.kind) {
      case 'once':
        return
      case 'looped':
        return this.startTheLoop(id, file, file.playing, context)
      case 'streamedAndLooped':
        return this.startTheStream(id, file.playing, context)
    }
  }

  private startTheLoop(id: SoundId, file: SoundFile, playing: LoopedPlaying, context: AudioContext): void {
    const buffer = this.buffers.get(id)
    if (buffer === undefined) return this.logTheSkipOnce(id, 'it has not loaded')
    const loudness = context.createGain()
    loudness.gain.value = file.gain
    loudness.connect(this.overallLoudnessIn(context))
    const startsAtSeconds = context.currentTime
    const firstVoice = voiceOf(buffer, loudness, context)
    if (playing.fadeInSeconds > 0) fadeIn(firstVoice.envelope, startsAtSeconds, playing.fadeInSeconds)
    firstVoice.source.start(startsAtSeconds, 0)
    const crossfadeStartsAtSeconds = startsAtSeconds + playing.loopToSeconds - playing.crossfadeSeconds
    fadeOut(firstVoice.envelope, crossfadeStartsAtSeconds, playing.crossfadeSeconds)
    firstVoice.source.stop(crossfadeStartsAtSeconds + playing.crossfadeSeconds)
    this.heard.set(id, { kind: 'looped', loudness, voices: [firstVoice.source], nextVoiceAtSeconds: crossfadeStartsAtSeconds })
    this.log(`sound ${id} starts, and loops from ${playing.loopFromSeconds} s to ${playing.loopToSeconds} s`)
  }

  private startTheStream(id: SoundId, playing: StreamedPlaying, context: AudioContext): void {
    const players = this.streamPlayers.get(id)
    const firstPlayer = players?.[0]
    if (players === undefined || firstPlayer === undefined) return this.logTheSkipOnce(id, 'it has not loaded')
    const now = context.currentTime
    firstPlayer.loudness.gain.cancelScheduledValues(now)
    firstPlayer.loudness.gain.setValueAtTime(0, now)
    firstPlayer.loudness.gain.linearRampToValueAtTime(1, now + playing.fadeInSeconds)
    firstPlayer.element.currentTime = 0
    this.heard.set(id, { kind: 'streamed', players, playingIndex: 0, crossfadeEndsAtSeconds: null })
    this.playTheStream(id, firstPlayer)
    this.log(`sound ${id} starts, streamed and looped`)
  }

  private playTheStream(id: SoundId, player: StreamPlayer | undefined): void {
    if (player !== undefined) this.playTheStreamElement(id, player.element)
  }

  private playTheStreamElement(id: SoundId, element: HTMLAudioElement): void {
    element.play().then(() => this.log(`sound ${id} plays`), (error: unknown) => this.log(`sound ${id} waits for the next gesture, because the browser did not let it play yet: ${String(error)}`))
  }

  private keepGoing(id: SoundId, file: SoundFile, heard: Heard, context: AudioContext): void {
    switch (file.playing.kind) {
      case 'once':
        return
      case 'looped':
        if (heard.kind === 'looped') this.scheduleTheNextVoiceIfDue(id, file.playing, heard, context)
        return
      case 'streamedAndLooped':
        if (heard.kind === 'streamed') this.crossfadeTheStreamIfDue(file.playing, heard, context)
        return
    }
  }

  private scheduleTheNextVoiceIfDue(id: SoundId, playing: LoopedPlaying, heard: LoopHeard, context: AudioContext): void {
    const buffer = this.buffers.get(id)
    if (buffer === undefined || heard.nextVoiceAtSeconds > context.currentTime + secondsScheduledAhead) return
    const startsAtSeconds = Math.max(heard.nextVoiceAtSeconds, context.currentTime)
    const voice = voiceOf(buffer, heard.loudness, context)
    fadeIn(voice.envelope, startsAtSeconds, playing.crossfadeSeconds)
    const crossfadeStartsAtSeconds = startsAtSeconds + playing.loopToSeconds - playing.loopFromSeconds
    fadeOut(voice.envelope, crossfadeStartsAtSeconds, playing.crossfadeSeconds)
    voice.source.start(startsAtSeconds, playing.loopFromSeconds - playing.crossfadeSeconds)
    voice.source.stop(crossfadeStartsAtSeconds + playing.crossfadeSeconds)
    heard.voices.splice(0, heard.voices.length - 1)
    heard.voices.push(voice.source)
    heard.nextVoiceAtSeconds = crossfadeStartsAtSeconds
  }

  private crossfadeTheStreamIfDue(playing: StreamedPlaying, heard: StreamHeard, context: AudioContext): void {
    const now = context.currentTime
    const playingNow = heard.players[heard.playingIndex]
    if (playingNow === undefined) return
    if (heard.crossfadeEndsAtSeconds !== null) {
      if (now < heard.crossfadeEndsAtSeconds) return
      heard.crossfadeEndsAtSeconds = null
      for (const player of heard.players) if (player !== playingNow) player.element.pause()
      return
    }
    const secondsLeft = Math.max(playingNow.element.duration - playingNow.element.currentTime, shortestFadeSeconds)
    if (!(secondsLeft <= playing.crossfadeSeconds)) return
    const nextIndex = (heard.playingIndex + 1) % heard.players.length
    const nextPlayer = heard.players[nextIndex]
    if (nextPlayer === undefined || nextPlayer === playingNow) return
    nextPlayer.element.currentTime = 0
    nextPlayer.loudness.gain.cancelScheduledValues(now)
    fadeIn(nextPlayer.loudness, now, secondsLeft)
    playingNow.loudness.gain.cancelScheduledValues(now)
    fadeOut(playingNow.loudness, now, secondsLeft)
    void nextPlayer.element.play()
    heard.playingIndex = nextIndex
    heard.crossfadeEndsAtSeconds = now + secondsLeft
  }

  private stop(id: SoundId, playing: SoundPlaying, heard: Heard, context: AudioContext): void {
    this.heard.delete(id)
    const now = context.currentTime
    switch (heard.kind) {
      case 'looped': {
        const fadeOutSeconds = playing.kind === 'looped' ? playing.fadeOutSeconds : 0
        heard.loudness.gain.cancelScheduledValues(now)
        heard.loudness.gain.setValueAtTime(heard.loudness.gain.value, now)
        heard.loudness.gain.linearRampToValueAtTime(0, now + fadeOutSeconds)
        for (const voice of heard.voices) voice.stop(now + fadeOutSeconds)
        break
      }
      case 'streamed': {
        const fadeOutSeconds = playing.kind === 'streamedAndLooped' ? playing.fadeOutSeconds : 0
        for (const player of heard.players) {
          player.loudness.gain.cancelScheduledValues(now)
          player.loudness.gain.setValueAtTime(player.loudness.gain.value, now)
          player.loudness.gain.linearRampToValueAtTime(0, now + fadeOutSeconds)
          window.setTimeout(() => {
            if (!this.heard.has(id)) player.element.pause()
          }, fadeOutSeconds * 1000)
        }
        break
      }
    }
    this.log(`sound ${id} stops`)
  }

  private async streamPlayersOf(file: SoundFile, context: AudioContext): Promise<readonly StreamPlayer[]> {
    const source = file.url.startsWith('data:') ? URL.createObjectURL(new Blob([await bytesAt(file.url)])) : file.url
    const mix = context.createGain()
    mix.gain.value = file.gain
    mix.connect(context.destination)
    return [0, 1].map(() => {
      const element = new Audio(source)
      element.preload = 'auto'
      const loudness = context.createGain()
      loudness.gain.value = 0
      context.createMediaElementSource(element).connect(loudness)
      loudness.connect(mix)
      return { element, loudness }
    })
  }

  private overallLoudnessIn(context: AudioContext): GainNode {
    if (this.overallLoudness === null) {
      this.overallLoudness = context.createGain()
      this.overallLoudness.gain.value = this.overallLoudnessShare
      this.overallLoudness.connect(context.destination)
    }
    return this.overallLoudness
  }

  private audioContext(): AudioContext {
    this.context ??= new AudioContext()
    return this.context
  }

  private soundIds(): SoundId[] {
    return Object.keys(this.files) as SoundId[]
  }

  private logTheSkipOnce(id: SoundId, reason: string): void {
    if (this.soundsSkippedBeforeTheyLoaded.has(id)) return
    this.soundsSkippedBeforeTheyLoaded.add(id)
    this.log(`sound ${id} is not played, because ${reason}`)
  }
}

function voiceOf(buffer: AudioBuffer, loudness: GainNode, context: AudioContext): { readonly source: AudioBufferSourceNode; readonly envelope: GainNode } {
  const envelope = context.createGain()
  envelope.connect(loudness)
  const source = context.createBufferSource()
  source.buffer = buffer
  source.connect(envelope)
  return { source, envelope }
}

function fadeIn(gainNode: GainNode, fromSeconds: number, durationSeconds: number): void {
  gainNode.gain.setValueCurveAtTime(equalPowerCurve((share) => Math.sin((share * Math.PI) / 2)), fromSeconds, durationSeconds)
}

function fadeOut(gainNode: GainNode, fromSeconds: number, durationSeconds: number): void {
  gainNode.gain.setValueCurveAtTime(equalPowerCurve((share) => Math.cos((share * Math.PI) / 2)), fromSeconds, durationSeconds)
}

function equalPowerCurve(loudnessAt: (share: number) => number): Float32Array {
  return Float32Array.from({ length: pointsInAFadeCurve }, (_, index) => loudnessAt(index / (pointsInAFadeCurve - 1)))
}
