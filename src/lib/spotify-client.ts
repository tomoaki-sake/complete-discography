import {
  type Artist,
  type Page,
  type SimplifiedAlbum,
  type SimplifiedTrack,
  SpotifyApi,
  type UserProfile,
} from "@spotify/web-api-ts-sdk"

const CLIENT_ID = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID || ""
const SERVICE_DOMAIN = process.env.NEXT_PUBLIC_SERVICE_DOMAIN || ""
const scopes = [
  "user-read-private",
  "user-read-email",
  "playlist-modify-public",
  "playlist-modify-private",
]

const spotifyService = SpotifyApi.withUserAuthorization(
  CLIENT_ID,
  SERVICE_DOMAIN,
  scopes,
)
const market = "JP"

export const getMe = async (): Promise<UserProfile | null> => {
  try {
    const user = await spotifyService.currentUser.profile()
    return user
  } catch (error) {
    console.error("Error getting user profile:", error)
    return null
  }
}

export const logout = (): void => {
  spotifyService.logOut()
}

export const searchArtists = async (
  query: string,
): Promise<Page<Artist> | null> => {
  try {
    const result = await spotifyService.search(query, ["artist"])
    return result.artists
  } catch (error) {
    console.error("Error searching artist:", error)
    return null
  }
}

const getArtistAlbums = async (
  artistId: string,
): Promise<SimplifiedAlbum[]> => {
  try {
    const albums: SimplifiedAlbum[] = []
    let offset = 0
    const limit = 50

    while (true) {
      const data = await spotifyService.artists.albums(
        artistId,
        undefined,
        market,
        limit,
        offset,
      )
      albums.push(...data.items)

      if (data.items.length < limit) break
      offset += limit
    }

    return albums
  } catch (error) {
    console.error("Error getting albums:", error)
    return []
  }
}

const getAlbumTracks = async (albumId: string): Promise<SimplifiedTrack[]> => {
  try {
    const data = await spotifyService.albums.tracks(albumId, market)
    return data.items
  } catch (error) {
    console.error("Error getting album tracks:", error)
    return []
  }
}

export const getAllArtistTracks = async (
  artistId: string,
): Promise<SimplifiedTrack[]> => {
  const albums = await getArtistAlbums(artistId)
  const allTracks: SimplifiedTrack[] = []
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
  userId: string,
  name: string,
  trackUris: string[],
): Promise<string | null> => {
  try {
    const playlistOptions = { name }
    const playlist = await spotifyService.playlists.createPlaylist(
      userId,
      playlistOptions,
    )

    if (!playlist) {
      throw new Error("Failed to create playlist")
    }

    await spotifyService.playlists.addItemsToPlaylist(playlist.id, trackUris)
    return playlist.id
  } catch (error) {
    console.error("Error creating playlist:", error)
    return null
  }
}
