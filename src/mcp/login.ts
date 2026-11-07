import { spawn } from "node:child_process"
import { randomBytes } from "node:crypto"
import { createServer } from "node:http"
import {
  generateCodeChallenge,
  generateCodeVerifier,
} from "../utils/codechallenge-generator"
import {
  AUTHORIZE_URL,
  assertClientId,
  CLIENT_ID,
  LOGIN_PORT,
  REDIRECT_URI,
  SCOPES,
  TOKEN_FILE,
  TOKEN_URL,
} from "./config"
import { saveTokens } from "./token-store"

// `pnpm mcp:login`
// Authorization Code + PKCE でログインし、トークンをローカルに保存する。
// コールバックは 127.0.0.1 のループバックだけで受け取る。

const TIMEOUT_MS = 5 * 60 * 1000

const main = async () => {
  assertClientId()

  const verifier = generateCodeVerifier()
  const challenge = await generateCodeChallenge(verifier)
  const state = randomBytes(16).toString("hex")

  const authUrl = new URL(AUTHORIZE_URL)
  authUrl.search = new URLSearchParams({
    response_type: "code",
    client_id: CLIENT_ID,
    scope: SCOPES.join(" "),
    code_challenge_method: "S256",
    code_challenge: challenge,
    redirect_uri: REDIRECT_URI,
    state,
  }).toString()

  const code = await new Promise<string>((resolve, reject) => {
    const server = createServer((req, res) => {
      const url = new URL(req.url ?? "/", REDIRECT_URI)
      if (url.pathname !== "/callback") {
        res.writeHead(404).end()
        return
      }

      const finish = (status: number, message: string, error?: Error) => {
        res.writeHead(status, { "Content-Type": "text/plain; charset=utf-8" })
        res.end(message)
        clearTimeout(timer)
        server.close()
        if (error) reject(error)
      }

      if (url.searchParams.get("state") !== state) {
        finish(400, "state が一致しません。", new Error("state mismatch"))
        return
      }
      const error = url.searchParams.get("error")
      if (error) {
        finish(400, `認可されませんでした: ${error}`, new Error(error))
        return
      }
      const code = url.searchParams.get("code")
      if (!code) {
        finish(400, "code がありません。", new Error("missing code"))
        return
      }
      finish(200, "ログインしました。このタブは閉じて構いません。")
      resolve(code)
    })

    const timer = setTimeout(() => {
      server.close()
      reject(new Error("ログインがタイムアウトしました"))
    }, TIMEOUT_MS)

    server.on("error", reject)
    server.listen(LOGIN_PORT, "127.0.0.1", () => {
      console.log("ブラウザで Spotify の認可画面を開きます…")
      console.log(`開かない場合はこの URL を開いてください:\n${authUrl}\n`)
      if (process.platform === "darwin") {
        spawn("open", [authUrl.toString()], { stdio: "ignore" })
      }
    })
  })

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: REDIRECT_URI,
      client_id: CLIENT_ID,
      code_verifier: verifier,
    }),
  })
  if (!res.ok) {
    throw new Error(`トークンの取得に失敗しました: ${await res.text()}`)
  }

  await saveTokens(await res.json())
  console.log(`ログインしました。トークンを保存しました: ${TOKEN_FILE}`)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
