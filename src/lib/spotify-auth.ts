import type { SpotifyTokens } from "@/types/spotify"
import {
  generateCodeChallenge,
  generateCodeVerifier,
} from "@/utils/codechallenge-generator"
import { post } from "@/utils/http"
import { getOrCreate, storage } from "@/utils/storage"

const CLIENT_ID = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID || ""
const SERVICE_DOMAIN = process.env.NEXT_PUBLIC_SERVICE_DOMAIN || ""

const scopes = [
  "user-read-private",
  "user-read-email",
  "playlist-modify-public",
  "playlist-modify-private",
]
const scope = scopes.join(" ")
const authUrl = new URL("https://accounts.spotify.com/authorize")
const tokenUrl = new URL("https://accounts.spotify.com/api/token")

export const getOrCreateAccessToken = async (): Promise<SpotifyTokens> => {
  const token = await getOrCreate(createAccessToken, refreshAccessToken)
  if (!token) throw new Error("Failed to get access token")

  return token
}

const createAccessToken = async (): Promise<SpotifyTokens | undefined> => {
  const { code } = getRedirectParams()
  if (!code) {
    await requestUserAuthorization()
    return
  }

  const tokens = await getTokens(code)
  removeCodeFromUrl()
  return tokens
}

const requestUserAuthorization = async (): Promise<void> => {
  const codeVerifier = generateCodeVerifier()
  storage.setCodeVerifier(codeVerifier)
  const codeChallenge = await generateCodeChallenge(codeVerifier)

  const params = {
    response_type: "code",
    client_id: CLIENT_ID,
    scope,
    code_challenge_method: "S256",
    code_challenge: codeChallenge,
    redirect_uri: SERVICE_DOMAIN,
  }

  authUrl.search = new URLSearchParams(params).toString()
  window.location.href = authUrl.toString()
}

const getRedirectParams = () => {
  const params = new URLSearchParams(window.location.search)
  const code = params.get("code")
  const state = params.get("state")
  const error = params.get("error")

  return { code, state, error }
}

const getTokens = async (code: string): Promise<SpotifyTokens> => {
  const codeVerifier = storage.getCodeVerifier()
  if (!codeVerifier) throw new Error("Code verifier not found")

  const headers = {
    "Content-Type": "application/x-www-form-urlencoded",
  }

  const payload = new URLSearchParams({
    client_id: CLIENT_ID,
    grant_type: "authorization_code",
    code,
    redirect_uri: SERVICE_DOMAIN,
    code_verifier: codeVerifier ?? "",
  })

  const response = await post({
    url: tokenUrl.toString(),
    body: payload,
    headers,
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error_description)
  }
  const tokens = await response.json()
  return tokens
}

const removeCodeFromUrl = () => {
  const url = new URL(window.location.href)
  url.searchParams.delete("code")

  const newUrl = url.search ? url.href : url.href.replace("?", "")
  window.history.replaceState({}, document.title, newUrl)
}

const refreshAccessToken = async (
  cachedTokens: SpotifyTokens,
): Promise<SpotifyTokens> => {
  if (!cachedTokens?.refresh_token) {
    throw new Error("No refresh token available")
  }

  const payload = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: cachedTokens.refresh_token,
    client_id: CLIENT_ID,
  })

  const response = await post({
    url: tokenUrl.toString(),
    body: payload,
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
  })

  if (!response.ok) {
    throw new Error("Failed to refresh token")
  }

  const tokens: SpotifyTokens = await response.json()
  return tokens
}

export const logout = () => {
  storage.deleteCodeVerifier()
  storage.deleteTokens()
}
