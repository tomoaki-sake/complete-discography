import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js"
import * as z from "zod"
import type { SpotifyApi } from "../lib/spotify-api"
import { normalizeTitle } from "../lib/spotify-api"
import { compactTitle, createSongMatcher, type SongQuery } from "./song-matcher"

// MCP のツール定義。通信方式（stdio / HTTP）には依存しないので、
// HTTP で公開したくなったら別のエントリポイントからこれを使い回せる。
//
// Spotify Developer Terms への配慮として、Claude に返す Spotify のデータは最小限にする：
// - 作成結果はプレイリスト名・曲数・URL のみ（Spotify 上の曲名やアルバム情報は返さない）
// - アーティストが特定できないときだけ、候補の名前と ID を返す
// - 曲リストから作るときに見つからなかった曲・近似で選んだ曲は、Claude から受け取った曲名をそのまま返す

const MAX_CANDIDATES = 5
const MAX_SONGS = 300

const json = (value: unknown, isError = false): CallToolResult => ({
  content: [{ type: "text", text: JSON.stringify(value, null, 2) }],
  isError,
})

const errorResult = (error: unknown) =>
  json(
    {
      status: "error",
      message: error instanceof Error ? error.message : String(error),
    },
    true,
  )

const releaseDate = z
  .string()
  .regex(/^\d{4}(-\d{2}(-\d{2})?)?$/, "YYYY / YYYY-MM / YYYY-MM-DD の形式")

type ArtistResolution =
  | { kind: "resolved"; id: string; name: string }
  | { kind: "not_found"; query: string }
  | {
      kind: "ambiguous"
      query: string
      candidates: { id: string; name: string }[]
    }

const resolveArtist = async (
  api: SpotifyApi,
  input: { name: string; id?: string },
): Promise<ArtistResolution> => {
  if (input.id) return { kind: "resolved", id: input.id, name: input.name }

  const results = await api.searchArtists(input.name)
  if (results.items.length === 0)
    return { kind: "not_found", query: input.name }

  const exact = results.items.filter(
    // 曲リストの照合（song-matcher）と同じ基準でアーティスト名を比べる
    (a) => compactTitle(a.name) === compactTitle(input.name),
  )
  if (exact.length === 1) {
    return { kind: "resolved", id: exact[0].id, name: exact[0].name }
  }
  return {
    kind: "ambiguous",
    query: input.name,
    candidates: (exact.length > 1 ? exact : results.items)
      .slice(0, MAX_CANDIDATES)
      .map((a) => ({ id: a.id, name: a.name })),
  }
}

const periodLabel = (from?: string, to?: string) => {
  if (!from && !to) return ""
  return ` (${from ?? ""}〜${to ?? ""})`
}

export const createMcpServer = (api: SpotifyApi) => {
  const server = new McpServer({
    name: "complete-discography",
    version: "0.2.0",
  })

  server.registerTool(
    "create_complete_discography_playlist",
    {
      title: "アーティストの全曲プレイリストを作成",
      description: [
        "指定したアーティスト（複数可）の曲を、Spotify 上のアルバム・シングル・コンピレーションから漏れなく集めてプレイリストを作る。発売日順に並び、同じ曲は初出のものだけを入れる。",
        "released_from / released_to で発売期間を絞り込める（初出の発売日で判定するので、ベスト盤や再録で後年に出た曲は元の年で扱われる）。",
        "「◯◯の全曲」「AとBの曲を1つに」「◯◯の2000年代の曲」のように、条件で機械的に集めたいときに使う。セットリストや気分など、曲を選んで作りたいときは create_playlist_from_songs を使う。",
        "アーティスト名だけで1人に特定できない場合はプレイリストを作らず status: 'ambiguous' と候補（name と id）を返すので、ユーザーに選んでもらってから、その artist の id を指定して再度呼び出すこと。",
        "曲数の多いアーティストでは完了まで数十秒かかることがある。",
      ].join("\n"),
      inputSchema: {
        artists: z
          .array(
            z.object({
              name: z.string().min(1).describe("アーティスト名"),
              id: z
                .string()
                .optional()
                .describe("候補から選んだアーティストの Spotify ID（任意）"),
            }),
          )
          .min(1)
          .max(10)
          .describe("対象のアーティスト（1〜10組）"),
        released_from: releaseDate
          .optional()
          .describe("この日以降に初出の曲だけを入れる（例: 2000, 2000-04）"),
        released_to: releaseDate
          .optional()
          .describe("この日までに初出の曲だけを入れる（例: 2009, 2009-12-31）"),
        playlist_name: z
          .string()
          .optional()
          .describe(
            "プレイリスト名（省略時は「<アーティスト名> 全曲」に期間を付けたもの）",
          ),
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
    async ({
      artists,
      released_from,
      released_to,
      playlist_name,
      public: isPublic,
    }) => {
      try {
        if (
          released_from &&
          released_to &&
          released_from.padEnd(10, "0") > released_to.padEnd(10, "9")
        ) {
          return json(
            {
              status: "error",
              message: "released_from が released_to より後になっています。",
            },
            true,
          )
        }

        const resolutions = await Promise.all(
          artists.map((a) => resolveArtist(api, a)),
        )

        const notFound = resolutions.filter((r) => r.kind === "not_found")
        if (notFound.length > 0) {
          return json(
            {
              status: "not_found",
              message: "見つからなかったアーティストがあります。",
              artists: notFound.map((r) => r.query),
            },
            true,
          )
        }

        const ambiguous = resolutions.filter((r) => r.kind === "ambiguous")
        if (ambiguous.length > 0) {
          return json({
            status: "ambiguous",
            message:
              "1人に特定できないアーティストがあります。ユーザーに候補から選んでもらい、そのアーティストの id を指定して再度呼び出してください。",
            artists: ambiguous.map((r) => ({
              query: r.query,
              candidates: r.candidates,
            })),
          })
        }

        const resolved = resolutions.filter((r) => r.kind === "resolved")
        const tracks = await api.collectArtistsTracks(
          resolved.map((r) => r.id),
          { from: released_from, to: released_to },
        )
        if (tracks.length === 0) {
          return json(
            {
              status: "no_tracks",
              message: "条件に合う曲が見つかりませんでした。",
            },
            true,
          )
        }

        const name =
          playlist_name ??
          `${resolved.map((r) => r.name).join(" × ")} 全曲${periodLabel(released_from, released_to)}`
        const playlist = await api.createPlaylistWithTracks({
          name,
          trackUris: tracks.map((t) => t.uri),
          isPublic,
        })

        return json({
          status: "created",
          playlist_name: name,
          playlist_id: playlist.id,
          track_count: tracks.length,
          public: isPublic,
          url: playlist.external_urls.spotify,
        })
      } catch (error) {
        return errorResult(error)
      }
    },
  )

  // セットリストの命名規則（ユーザーが普段手で付けている形に合わせる）
  const SETLIST_NAMING = [
    "セットリストの playlist_name は「<出演者> <公演名>@<会場> <YYYY-MM-DD>」の形にする。@ は半角（全角の＠にしない）。日付は月日を2桁にそろえる。",
    "出演者:",
    "- 先頭はプレイリストに曲が入っているアーティスト（公演の表記順や主催者順ではない）。",
    "- 対バン（2〜3組程度）なら、その後に対バン相手を全組、半角スペース区切りで並べる。",
    "- フェスや複数日・多数出演の企画なら、曲が入っているアーティストだけにする。",
    "公演名:",
    "- ツアー名・周年・企画名など、公演タイトルとして関係する部分はなるべく全部入れる（例: 「SHINJUKU LOFT 50th ANNIVERSARY × EMERGE & RISE」）。",
    "- 「日台音楽交流 3DAYS」のような、公演の説明にあたる部分は入れない。",
    "- 複数日の企画・フェスで日ごとに出演者が違う場合は、公演名の後に何日目かを DAY2 のように入れる。",
    "例: 「cinema staff plenty BATTLE OF LIQUID@恵比寿LIQUIDROOM 2026-11-01」（cinema staff の曲。対バン）",
    "例: 「the cabs NOMELON NOLEMON CANVS@大阪BIGCAT 2026-11-03」（NOMELON NOLEMON 主催の公演だが、曲は the cabs のセトリ）",
    "例: 「österreich SHINJUKU LOFT 50th ANNIVERSARY × EMERGE & RISE DAY2@新宿LOFT 2026-11-05」（複数日の企画。出演者はメインのみ）",
    "日付や公演名が分からなければ Web で調べ、それでも分からなければユーザーに聞く。",
  ].join("\n")

  const songsSchema = z
    .array(
      z.object({
        title: z.string().min(1).describe("曲名"),
        artist: z
          .string()
          .min(1)
          .describe("その曲のアーティスト名（カバー曲なら演奏者）"),
      }),
    )
    .min(1)
    .max(MAX_SONGS)
    .describe("曲のリスト（この順番で並ぶ）")

  type SongRef = SongQuery & { position: number }

  // 曲リストを Spotify のトラックに対応づける。
  // 返す not_found / approximate_matches は入力された曲名そのもの（Spotify のデータではない）
  const resolveSongs = async (songs: SongQuery[]) => {
    const matcher = createSongMatcher(api)
    const uris: string[] = []
    const notFound: SongRef[] = []
    const approximate: SongRef[] = []
    // 同じ曲が繰り返し出てきたときに検索し直さない
    const cache = new Map<
      string,
      { uri: string; approximate: boolean } | null
    >()

    for (const [i, song] of songs.entries()) {
      const key = `${normalizeTitle(song.title)}|${normalizeTitle(song.artist)}`
      let match = cache.get(key)
      if (match === undefined) {
        const found = await matcher.find(song)
        match = found
          ? { uri: found.track.uri, approximate: found.approximate }
          : null
        cache.set(key, match)
      }
      const ref = { position: i + 1, ...song }
      if (!match) {
        notFound.push(ref)
        continue
      }
      uris.push(match.uri)
      if (match.approximate) approximate.push(ref)
    }

    return { uris, notFound, approximate }
  }

  const matchReport = (
    requested: number,
    resolved: Awaited<ReturnType<typeof resolveSongs>>,
  ) => ({
    requested_count: requested,
    added_count: resolved.uris.length,
    not_found: resolved.notFound,
    approximate_matches: resolved.approximate,
    ...(resolved.approximate.length > 0
      ? {
          note: "approximate_matches の曲は、曲名が完全には一致せず近い曲名で選んだもの。違う曲が入っていないか Spotify で確認するようユーザーに伝えること。",
        }
      : {}),
  })

  server.registerTool(
    "create_playlist_from_songs",
    {
      title: "曲リストからプレイリストを作成",
      description: [
        "曲名とアーティスト名のリストから、その順番どおりにプレイリストを新しく作る。同じ曲が複数回あればそのまま複数回入る。",
        "ライブのセットリスト（テキスト・画像から読み取ったもの・Web で調べたもの）、ユーザーとの会話で選んだ曲、気分に合わせて選んだ曲などに使う。",
        "曲名は表記ゆれ（中黒・記号の有無、正式名の一部だけ など）もある程度吸収する。近い曲名で選んだ曲は approximate_matches、見つからなかった曲は not_found として返す。",
        "作ったプレイリストを直したいとき（曲名を直して入れ直す、名前を変える）は、新しく作らずに update_playlist を使うこと（同じプレイリストが重複するため）。",
        SETLIST_NAMING,
        "SE や MC は曲として渡さないこと。",
      ].join("\n"),
      inputSchema: {
        playlist_name: z.string().min(1).describe("プレイリスト名"),
        songs: songsSchema,
        description: z
          .string()
          .max(300)
          .optional()
          .describe("プレイリストの説明（任意）"),
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
    async ({ playlist_name, songs, description, public: isPublic }) => {
      try {
        const resolved = await resolveSongs(songs)
        if (resolved.uris.length === 0) {
          return json(
            {
              status: "no_tracks",
              message:
                "どの曲も Spotify で見つからなかったため、プレイリストは作成していません。",
              not_found: resolved.notFound,
            },
            true,
          )
        }

        const playlist = await api.createPlaylistWithTracks({
          name: playlist_name,
          trackUris: resolved.uris,
          isPublic,
          description,
        })

        return json({
          status: "created",
          playlist_name,
          playlist_id: playlist.id,
          ...matchReport(songs.length, resolved),
          public: isPublic,
          url: playlist.external_urls.spotify,
        })
      } catch (error) {
        return errorResult(error)
      }
    },
  )

  server.registerTool(
    "update_playlist",
    {
      title: "プレイリストを修正",
      description: [
        "このツールで作ったプレイリスト（ユーザー自身のプレイリスト）の名前・説明・公開設定を変える、または曲を入れ替える。",
        "songs を指定すると、プレイリストの曲をすべてそのリストで置き換える（追記ではない）。曲名を直して入れ直すときは、直した曲だけでなく全曲を順番どおりに渡すこと。",
        "既存の曲を置き換える操作なので、実行前にどのプレイリストをどう変えるかユーザーに確認すること。",
        "見つからない曲が1曲でもあると、既定では何も変更せず status: 'needs_confirmation' と not_found を返す。曲名を直して呼び直すか、見つからない曲を除いて置き換えてよいとユーザーが了承した場合だけ allow_partial: true で呼び直すこと。",
        SETLIST_NAMING,
      ].join("\n"),
      inputSchema: {
        playlist: z
          .string()
          .min(1)
          .describe(
            "対象プレイリストの URL（https://open.spotify.com/playlist/...）または ID",
          ),
        name: z.string().min(1).optional().describe("新しい名前（任意）"),
        description: z
          .string()
          .max(300)
          .optional()
          .describe("新しい説明（任意）"),
        public: z.boolean().optional().describe("公開設定を変える場合に指定"),
        songs: songsSchema
          .optional()
          .describe("指定すると曲をすべてこのリストで置き換える（任意）"),
        allow_partial: z
          .boolean()
          .default(false)
          .describe(
            "見つからない曲があっても、見つかった曲だけで置き換える（ユーザーが了承した場合のみ true）",
          ),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({
      playlist,
      name,
      description,
      public: isPublic,
      songs,
      allow_partial,
    }) => {
      try {
        const playlistId = parsePlaylistId(playlist)
        if (!playlistId) {
          return json(
            {
              status: "error",
              message: "プレイリストの URL または ID として解釈できません。",
            },
            true,
          )
        }
        if (
          name === undefined &&
          description === undefined &&
          isPublic === undefined &&
          songs === undefined
        ) {
          return json(
            { status: "error", message: "変更する内容がありません。" },
            true,
          )
        }

        // 曲の照合を先に済ませ、何かを変える前に問題がないか確かめる
        const resolved = songs ? await resolveSongs(songs) : undefined
        if (resolved && resolved.uris.length === 0) {
          return json(
            {
              status: "no_tracks",
              message:
                "どの曲も Spotify で見つからなかったため、プレイリストは変更していません。",
              not_found: resolved.notFound,
            },
            true,
          )
        }
        // 一部の曲が見つからないまま置き換えると、もとから入っていた正しい曲が消えるので確認を挟む
        if (resolved && resolved.notFound.length > 0 && !allow_partial) {
          return json({
            status: "needs_confirmation",
            message:
              "見つからない曲があるため、プレイリストは変更していません。曲名を直して呼び直すか、見つからない曲を除いて置き換えてよいかユーザーに確認し、了承されたら allow_partial: true で呼び直してください。",
            ...matchReport(songs?.length ?? 0, resolved),
          })
        }

        // 曲の入れ替え → 名前などの変更の順に行い、途中で失敗したらどこまで反映したかを返す
        const done: string[] = []
        try {
          if (resolved) {
            await api.replacePlaylistTracks(playlistId, resolved.uris)
            done.push("曲の入れ替え")
          }
          await api.updatePlaylistDetails(playlistId, {
            name,
            description,
            isPublic,
          })
        } catch (error) {
          return json(
            {
              status: "partial_failure",
              message: `更新が途中で失敗しました。${done.length > 0 ? `完了: ${done.join("・")}。` : ""}${error instanceof Error ? error.message : String(error)}`,
              playlist_id: playlistId,
              url: `https://open.spotify.com/playlist/${playlistId}`,
            },
            true,
          )
        }

        return json({
          status: "updated",
          playlist_id: playlistId,
          ...(name === undefined ? {} : { playlist_name: name }),
          ...(isPublic === undefined ? {} : { public: isPublic }),
          ...(resolved && songs ? matchReport(songs.length, resolved) : {}),
          url: `https://open.spotify.com/playlist/${playlistId}`,
        })
      } catch (error) {
        return errorResult(error)
      }
    },
  )

  return server
}

// Spotify の ID は 22 文字の英数字（base62）
const SPOTIFY_ID = "[A-Za-z0-9]{22}"

// プレイリストの URL / URI / ID から ID を取り出す。
// 対応する形:
// - https://open.spotify.com/playlist/<id>（?si=... 付き、/intl-ja/ 付きも可）
// - https://open.spotify.com/user/<user>/playlist/<id>（旧形式）
// - spotify:playlist:<id> / spotify:user:<user>:playlist:<id>
// - <id>（22 文字の英数字）
export const parsePlaylistId = (input: string): string | null => {
  const s = input.trim()
  const fromUrl = s.match(
    new RegExp(
      `^https?://open\\.spotify\\.com/(?:intl-[\\w-]+/)?(?:user/[^/]+/)?playlist/(${SPOTIFY_ID})(?:[/?#].*)?$`,
    ),
  )
  if (fromUrl) return fromUrl[1]
  const fromUri = s.match(
    new RegExp(`^spotify:(?:user:[^:]+:)?playlist:(${SPOTIFY_ID})$`),
  )
  if (fromUri) return fromUri[1]
  return new RegExp(`^${SPOTIFY_ID}$`).test(s) ? s : null
}
