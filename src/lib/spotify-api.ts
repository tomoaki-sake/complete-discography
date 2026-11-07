import type {
  SpotifyAlbum,
  SpotifyArtist,
  SpotifyArtistsSearchResponse,
  SpotifyPage,
  SpotifyPlaylist,
  SpotifyTrack,
  SpotifyUserProfile,
} from "@/types/spotify"

// ブラウザ（Web アプリ）と Node（MCP サーバー）の両方から使う Spotify Web API クライアント。
// アクセストークンの取得方法だけを外から差し込む。

const spotifyDomain = new URL("https://api.spotify.com/")
const market = "JP"

type Method = "GET" | "POST" | "PUT" | "DELETE"

export type GetAccessToken = () => Promise<string>

export interface CreatePlaylistOptions {
  name: string
  trackUris: string[]
  isPublic?: boolean
}

export const createSpotifyApi = (getAccessToken: GetAccessToken) => {
  const request = async <T>(
    endpoint: string,
    method: Method = "GET",
    body?: unknown,
  ): Promise<T> => {
    const token = await getAccessToken()

    const res = await fetch(spotifyDomain + endpoint, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    })

    if (!res.ok) {
      const detail = await res.text()
      throw new Error(
        `Spotify API ${method} ${endpoint} failed: ${res.status} ${detail}`,
      )
    }

    return res.json()
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

  const getAllArtistTracks = async (
    artistId: string,
  ): Promise<SpotifyTrack[]> => {
    const albums = await getArtistAlbums(artistId)
    const allTracks: SpotifyTrack[] = []
    const trackNames = new Set<string>()

    for (const album of albums) {
      const tracks = await getAlbumTracks(album.id)
      for (const track of tracks) {
        if (!trackNames.has(track.name)) {
          trackNames.add(track.name)
          allTracks.push(track)
        }
      }
    }

    return allTracks
  }

  const createPlaylistWithTracks = async ({
    name,
    trackUris,
    isPublic,
  }: CreatePlaylistOptions): Promise<SpotifyPlaylist> => {
    // 2026-02 の仕様変更で /users/{id}/playlists は廃止
    const playlist = await request<SpotifyPlaylist>(
      "v1/me/playlists",
      "POST",
      isPublic === undefined ? { name } : { name, public: isPublic },
    )

    const BATCH_SIZE = 100
    for (let i = 0; i < trackUris.length; i += BATCH_SIZE) {
      const uris = trackUris.slice(i, i + BATCH_SIZE)
      // 2026-02 の仕様変更で /playlists/{id}/tracks は /items に置き換え
      await request(`v1/playlists/${playlist.id}/items`, "POST", { uris })
    }

    return playlist
  }

  return {
    getMe,
    searchArtists,
    getAllArtistTracks,
    createPlaylistWithTracks,
  }
}

export type SpotifyApi = ReturnType<typeof createSpotifyApi>
