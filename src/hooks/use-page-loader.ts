import { useEffect, useState } from "react"

export type PageLoaderPhase = "loading" | "leaving" | "hidden"

const MINIMUM_DISPLAY_MS = 900
const MAXIMUM_WAIT_MS = 8000
const EXIT_DURATION_MS = 600

function preloadImage(source: string) {
  return new Promise<void>((resolve) => {
    const image = new Image()
    const finish = () => resolve()

    image.onload = () => {
      if (typeof image.decode === "function") {
        void image.decode().catch(() => undefined).finally(finish)
      } else {
        finish()
      }
    }
    image.onerror = finish
    image.src = source
  })
}

export function usePageLoader(assetSources: readonly string[]) {
  const [progress, setProgress] = useState(0)
  const [phase, setPhase] = useState<PageLoaderPhase>("loading")

  useEffect(() => {
    let cancelled = false
    let finished = false
    const startedAt = performance.now()
    const timers: number[] = []
    const intervals: number[] = []
    const wait = (duration: number) => new Promise<void>((resolve) => {
      timers.push(window.setTimeout(resolve, duration))
    })

    const tasks: Promise<unknown>[] = assetSources.map(preloadImage)
    if (document.fonts) tasks.push(document.fonts.ready)

    let loadedCount = 0
    let displayedCount = 0
    let resolveDisplayed: (() => void) | undefined
    const displayedComplete = new Promise<void>((resolve) => { resolveDisplayed = resolve })
    const progressInterval = window.setInterval(() => {
      if (cancelled || finished || displayedCount >= loadedCount) return

      displayedCount += 1
      setProgress(Math.round((displayedCount / tasks.length) * 100))
      if (displayedCount === tasks.length) resolveDisplayed?.()
    }, 120)
    intervals.push(progressInterval)

    const trackedTasks = tasks.map((task) =>
      task.catch(() => undefined).then(() => {
        if (!cancelled && !finished) loadedCount += 1
      }),
    )

    const finishLoading = async () => {
      await Promise.race([
        Promise.all(trackedTasks).then(() => displayedComplete),
        wait(MAXIMUM_WAIT_MS),
      ])
      if (cancelled) return

      finished = true
      window.clearInterval(progressInterval)
      setProgress(100)
      const elapsed = performance.now() - startedAt
      await wait(Math.max(0, MINIMUM_DISPLAY_MS - elapsed))
      if (cancelled) return

      setPhase("leaving")
      await wait(EXIT_DURATION_MS)
      if (!cancelled) setPhase("hidden")
    }

    void finishLoading()

    return () => {
      cancelled = true
      timers.forEach(window.clearTimeout)
      intervals.forEach(window.clearInterval)
    }
  }, [assetSources])

  return { phase, progress }
}
