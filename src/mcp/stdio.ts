import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js"
import { createSpotifyApi } from "../lib/spotify-api"
import { assertClientId } from "./config"
import { createMcpServer } from "./server"
import { getAccessToken } from "./token-store"

// stdio で MCP サーバーを起動するエントリポイント（Claude Code から起動される）。
// 標準出力は MCP の通信に使うので、ログは必ず標準エラー（console.error）に出すこと。

const main = async () => {
  assertClientId()
  const server = createMcpServer(createSpotifyApi(getAccessToken))
  await server.connect(new StdioServerTransport())
  console.error("complete-discography MCP server running on stdio")
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
