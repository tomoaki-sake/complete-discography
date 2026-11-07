import { chmod, mkdir, readFile, rm, writeFile } from "node:fs/promises"
import type { SpotifyTokens } from "@/types/spotify"
import { CLIENT_ID, CONFIG_DIR, TOKEN_FILE, TOKEN_URL } from "./config"

interface StoredTokens {
  access_token: string
  refresh_token: string
  scope: string
  expires_at: number
}

const RENEW_WINDOW_MS = 2 * 60 * 1000

export class NotLoggedInError extends Error {
  constructor() {
    super(
      "Spotify にログインしていません。リポジトリで `pnpm mcp:login` を実行してください。",
    )
  }
}

const readTokens = async (): Promise<StoredTokens | null> => {
  try {
    return JSON.parse(await readFile(TOKEN_FILE, "utf8"))
  } catch {
    return null
  }
}

export const saveTokens = async (
  tokens: SpotifyTokens,
  previousRefreshToken?: string,
): Promise<StoredTokens> => {
  const stored: StoredTokens = {
    access_token: tokens.access_token,
    // リフレッシュ時は refresh_token が返らないことがあるので、その場合は以前のものを使う
    refresh_token: tokens.refresh_token ?? previousRefreshToken ?? "",
    scope: tokens.scope,
    expires_at: Date.now() + tokens.expires_in * 1000,
  }
  await mkdir(CONFIG_DIR, { recursive: true, mode: 0o700 })
  await writeFile(TOKEN_FILE, JSON.stringify(stored, null, 2), { mode: 0o600 })
  await chmod(TOKEN_FILE, 0o600)
  return stored
}

export const deleteTokens = async () => {
  await rm(TOKEN_FILE, { force: true })
}

const refresh = async (refreshToken: string): Promise<StoredTokens> => {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: CLIENT_ID,
    }),
  })
  if (!res.ok) {
    // refresh token が失効している（連携解除された等）場合は再ログインが必要
    if (res.status === 400) {
      await deleteTokens()
      throw new NotLoggedInError()
    }
    throw new Error(`トークンの更新に失敗しました: ${res.status}`)
  }
  return saveTokens(await res.json(), refreshToken)
}

// 同時に複数の呼び出しがあってもリフレッシュは1回にまとめる
let pending: Promise<string> | null = null

export const getAccessToken = (): Promise<string> => {
  if (!pending) {
    pending = (async () => {
      const tokens = await readTokens()
      if (!tokens?.refresh_token) throw new NotLoggedInError()
      if (Date.now() < tokens.expires_at - RENEW_WINDOW_MS) {
        return tokens.access_token
      }
      return (await refresh(tokens.refresh_token)).access_token
    })().finally(() => {
      pending = null
    })
  }
  return pending
}
