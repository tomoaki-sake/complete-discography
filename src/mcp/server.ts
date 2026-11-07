import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js"
import * as z from "zod"
import type { SpotifyApi } from "@/lib/spotify-api"

// MCP のツール定義。通信方式（stdio / HTTP）には依存しないので、
// HTTP で公開したくなったら別のエントリポイントからこれを使い回せる。
//
// Spotify Developer Terms への配慮として、Claude に返す Spotify のデータは最小限にする：
// - 作成結果はプレイリスト名・曲数・URL のみ（曲名やアルバム情報は返さない）
// - アーティストが特定できないときだけ、候補の名前と ID を返す

const MAX_CANDIDATES = 5

const normalize = (s: string) => s.normalize("NFKC").trim().toLowerCase()

const json = (value: unknown, isError = false): CallToolResult => ({
  content: [{ type: "text", text: JSON.stringify(value, null, 2) }],
  isError,
})

export const createMcpServer = (api: SpotifyApi) => {
  const server = new McpServer({
    name: "complete-discography",
    version: "0.1.0",
  })

  server.registerTool(
    "create_complete_discography_playlist",
    {
      title: "アーティストの全曲プレイリストを作成",
      description: [
        "指定したアーティストの全曲（アルバム・シングル・コンピレーション、曲名で重複除去）を集めた Spotify プレイリストを、ログイン中のユーザーのアカウントに作成する。",
        "アーティスト名だけで1人に特定できない場合はプレイリストを作らず status: 'ambiguous' と候補（name と id）を返すので、ユーザーに選んでもらってから artist_id を指定して再度呼び出すこと。",
        "曲数の多いアーティストでは完了まで数十秒かかることがある。",
      ].join("\n"),
      inputSchema: {
        artist_name: z
          .string()
          .min(1)
          .describe("アーティスト名。artist_id を指定する場合は候補の name"),
        artist_id: z
          .string()
          .optional()
          .describe("候補から選んだアーティストの Spotify ID（任意）"),
        playlist_name: z
          .string()
          .optional()
          .describe("プレイリスト名（省略時は「<アーティスト名> 全曲」）"),
        public: z
          .boolean()
          .default(false)
          .describe("公開プレイリストにするか（既定は非公開）"),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async ({ artist_name, artist_id, playlist_name, public: isPublic }) => {
      try {
        let artist: { id: string; name: string }

        if (artist_id) {
          artist = { id: artist_id, name: artist_name }
        } else {
          const results = await api.searchArtists(artist_name)
          if (results.items.length === 0) {
            return json(
              {
                status: "not_found",
                message: `「${artist_name}」に一致するアーティストが見つかりませんでした。`,
              },
              true,
            )
          }

          const exact = results.items.filter(
            (a) => normalize(a.name) === normalize(artist_name),
          )
          if (exact.length !== 1) {
            const candidates = (exact.length > 1 ? exact : results.items)
              .slice(0, MAX_CANDIDATES)
              .map((a) => ({ id: a.id, name: a.name }))
            return json({
              status: "ambiguous",
              message:
                "アーティストを1人に特定できませんでした。ユーザーに候補から選んでもらい、artist_id を指定して再度呼び出してください。",
              candidates,
            })
          }
          artist = { id: exact[0].id, name: exact[0].name }
        }

        const tracks = await api.getAllArtistTracks(artist.id)
        if (tracks.length === 0) {
          return json(
            {
              status: "no_tracks",
              message: `「${artist.name}」の楽曲が見つかりませんでした。`,
            },
            true,
          )
        }

        const name = playlist_name ?? `${artist.name} 全曲`
        const playlist = await api.createPlaylistWithTracks({
          name,
          trackUris: tracks.map((t) => t.uri),
          isPublic,
        })

        return json({
          status: "created",
          playlist_name: name,
          track_count: tracks.length,
          public: isPublic,
          url: playlist.external_urls.spotify,
        })
      } catch (error) {
        return json(
          {
            status: "error",
            message: error instanceof Error ? error.message : String(error),
          },
          true,
        )
      }
    },
  )

  return server
}
