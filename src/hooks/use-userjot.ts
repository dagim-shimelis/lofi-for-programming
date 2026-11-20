import { useCallback, useEffect } from "react"

const USERJOT_PROJECT_ID = "cmwot7b480syz0lmmos4pmuj2"
const USERJOT_SCRIPT_URL = "https://cdn.userjot.com/sdk/v3/uj.js"

type UserJotOpenTarget = {
  to: "feedback"
  compose?: boolean
}

type UserJotSdk = {
  init: (
    projectId: string,
    options?: {
      widget?: {
        launcher?: boolean
        position?: "left" | "right"
        theme?: "auto" | "light" | "dark"
      }
    },
  ) => void
  open: (target?: UserJotOpenTarget) => void | Promise<void>
}

type UserJotQueueItem = [method: string, ...args: unknown[]]

declare global {
  interface Window {
    uj?: UserJotSdk
    $ujq?: UserJotQueueItem[]
  }
}

let hasInitializedUserJot = false

function ensureUserJotProxy() {
  if (window.uj) return

  window.uj = new Proxy({} as UserJotSdk, {
    get: (_target, property) => {
      if (property === "then") return undefined

      return (...args: unknown[]) => {
        window.$ujq ??= []
        window.$ujq.push([String(property), ...args])
      }
    },
  })
}

function loadUserJot() {
  ensureUserJotProxy()

  if (!document.querySelector(`script[src="${USERJOT_SCRIPT_URL}"]`)) {
    const script = document.createElement("script")
    script.type = "module"
    script.async = true
    script.src = USERJOT_SCRIPT_URL
    document.head.append(script)
  }

  if (!hasInitializedUserJot) {
    window.uj?.init(USERJOT_PROJECT_ID, {
      widget: {
        launcher: false,
        position: "right",
        theme: "auto",
      },
    })
    hasInitializedUserJot = true
  }
}

export function useUserJot() {
  useEffect(() => {
    loadUserJot()
  }, [])

  const openFeedback = useCallback(() => {
    loadUserJot()
    void window.uj?.open({ to: "feedback", compose: true })
  }, [])

  return { openFeedback }
}
