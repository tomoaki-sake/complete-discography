import type {
  SpotifyArtist,
  SpotifyPage,
  SpotifyPlaylist,
  SpotifyTrack,
  SpotifyUserProfile,
} from "@/types/spotify"
import { createSpotifyApi } from "./spotify-api"
import { getOrCreateAccessToken } from "./spotify-auth"

// Web アプリ（ブラウザ）用。トークンは spotify-auth（localStorage）から取得する。
const api = createSpotifyApi(
  async () => (await getOrCreateAccessToken()).access_token,
)

export const getMe = async (): Promise<SpotifyUserProfile | null> => {
  try {
    return await api.getMe()
  } catch (error) {
    console.error("Error getting user profile:", error)
    return null
  }
}

export const searchArtists = async (
  query: string,
): Promise<SpotifyPage<SpotifyArtist> | null> => {
  try {
    return await api.searchArtists(query)
  } catch (error) {
    console.error("Error searching artist:", error)
    return null
  }
}

export const getAllArtistTracks = async (
  artistId: string,
): Promise<SpotifyTrack[]> => {
  try {
    return await api.getAllArtistTracks(artistId)
  } catch (error) {
    console.error("Error getting artist tracks:", error)
    return []
  }
}

export const createAllTracksPlayList = async (
  name: string,
  trackUris: string[],
): Promise<SpotifyPlaylist | null> => {
  try {
    return await api.createPlaylistWithTracks({ name, trackUris })
  } catch (error) {
    console.error("Error creating playlist:", error)
    return null
  }
}
