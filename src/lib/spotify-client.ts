import type {
  SpotifyAlbum,
  SpotifyArtist,
  SpotifyArtistsSearchResponse,
  SpotifyPage,
  SpotifyPlaylist,
  SpotifyTrack,
  SpotifyUserProfile,
} from "@/types/spotify"
import { getOrCreateAccessToken } from "./spotify-auth"

const spotifyDomain = new URL("https://api.spotify.com/")
const market = "JP"

const spotifyClient = async <T>(
  endpoint: string,
  method: "GET" | "POST" | "PUT" | "DELETE" = "GET",
  body?: any,
): Promise<T> => {
  const token = await getOrCreateAccessToken()

  const res = await fetch(spotifyDomain + endpoint, {
    method,
    headers: {
      Authorization: `Bearer ${token.access_token}`,
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

export const getMe = async (): Promise<SpotifyUserProfile | null> => {
  try {
    const user = await spotifyClient<SpotifyUserProfile>("v1/me")
    return user
  } catch (error) {
    console.error("Error getting user profile:", error)
    return null
  }
}

export const searchArtists = async (
  query: string,
): Promise<SpotifyPage<SpotifyArtist> | null> => {
  try {
    const result = await spotifyClient<SpotifyArtistsSearchResponse>(
      // 2026-02 の仕様変更で search の limit 上限は 10（デフォルト 5）
      `v1/search?q=${encodeURIComponent(query)}&type=artist&limit=10`,
    )
    return result.artists
  } catch (error) {
    console.error("Error searching artist:", error)
    return null
  }
}

const getArtistAlbums = async (artistId: string): Promise<SpotifyAlbum[]> => {
  const albums: SpotifyAlbum[] = []
  // include_groups: album, single, compilation, appears_onとカンマ区切りで指定するとうまく機能しないので、個別で取得する
  // ただし、appears_onはアーティストの直接の楽曲でないものも含まれるので、ひとまず取得しない仕様とする
  // https://developer.spotify.com/documentation/web-api/reference/get-an-artists-albums
  const ALBUM_TYPES = ["album", "single", "compilation"]
  try {
    for (const albumType of ALBUM_TYPES) {
      let offset = 0
      const limit = 50

      while (true) {
        const data = await spotifyClient<SpotifyPage<SpotifyAlbum>>(
          `v1/artists/${artistId}/albums?include_groups=${albumType}&market=${market}&limit=${limit}&offset=${offset}`,
        )
        albums.push(...data.items)

        if (data.items.length < limit) break
        offset += limit
      }
    }

    return albums
  } catch (error) {
    console.error("Error getting albums:", error)
    return []
  }
}

const getAlbumTracks = async (albumId: string): Promise<SpotifyTrack[]> => {
  const tracks: SpotifyTrack[] = []
  try {
    let offset = 0
    const limit = 50
    while (true) {
      const data = await spotifyClient<SpotifyPage<SpotifyTrack>>(
        `v1/albums/${albumId}/tracks?market=${market}&limit=${limit}&offset=${offset}`,
      )
      tracks.push(...data.items)

      if (data.items.length < limit) break
      offset += limit
    }
    return tracks
  } catch (error) {
    console.error("Error getting album tracks:", error)
    return []
  }
}

export const getAllArtistTracks = async (
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

export const createAllTracksPlayList = async (
  name: string,
  trackUris: string[],
): Promise<SpotifyPlaylist | null> => {
  try {
    const playlistOptions = { name }
    const playlist = await spotifyClient<SpotifyPlaylist>(
      // 2026-02 の仕様変更で /users/{id}/playlists は廃止
      "v1/me/playlists",
      "POST",
      playlistOptions,
    )

    if (!playlist) {
      throw new Error("Failed to create playlist")
    }

    const BATCH_SIZE = 100
    for (let i = 0; i < trackUris.length; i += BATCH_SIZE) {
      const uris = trackUris.slice(i, i + BATCH_SIZE)
      // 2026-02 の仕様変更で /playlists/{id}/tracks は /items に置き換え
      await spotifyClient(`v1/playlists/${playlist.id}/items`, "POST", {
        uris,
      })
    }

    return playlist
  } catch (error) {
    console.error("Error creating playlist:", error)
    return null
  }
}
