import type { PageLoaderPhase } from "@/hooks/use-page-loader"
import { cn } from "@/lib/utils"

type PageLoaderProps = {
  phase: PageLoaderPhase
  progress: number
}

export function PageLoader({ phase, progress }: PageLoaderProps) {
  if (phase === "hidden") return null

  return (
    <div
      className={cn("page-loader", phase === "leaving" && "is-leaving")}
      role="status"
      aria-label={`Loading Lofi for Programming: ${progress}%`}
    >
      <div className="loader-stage">
        <div className="loader-tv" aria-hidden="true">
          <div className="loader-antenna loader-antenna-left" />
          <div className="loader-antenna loader-antenna-right" />
          <div className="loader-screen">
            <span />
            <span />
            <span />
            <span />
          </div>
          <i />
          <b />
        </div>

        <div className="loader-copy">
          <strong>Tuning the station</strong>
          <span>Setting the meadow for a focused session.</span>
        </div>

        <div className="loader-progress-row">
          <div
            className="loader-progress"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress}
          >
            <span style={{ width: `${progress}%` }} />
          </div>
          <output>{progress}%</output>
        </div>
      </div>
    </div>
  )
}
