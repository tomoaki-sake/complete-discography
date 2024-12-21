import type { SpotifyTokens } from "@/types/spotify"

const storagePrefix = "complete-discography-"

interface StoredTokens extends SpotifyTokens {
  expires_at: number
}

const renewWindow = 2 * 60 * 1000 // 2 minutes

export const getOrCreate = async (
  createFunction: () => Promise<SpotifyTokens | undefined>,
  updateFunction?: (tokens: SpotifyTokens) => Promise<SpotifyTokens>,
): Promise<SpotifyTokens | undefined> => {
  const tokens = storage.getTokens()
  if (!tokens) {
    const newTokens = await createFunction()
    if (newTokens) storage.setTokens(newTokens)
    return newTokens
  }

  if (isTokenExpired(tokens)) {
    if (!updateFunction) {
      storage.deleteTokens()
      throw new Error("Token expired and no update function provided")
    }

    try {
      const newTokens = await updateFunction(tokens)
      if (newTokens) storage.setTokens(newTokens)
      return newTokens
    } catch (error) {
      storage.deleteTokens()
      console.error("Error refreshing token:", error)
    }
  }

  return tokens
}

const isTokenExpired = (tokens: StoredTokens): boolean => {
  return Date.now() >= tokens.expires_at - renewWindow
}

export const storage = {
  getTokens: (): StoredTokens | null => {
    if (typeof window === "undefined") return null
    const tokens = window.localStorage.getItem(`${storagePrefix}tokens`)
    return tokens ? JSON.parse(tokens) : null
  },
  setTokens: (tokens: SpotifyTokens) => {
    if (typeof window === "undefined") return
    const storedTokens: StoredTokens = {
      ...tokens,
      expires_at: Date.now() + tokens.expires_in * 1000,
    }
    window.localStorage.setItem(
      `${storagePrefix}tokens`,
      JSON.stringify(storedTokens),
    )
  },
  deleteTokens: () => {
    if (typeof window === "undefined") return
    window.localStorage.removeItem(`${storagePrefix}tokens`)
  },
  getCodeVerifier: () => {
    const codeVerifier = window
      ? window.localStorage.getItem(`${storagePrefix}code-verifier`)
      : null
    return codeVerifier
  },
  setCodeVerifier: (codeVerifier: string) => {
    if (typeof window === "undefined") return
    window.localStorage.setItem(`${storagePrefix}code-verifier`, codeVerifier)
  },
  deleteCodeVerifier: () => {
    if (typeof window === "undefined") return
    window.localStorage.removeItem(`${storagePrefix}code-verifier`)
  },
}
