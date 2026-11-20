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
      aria-label={`Loading Meadow FM: ${progress}%`}
    >
      <div className="loader-stage">
        <img
          className="loader-tv-image"
          src="/assets/loader-tv.webp"
          alt=""
          aria-hidden="true"
        />

        <div
          className="loader-progress"
          role="progressbar"
          aria-label="Loading page assets"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progress}
        >
          <span style={{ width: `${progress}%` }} />
        </div>
      </div>
    </div>
  )
}
