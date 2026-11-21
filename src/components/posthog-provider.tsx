import type { ReactNode } from "react"
import type { PostHogConfig } from "posthog-js"
import { PostHogProvider as Provider } from "posthog-js/react"

const apiKey = import.meta.env.VITE_POSTHOG_KEY

const options: Partial<PostHogConfig> = {
  api_host: import.meta.env.VITE_POSTHOG_HOST || "https://us.i.posthog.com",
  defaults: "2025-05-24",
  person_profiles: "identified_only",
  capture_exceptions: true,
  debug: import.meta.env.DEV,
}

type PostHogProviderProps = {
  children: ReactNode
}

export function PostHogProvider({ children }: PostHogProviderProps) {
  if (!apiKey) return children

  return (
    <Provider apiKey={apiKey} options={options}>
      {children}
    </Provider>
  )
}
