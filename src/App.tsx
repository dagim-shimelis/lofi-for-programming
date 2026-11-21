import { useEffect, useState } from "react"
import {
  ChevronDownIcon,
  CircleHelpIcon,
  ExpandIcon,
  HeartIcon,
  MessageSquarePlusIcon,
  MinimizeIcon,
  PauseIcon,
  PlayIcon,
  ShuffleIcon,
  SkipBackIcon,
  SkipForwardIcon,
  Volume2Icon,
  VolumeXIcon,
} from "lucide-react"

import { GlassButton } from "@/components/glassyui/glass-button"
import { GlassPanel } from "@/components/glassyui/glass-panel"
import { GlassSlider } from "@/components/glassyui/glass-slider"
import { PageLoader } from "@/components/page-loader"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { playlists } from "@/data/playlists"
import { useCrtPowerSound } from "@/hooks/use-crt-power-sound"
import { usePageLoader } from "@/hooks/use-page-loader"
import { buildEmbedUrl, useSoundCloudPlayer } from "@/hooks/use-soundcloud-player"
import { useUserJot } from "@/hooks/use-userjot"
import { cn } from "@/lib/utils"

const GITHUB_REPOSITORY = "https://github.com/dagim-shimelis/lofi-for-programming"
const INITIAL_PAGE_ASSETS = [
  "/assets/loader-tv.webp",
  "/assets/meadow-clouds.webp",
  "/assets/meadow-cover.webp",
  "/assets/meadow-field.webp",
  "/assets/meadow-tv.png",
] as const
const allTracks = playlists.flatMap((playlist) => playlist.tracks)
const playlistOffsets = new Map(
  playlists.map((playlist, index) => [
    playlist.id,
    playlists.slice(0, index).reduce((total, item) => total + item.tracks.length, 0),
  ]),
)

function soundCloudArtwork(url: string, quality: "original" | "t500x500") {
  if (!url.includes("sndcdn.com")) return url
  return url.replace(/-(?:large|t500x500|original)(\.[a-z0-9]+)$/i, `-${quality}$1`)
}

function GitHubMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
      <path d="M12 .7a11.5 11.5 0 0 0-3.64 22.41c.58.11.79-.25.79-.56v-2.23c-3.22.7-3.9-1.37-3.9-1.37-.53-1.34-1.29-1.7-1.29-1.7-1.05-.72.08-.71.08-.71 1.16.08 1.78 1.2 1.78 1.2 1.04 1.77 2.72 1.26 3.38.96.1-.75.4-1.26.74-1.55-2.57-.3-5.27-1.29-5.27-5.69 0-1.26.45-2.29 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.16 1.18A11 11 0 0 1 12 6.12c.98 0 1.95.13 2.87.39 2.19-1.49 3.16-1.18 3.16-1.18.63 1.59.23 2.76.11 3.05.74.8 1.19 1.83 1.19 3.09 0 4.41-2.71 5.39-5.29 5.68.42.36.79 1.06.79 2.15v3.25c0 .31.21.68.8.56A11.5 11.5 0 0 0 12 .7Z" />
    </svg>
  )
}

const shortcuts = [
  ["Space / K", "Play or pause"],
  ["J / ←", "Back 10 seconds"],
  ["L / →", "Forward 10 seconds"],
  ["N / P", "Next or previous track"],
  ["↑ / ↓", "Volume up or down"],
  ["M", "Mute"],
  ["S", "Shuffle"],
  ["F", "Fullscreen"],
] as const

function App() {
  const { phase: loaderPhase, progress: loadProgress } = usePageLoader(INITIAL_PAGE_ASSETS)
  const { iframeRef, player } = useSoundCloudPlayer(allTracks, playlists)
  const { openFeedback } = useUserJot()
  const [embedUrl] = useState(() => buildEmbedUrl(player.selectedMix?.url ?? allTracks[0].url))
  const [expandedPlaylistId, setExpandedPlaylistId] = useState<string | null>(playlists[0].id)
  const [isFullscreen, setIsFullscreen] = useState(() => Boolean(document.fullscreenElement))
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("lofi-favorites") ?? "[]") as string[]
    } catch {
      return []
    }
  })
  const [playedTrackIds, setPlayedTrackIds] = useState<Set<string>>(new Set())

  const selectedMix = player.selectedMix ?? allTracks[0]
  const selectedPlaylist = playlists.find((playlist) =>
    playlist.tracks.some((track) => track.id === selectedMix.id),
  ) ?? playlists[0]
  const rawArtwork = selectedMix.artwork || selectedPlaylist.artwork || "/assets/meadow-cover.webp"
  const albumArtwork = soundCloudArtwork(rawArtwork, "original")
  const fallbackArtwork = soundCloudArtwork(rawArtwork, "t500x500")
  const [visibleArtwork, setVisibleArtwork] = useState(albumArtwork)
  const isFavorite = favorites.includes(selectedMix.id)
  const isTvPowered = player.isPlaying || player.isChangingTrack
  const { primeCrtAudio } = useCrtPowerSound(
    isTvPowered,
    player.volume,
    player.isMuted,
    player.trackChangeToken,
  )

  useEffect(() => {
    document.title = player.isPlaying
      ? `Lofi Music - ${selectedMix.title}`
      : "Lofi Music"
  }, [player.isPlaying, selectedMix.title])

  useEffect(() => {
    // Remember which tracks have been played at least once so the music-bar
    // icon only appears on a song after it's been played (and paused).
    // The update is deferred so it doesn't run synchronously inside the effect.
    if (player.isPlaying && selectedMix && !playedTrackIds.has(selectedMix.id)) {
      const timer = setTimeout(() => {
        setPlayedTrackIds((ids) => {
          if (ids.has(selectedMix.id)) return ids
          const next = new Set(ids)
          next.add(selectedMix.id)
          return next
        })
      }, 0)
      return () => clearTimeout(timer)
    }
  }, [player.isPlaying, selectedMix, playedTrackIds])

  useEffect(() => {
    let cancelled = false

    const loadArtwork = (source: string, fallback?: string) => {
      const image = new Image()
      image.onload = () => {
        if (!cancelled) setVisibleArtwork(source)
      }
      image.onerror = () => {
        if (fallback && fallback !== source) loadArtwork(fallback)
        else if (!cancelled) setVisibleArtwork("/assets/meadow-cover.webp")
      }
      image.src = source
    }

    loadArtwork(albumArtwork, fallbackArtwork)
    return () => { cancelled = true }
  }, [albumArtwork, fallbackArtwork])

  useEffect(() => {
    localStorage.setItem("lofi-favorites", JSON.stringify(favorites))
  }, [favorites])

  useEffect(() => {
    const syncFullscreenState = () => setIsFullscreen(Boolean(document.fullscreenElement))
    document.addEventListener("fullscreenchange", syncFullscreenState)
    return () => document.removeEventListener("fullscreenchange", syncFullscreenState)
  }, [])

  useEffect(() => {
    const handleKeyboard = (event: KeyboardEvent) => {
      const target = event.target
      // Ignore keyboard shortcuts while the user is typing in a text field,
      // including the feedback composer opened from the "Send feedback" button.
      if (
        target instanceof HTMLElement &&
        (target.matches("input, textarea, select") || target.isContentEditable)
      ) return

      const key = event.key.toLowerCase()
      if (event.code === "Space" || key === "k") {
        event.preventDefault()
        primeCrtAudio()
        player.togglePlayback()
      } else if (event.key === "ArrowLeft" || key === "j") {
        event.preventDefault()
        player.seekBy(-10)
      } else if (event.key === "ArrowRight" || key === "l") {
        event.preventDefault()
        player.seekBy(10)
      } else if (event.key === "ArrowUp") {
        event.preventDefault()
        player.setVolume(player.volume + 5)
      } else if (event.key === "ArrowDown") {
        event.preventDefault()
        player.setVolume(player.volume - 5)
      } else if (key === "n") {
        primeCrtAudio()
        player.playNext()
      } else if (key === "p") {
        primeCrtAudio()
        player.playPrevious()
      }
      else if (key === "m") player.toggleMute()
      else if (key === "s") player.setIsShuffling((value) => !value)
      else if (key === "f") {
        void (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen())
      }
    }

    window.addEventListener("keydown", handleKeyboard)
    return () => window.removeEventListener("keydown", handleKeyboard)
  }, [player, primeCrtAudio])

  const toggleFavorite = () => {
    setFavorites((current) =>
      current.includes(selectedMix.id)
        ? current.filter((id) => id !== selectedMix.id)
        : [...current, selectedMix.id],
    )
  }

  return (
    <main
      className="scene"
      aria-label="Lofi music player"
      aria-busy={loaderPhase !== "hidden"}
    >
      <PageLoader phase={loaderPhase} progress={loadProgress} />

      <div className="world" aria-hidden="true">
        <img className="clouds" src="/assets/meadow-clouds.webp" alt="" />
        <div className="tv">
          <div className={cn("tube", isTvPowered ? "is-on" : player.hasPlayed ? "is-off" : "is-standby")}>
            <img
              className="album-art"
              src={visibleArtwork}
              alt={`${selectedMix.title} album artwork`}
              onError={(event) => { event.currentTarget.src = "/assets/meadow-cover.webp" }}
            />
            {player.trackChangeToken > 0 && (
              <div className="track-glitch" key={player.trackChangeToken}>
                <img src={visibleArtwork} alt="" />
              </div>
            )}
            <div className="screen-wash" />
            <div className="screen-static" />
            <div className="screen-flare" />
            <div className="screen-off" />
          </div>
          <img className="case" src="/assets/meadow-tv.png" alt="" />
        </div>
        <img className="field" src="/assets/meadow-field.webp" alt="" />
      </div>

      <TooltipProvider delayDuration={280}>
        <GlassPanel className="top-actions" variant="pill" preset="control" thickness={1.15} aria-label="Project links">
          <Tooltip>
            <TooltipTrigger asChild>
              <GlassButton
                variant="ghost"
                size="sm"
                aria-label="Send feedback"
                onClick={openFeedback}
              >
                <MessageSquarePlusIcon />
              </GlassButton>
            </TooltipTrigger>
            <TooltipContent className="glass-tooltip" side="bottom" sideOffset={9}>Send feedback</TooltipContent>
          </Tooltip>
          <Popover>
            <Tooltip>
              <TooltipTrigger asChild>
                <PopoverTrigger asChild>
                  <GlassButton variant="ghost" size="sm" aria-label="Show keyboard shortcuts">
                    <CircleHelpIcon />
                  </GlassButton>
                </PopoverTrigger>
              </TooltipTrigger>
              <TooltipContent className="glass-tooltip" side="bottom" sideOffset={9}>Keyboard shortcuts</TooltipContent>
            </Tooltip>
            <PopoverContent className="shortcut-popover" align="end" sideOffset={10}>
              <div className="shortcut-heading">
                <strong>Keyboard shortcuts</strong>
                <span>Keep the music moving without leaving the keys.</span>
              </div>
              <dl className="shortcut-list">
                {shortcuts.map(([keys, action]) => (
                  <div key={keys}>
                    <dt><kbd>{keys}</kbd></dt>
                    <dd>{action}</dd>
                  </div>
                ))}
              </dl>
            </PopoverContent>
          </Popover>
          <Tooltip>
            <TooltipTrigger asChild>
              <GlassButton asChild variant="ghost" size="sm">
                <a
                  href={GITHUB_REPOSITORY}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="View the project on GitHub"
                >
                  <GitHubMark />
                </a>
              </GlassButton>
            </TooltipTrigger>
            <TooltipContent className="glass-tooltip" side="bottom" sideOffset={9}>View on GitHub</TooltipContent>
          </Tooltip>
        </GlassPanel>
      </TooltipProvider>

      <GlassPanel
        className="playlist"
        role="region"
        aria-label="Lofi playlists"
        preset="showcase"
        elevation="raised"
        thickness={1.2}
      >
        <div className="playlist-accordion">
          {playlists.map((playlist) => {
            const expanded = expandedPlaylistId === playlist.id
            const activePlaylist = selectedPlaylist.id === playlist.id
            const offset = playlistOffsets.get(playlist.id) ?? 0
            const panelId = `${playlist.id}-tracks`

            return (
              <section className="playlist-group" key={playlist.id}>
                <button
                  className="playlist-trigger"
                  type="button"
                  aria-expanded={expanded}
                  aria-controls={panelId}
                  data-active={activePlaylist ? "true" : undefined}
                  onClick={() => setExpandedPlaylistId((current) => current === playlist.id ? null : playlist.id)}
                >
                  <span className="playlist-copy">
                    <strong>{playlist.title}</strong>
                    <small>{playlist.creator} · {playlist.tracks.length} tracks</small>
                  </span>
                  <ChevronDownIcon aria-hidden="true" />
                </button>

                {expanded && (
                  <ol className="tracks" id={panelId}>
                    {playlist.tracks.map((mix, index) => {
                      const globalIndex = offset + index
                      const active = globalIndex === player.selectedIndex
                      return (
                        <li key={mix.id}>
                          <button
                            className="track"
                            type="button"
                            aria-current={active ? "true" : undefined}
                            data-playing={active && player.isPlaying ? "true" : undefined}
                            data-has-played={active && playedTrackIds.has(mix.id) ? "true" : undefined}
                            onClick={() => {
                              primeCrtAudio()
                              player.playIndex(globalIndex)
                            }}
                          >
                            <span className="track-number" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
                            <span className="track-current levels" aria-hidden="true"><i /><i /><i /></span>
                            <span className="track-name">{mix.title}</span>
                            <span className="track-favorite" aria-label={favorites.includes(mix.id) ? "Favorite" : undefined}>
                              {favorites.includes(mix.id) ? "♥" : ""}
                            </span>
                          </button>
                        </li>
                      )
                    })}
                  </ol>
                )}
              </section>
            )
          })}
        </div>

        {player.hasError && <p className="player-error" role="alert">The signal faded. Choose another track or try again.</p>}
      </GlassPanel>

      <GlassPanel
        className="control-dock"
        variant="pill"
        preset="control"
        thickness={1.35}
        aria-label="Playback controls"
      >
        <div className="controls">
          <GlassButton
            variant="ghost"
            size="sm"
            aria-label="Previous track"
            onClick={() => {
              primeCrtAudio()
              player.playPrevious()
            }}
          ><SkipBackIcon /></GlassButton>
          <GlassButton
            className="play-control"
            variant="primary"
            size="md"
            aria-label={player.isPlaying ? "Pause track" : "Play track"}
            disabled={!player.isReady}
            onClick={() => {
              primeCrtAudio()
              player.togglePlayback()
            }}
          >
            {player.isPlaying ? <PauseIcon /> : <PlayIcon />}
          </GlassButton>
          <GlassButton
            variant="ghost"
            size="sm"
            aria-label="Next track"
            onClick={() => {
              primeCrtAudio()
              player.playNext()
            }}
          ><SkipForwardIcon /></GlassButton>
          <GlassButton
            variant="ghost"
            size="sm"
            aria-label={player.isShuffling ? "Turn shuffle off" : "Turn shuffle on"}
            aria-pressed={player.isShuffling}
            className={cn(player.isShuffling && "is-active")}
            onClick={() => player.setIsShuffling((value) => !value)}
          ><ShuffleIcon /></GlassButton>
          <GlassButton
            variant="ghost"
            size="sm"
            aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
            aria-pressed={isFavorite}
            className={cn(isFavorite && "is-active")}
            onClick={toggleFavorite}
          ><HeartIcon fill={isFavorite ? "currentColor" : "none"} /></GlassButton>
          <div className="volume-control">
            <GlassButton
              variant="ghost"
              size="sm"
              aria-label={player.isMuted || player.volume === 0 ? "Unmute" : "Mute"}
              aria-pressed={player.isMuted || player.volume === 0}
              onClick={player.toggleMute}
            >
              {player.isMuted || player.volume === 0 ? <VolumeXIcon /> : <Volume2Icon />}
            </GlassButton>
            <GlassPanel className="volume-popover" variant="pill" preset="control" thickness={1.1}>
              <GlassSlider
                className="volume"
                aria-label="Volume"
                min={0}
                max={100}
                value={[player.isMuted ? 0 : player.volume]}
                onValueChange={([value]) => player.setVolume(value ?? 0)}
              />
            </GlassPanel>
          </div>
          <GlassButton
            variant="ghost"
            size="sm"
            aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
            onClick={() => void (document.fullscreenElement
              ? document.exitFullscreen()
              : document.documentElement.requestFullscreen())}
          >
            {isFullscreen ? <MinimizeIcon /> : <ExpandIcon />}
          </GlassButton>
        </div>
      </GlassPanel>

      <footer className="station-footer">
        <a href={selectedMix.url} target="_blank" rel="noreferrer">Listen on SoundCloud</a>
        <span className="creator-credit">Made with ❤️ by <a href="https://dagim.codes" target="_blank" rel="noreferrer">dagim.code</a></span>
      </footer>

      <div className="embed-panel" aria-hidden="true">
        <iframe
          ref={iframeRef}
          tabIndex={-1}
          title={`${selectedMix.title} embedded player`}
          width="500"
          height="166"
          scrolling="no"
          allow="autoplay"
          src={embedUrl}
        />
      </div>
    </main>
  )
}

export default App
