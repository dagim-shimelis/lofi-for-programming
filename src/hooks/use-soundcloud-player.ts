import { useCallback, useEffect, useRef, useState } from "react"

import type { Mix } from "@/data/mixes"
import type { Playlist } from "@/data/playlists"

type WidgetEvent = "READY" | "PLAY" | "PAUSE" | "FINISH" | "PLAY_PROGRESS" | "ERROR"

type ProgressEvent = {
  currentPosition: number
  loadedProgress: number
  relativePosition: number
}

type SoundCloudWidget = {
  bind: (event: WidgetEvent, callback: (event?: ProgressEvent) => void) => void
  unbind: (event: WidgetEvent) => void
  load: (url: string, options: Record<string, boolean | string>) => void
  play: () => void
  pause: () => void
  toggle: () => void
  seekTo: (milliseconds: number) => void
  setVolume: (volume: number) => void
  getDuration: (callback: (duration: number) => void) => void
  getPosition: (callback: (position: number) => void) => void
}

type SoundCloudApi = {
  Widget: ((iframe: HTMLIFrameElement) => SoundCloudWidget) & {
    Events: Record<WidgetEvent, WidgetEvent>
  }
}

declare global {
  interface Window {
    SC?: SoundCloudApi
  }
}

const widgetOptions = {
  auto_play: false,
  buy_button: false,
  color: "#d2a45f",
  download: false,
  hide_related: true,
  liking: false,
  show_artwork: false,
  show_comments: false,
  show_playcount: false,
  show_reposts: false,
  show_teaser: false,
  show_user: true,
  sharing: true,
  visual: false,
}

export function buildEmbedUrl(url: string) {
  const params = new URLSearchParams({
    url,
    color: "#d2a45f",
    auto_play: "false",
    hide_related: "true",
    show_comments: "false",
    show_user: "true",
    show_reposts: "false",
    show_teaser: "false",
    visual: "false",
  })

  return `https://w.soundcloud.com/player/?${params.toString()}`
}

export function useSoundCloudPlayer(mixes: Mix[], playlists: Playlist[] = []) {
  const initialIndex = Math.max(0, mixes.findIndex((mix) => mix.id === window.location.hash.slice(1)))
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const widgetRef = useRef<SoundCloudWidget | null>(null)
  const selectedIndexRef = useRef(initialIndex)
  const isPlayingRef = useRef(false)
  const lastAudibleVolumeRef = useRef(72)
  const [selectedIndex, setSelectedIndex] = useState(initialIndex)
  const [isReady, setIsReady] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [hasPlayed, setHasPlayed] = useState(false)
  const [isChangingTrack, setIsChangingTrack] = useState(false)
  const [trackChangeToken, setTrackChangeToken] = useState(0)
  const [duration, setDuration] = useState(0)
  const [position, setPosition] = useState(0)
  const [loaded, setLoaded] = useState(0)
  const [volume, setVolumeState] = useState(72)
  const [isMuted, setIsMuted] = useState(false)
  const [isShuffling, setIsShuffling] = useState(false)
  const [hasError, setHasError] = useState(false)

  useEffect(() => {
    selectedIndexRef.current = selectedIndex
  }, [selectedIndex])

  const refreshDuration = useCallback(() => {
    widgetRef.current?.getDuration((nextDuration) => setDuration(nextDuration || 0))
  }, [])

  const playIndex = useCallback(
    (index: number, autoplay = true) => {
      const safeIndex = (index + mixes.length) % mixes.length
      const mix = mixes[safeIndex]
      if (!mix) return

      if (safeIndex !== selectedIndexRef.current && isPlayingRef.current) {
        setIsChangingTrack(true)
        setTrackChangeToken((token) => token + 1)
      }

      setSelectedIndex(safeIndex)
      setPosition(0)
      setDuration(0)
      setLoaded(0)
      setHasError(false)
      window.history.replaceState(null, "", `#${mix.id}`)

      widgetRef.current?.load(mix.url, {
        ...widgetOptions,
        auto_play: autoplay,
      })
    },
    [mixes],
  )

  const playNext = useCallback(() => {
    if (isShuffling) {
      // Shuffle within the current playlist only: find which playlist the
      // current track belongs to and pick a random track from that same playlist.
      let segmentStart = 0
      let segmentEnd = mixes.length
      let offset = 0
      for (const playlist of playlists) {
        const end = offset + playlist.tracks.length
        if (selectedIndexRef.current >= offset && selectedIndexRef.current < end) {
          segmentStart = offset
          segmentEnd = end
          break
        }
        offset = end
      }

      const count = segmentEnd - segmentStart
      if (count > 1) {
        let next = selectedIndexRef.current
        while (next === selectedIndexRef.current) {
          next = segmentStart + Math.floor(Math.random() * count)
        }
        playIndex(next)
      }
      return
    }

    playIndex(selectedIndexRef.current + 1)
  }, [isShuffling, mixes.length, playIndex, playlists])

  const playPrevious = useCallback(() => {
    playIndex(selectedIndexRef.current - 1)
  }, [playIndex])

  useEffect(() => {
    const iframe = iframeRef.current
    if (!iframe || !window.SC) return

    const widget = window.SC.Widget(iframe)
    const events = window.SC.Widget.Events
    widgetRef.current = widget

    widget.bind(events.READY, () => {
      setIsReady(true)
      setHasError(false)
      widget.setVolume(isMuted ? 0 : volume)
      refreshDuration()
    })
    widget.bind(events.PLAY, () => {
      isPlayingRef.current = true
      setIsPlaying(true)
      setIsChangingTrack(false)
      setHasPlayed(true)
      refreshDuration()
    })
    widget.bind(events.PAUSE, () => {
      isPlayingRef.current = false
      setIsPlaying(false)
    })
    widget.bind(events.FINISH, () => {
      setIsPlaying(false)
      playNext()
    })
    widget.bind(events.PLAY_PROGRESS, (event) => {
      if (!event) return
      setPosition(event.currentPosition)
      setLoaded(event.loadedProgress)
    })
    widget.bind(events.ERROR, () => {
      isPlayingRef.current = false
      setIsChangingTrack(false)
      setHasError(true)
      setIsPlaying(false)
    })

    return () => {
      Object.values(events).forEach((event) => widget.unbind(event))
      widgetRef.current = null
    }
  }, [isMuted, playNext, refreshDuration, volume])

  const togglePlayback = useCallback(() => {
    widgetRef.current?.toggle()
  }, [])

  const seekTo = useCallback((milliseconds: number) => {
    const nextPosition = Math.max(0, Math.min(milliseconds, duration || milliseconds))
    setPosition(nextPosition)
    widgetRef.current?.seekTo(nextPosition)
  }, [duration])

  const seekBy = useCallback((seconds: number) => {
    widgetRef.current?.getPosition((currentPosition) => seekTo(currentPosition + seconds * 1000))
  }, [seekTo])

  const setVolume = useCallback((nextVolume: number) => {
    const safeVolume = Math.max(0, Math.min(100, nextVolume))
    if (safeVolume > 0) lastAudibleVolumeRef.current = safeVolume
    setVolumeState(safeVolume)
    setIsMuted(safeVolume === 0)
    widgetRef.current?.setVolume(safeVolume)
  }, [])

  const toggleMute = useCallback(() => {
    setIsMuted((muted) => {
      if (muted || volume === 0) {
        const restoredVolume = lastAudibleVolumeRef.current
        setVolumeState(restoredVolume)
        widgetRef.current?.setVolume(restoredVolume)
        return false
      }

      widgetRef.current?.setVolume(0)
      return true
    })
  }, [volume])

  return {
    iframeRef,
    player: {
      selectedIndex,
      selectedMix: mixes[selectedIndex],
      isReady,
      isPlaying,
      hasPlayed,
      isChangingTrack,
      trackChangeToken,
      duration,
      position,
      loaded,
      volume,
      isMuted,
      isShuffling,
      hasError,
      playIndex,
      playNext,
      playPrevious,
      togglePlayback,
      seekTo,
      seekBy,
      setVolume,
      toggleMute,
      setIsShuffling,
    },
  }
}
