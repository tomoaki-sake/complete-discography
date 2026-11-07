import type {
  SpotifyAlbum,
  SpotifyArtist,
  SpotifyArtistsSearchResponse,
  SpotifyPage,
  SpotifyPlaylist,
  SpotifyTrack,
  SpotifyTracksSearchResponse,
  SpotifyUserProfile,
} from "@/types/spotify"

// ブラウザ（Web アプリ）と Node（MCP サーバー）の両方から使う Spotify Web API クライアント。
// アクセストークンの取得方法だけを外から差し込む。

const spotifyDomain = new URL("https://api.spotify.com/")
const market = "JP"

type Method = "GET" | "POST" | "PUT" | "DELETE"

export type GetAccessToken = () => Promise<string>

// "2000" / "2000-05" / "2000-05-20" のいずれか（Spotify の release_date と同じ形式）
export interface ReleaseRange {
  from?: string
  to?: string
}

// release_date を比較用の "YYYY-MM-DD" にそろえる。
// 精度が年・月のときは、期間の始まりなら最初の日、終わりなら最後の日として扱う
const toDate = (date: string, edge: "start" | "end"): string => {
  const [y, m, d] = date.split("-")
  if (edge === "start") return `${y}-${m ?? "01"}-${d ?? "01"}`
  return `${y}-${m ?? "12"}-${d ?? "31"}`
}

// Spotify では発売日が分からないアルバムに "0000" が入ることがある
const isUnknownDate = (date: string | undefined) => !date || /^0000/.test(date)

// 曲名の比較用。全角半角・大文字小文字・前後の空白の違いを無視する
export const normalizeTitle = (s: string) =>
  s.normalize("NFKC").trim().toLowerCase()

export interface CreatePlaylistOptions {
  name: string
  trackUris: string[]
  isPublic?: boolean
  description?: string
}

const MAX_ATTEMPTS = 4
const MAX_RETRY_WAIT_SECONDS = 30

export const createSpotifyApi = (getAccessToken: GetAccessToken) => {
  const request = async <T>(
    endpoint: string,
    method: Method = "GET",
    body?: unknown,
  ): Promise<T> => {
    let res: Response
    for (let attempt = 1; ; attempt++) {
      const token = await getAccessToken()
      res = await fetch(spotifyDomain + endpoint, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      })

      // レート制限（429）は Retry-After の秒数だけ待ってやり直す
      if (res.status !== 429 || attempt >= MAX_ATTEMPTS) break
      const retryAfter = Number(res.headers.get("Retry-After"))
      const waitSeconds = Math.min(
        Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : attempt,
        MAX_RETRY_WAIT_SECONDS,
      )
      await new Promise((r) => setTimeout(r, waitSeconds * 1000))
    }

    if (!res.ok) {
      const detail = await res.text()
      throw new Error(
        `Spotify API ${method} ${endpoint} failed: ${res.status} ${detail}`,
      )
    }

    // プレイリスト詳細の変更などは本文なしで 200 を返すので、空なら undefined を返す
    const text = await res.text()
    return (text ? JSON.parse(text) : undefined) as T
  }

  const getMe = (): Promise<SpotifyUserProfile> =>
    request<SpotifyUserProfile>("v1/me")

  const searchArtists = async (
    query: string,
  ): Promise<SpotifyPage<SpotifyArtist>> => {
    const result = await request<SpotifyArtistsSearchResponse>(
      // 2026-02 の仕様変更で search の limit 上限は 10（デフォルト 5）
      `v1/search?q=${encodeURIComponent(query)}&type=artist&limit=10`,
    )
    return result.artists
  }

  const getArtistAlbums = async (artistId: string): Promise<SpotifyAlbum[]> => {
    const albums: SpotifyAlbum[] = []
    // include_groups: album, single, compilation, appears_onとカンマ区切りで指定するとうまく機能しないので、個別で取得する
    // ただし、appears_onはアーティストの直接の楽曲でないものも含まれるので、ひとまず取得しない仕様とする
    // https://developer.spotify.com/documentation/web-api/reference/get-an-artists-albums
    const ALBUM_TYPES = ["album", "single", "compilation"]
    for (const albumType of ALBUM_TYPES) {
      let offset = 0
      const limit = 50

      while (true) {
        const data = await request<SpotifyPage<SpotifyAlbum>>(
          `v1/artists/${artistId}/albums?include_groups=${albumType}&market=${market}&limit=${limit}&offset=${offset}`,
        )
        albums.push(...data.items)

        if (data.items.length < limit) break
        offset += limit
      }
    }

    return albums
  }

  const getAlbumTracks = async (albumId: string): Promise<SpotifyTrack[]> => {
    const tracks: SpotifyTrack[] = []
    let offset = 0
    const limit = 50
    while (true) {
      const data = await request<SpotifyPage<SpotifyTrack>>(
        `v1/albums/${albumId}/tracks?market=${market}&limit=${limit}&offset=${offset}`,
      )
      tracks.push(...data.items)

      if (data.items.length < limit) break
      offset += limit
    }
    return tracks
  }

  // 複数アーティストの曲を発売日順に集める。
  // - 同じアーティスト内で同名の曲は、一番古い発売日のもの（＝初出）だけを残す
  //   （ベスト盤・再録盤の発売日で期間判定がずれないように、初出の日付で絞り込む）
  // - 共作などで同じトラックが複数アーティストのカタログに出てくる場合は1つにまとめる
  const collectArtistsTracks = async (
    artistIds: string[],
    range: ReleaseRange = {},
  ): Promise<SpotifyTrack[]> => {
    const albumsById = new Map<string, SpotifyAlbum & { ownerId: string }>()
    for (const artistId of artistIds) {
      for (const album of await getArtistAlbums(artistId)) {
        if (!albumsById.has(album.id)) {
          albumsById.set(album.id, { ...album, ownerId: artistId })
        }
      }
    }
    // 発売日が不明（"0000" など）のアルバムは最後に回し、
    // 期間を指定したときは対象にしない（初出の判定にも使わない）
    const hasRange = Boolean(range.from || range.to)
    const albums = [...albumsById.values()]
      .filter((a) => !hasRange || !isUnknownDate(a.release_date))
      .sort(
        (a, b) =>
          Number(isUnknownDate(a.release_date)) -
            Number(isUnknownDate(b.release_date)) ||
          toDate(a.release_date, "start").localeCompare(
            toDate(b.release_date, "start"),
          ),
      )

    const from = range.from ? toDate(range.from, "start") : undefined
    const to = range.to ? toDate(range.to, "end") : undefined

    const result: SpotifyTrack[] = []
    const seenIds = new Set<string>()
    const seenNames = new Set<string>()
    for (const album of albums) {
      const released = toDate(album.release_date, "start")
      // 発売日順なので、期間の終わりを過ぎたら以降は全部対象外
      if (to && released > to) break

      for (const track of await getAlbumTracks(album.id)) {
        const nameKey = `${album.ownerId}|${normalizeTitle(track.name)}`
        if (seenIds.has(track.id) || seenNames.has(nameKey)) continue
        seenIds.add(track.id)
        // 期間より前に初出の曲も「既出」として記録し、後年の再録で入らないようにする
        seenNames.add(nameKey)
        if (from && released < from) continue
        result.push(track)
      }
    }

    return result
  }

  const getAllArtistTracks = (artistId: string): Promise<SpotifyTrack[]> =>
    collectArtistsTracks([artistId])

  const searchTracks = async (
    query: string,
    limit = 10,
  ): Promise<SpotifyTrack[]> => {
    const result = await request<SpotifyTracksSearchResponse>(
      `v1/search?q=${encodeURIComponent(query)}&type=track&market=${market}&limit=${limit}`,
    )
    return result.tracks.items
  }

  const createPlaylistWithTracks = async ({
    name,
    trackUris,
    isPublic,
    description,
  }: CreatePlaylistOptions): Promise<SpotifyPlaylist> => {
    // 2026-02 の仕様変更で /users/{id}/playlists は廃止
    const playlist = await request<SpotifyPlaylist>("v1/me/playlists", "POST", {
      name,
      ...(isPublic === undefined ? {} : { public: isPublic }),
      ...(description ? { description } : {}),
    })

    const BATCH_SIZE = 100
    for (let i = 0; i < trackUris.length; i += BATCH_SIZE) {
      const uris = trackUris.slice(i, i + BATCH_SIZE)
      // 2026-02 の仕様変更で /playlists/{id}/tracks は /items に置き換え
      await request(`v1/playlists/${playlist.id}/items`, "POST", { uris })
    }

    return playlist
  }

  // 名前・説明・公開設定を変更する（指定したものだけ）
  const updatePlaylistDetails = async (
    playlistId: string,
    details: { name?: string; description?: string; isPublic?: boolean },
  ): Promise<void> => {
    const body = {
      ...(details.name === undefined ? {} : { name: details.name }),
      ...(details.description === undefined
        ? {}
        : { description: details.description }),
      ...(details.isPublic === undefined ? {} : { public: details.isPublic }),
    }
    if (Object.keys(body).length === 0) return
    await request(`v1/playlists/${playlistId}`, "PUT", body)
  }

  // プレイリストの曲をすべて入れ替える
  const replacePlaylistTracks = async (
    playlistId: string,
    trackUris: string[],
  ): Promise<void> => {
    const BATCH_SIZE = 100
    // PUT は1回に100件まで。最初の100件で置き換え、残りは追加する。
    // 途中で失敗したときに状態がわかるよう、何曲まで反映したかをエラーに含める
    let applied = 0
    try {
      await request(`v1/playlists/${playlistId}/items`, "PUT", {
        uris: trackUris.slice(0, BATCH_SIZE),
      })
      applied = Math.min(BATCH_SIZE, trackUris.length)
      for (let i = BATCH_SIZE; i < trackUris.length; i += BATCH_SIZE) {
        const uris = trackUris.slice(i, i + BATCH_SIZE)
        await request(`v1/playlists/${playlistId}/items`, "POST", { uris })
        applied += uris.length
      }
    } catch (error) {
      const state =
        applied === 0
          ? "曲は変更されていません"
          : `先頭から ${applied} / ${trackUris.length} 曲だけが入った状態です`
      throw new Error(
        `曲の入れ替えが途中で失敗しました（${state}）: ${error instanceof Error ? error.message : error}`,
      )
    }
  }

  return {
    getMe,
    searchArtists,
    searchTracks,
    getAllArtistTracks,
    collectArtistsTracks,
    createPlaylistWithTracks,
    updatePlaylistDetails,
    replacePlaylistTracks,
  }
}

export type SpotifyApi = ReturnType<typeof createSpotifyApi>
