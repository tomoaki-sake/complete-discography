import { existsSync } from "node:fs"
import { homedir } from "node:os"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

// Claude Code から起動されるときのカレントディレクトリはリポジトリとは限らないので、
// このファイルの位置からリポジトリルートを求めて .env.local を読む
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..")
const envFile = join(repoRoot, ".env.local")
if (existsSync(envFile)) process.loadEnvFile(envFile)

export const CLIENT_ID = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID ?? ""

// Spotify Developer Dashboard の Redirect URIs にも同じ値を登録する
export const LOGIN_PORT = 8888
export const REDIRECT_URI = `http://127.0.0.1:${LOGIN_PORT}/callback`

// MCP ではプレイリスト作成に必要な権限だけを要求する（プロフィールやメールは不要）
export const SCOPES = ["playlist-modify-public", "playlist-modify-private"]

export const CONFIG_DIR = join(
  process.env.XDG_CONFIG_HOME ?? join(homedir(), ".config"),
  "complete-discography",
)
export const TOKEN_FILE = join(CONFIG_DIR, "tokens.json")

export const TOKEN_URL = "https://accounts.spotify.com/api/token"
export const AUTHORIZE_URL = "https://accounts.spotify.com/authorize"

export const assertClientId = () => {
  if (!CLIENT_ID) {
    throw new Error(
      `NEXT_PUBLIC_SPOTIFY_CLIENT_ID が設定されていません（${envFile} を確認してください）`,
    )
  }
}
