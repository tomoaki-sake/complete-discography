import type { SpotifyTrack } from "./spotify"

export interface PlaylistData {
  artist: string
  image: string
  tracks: SpotifyTrack[]
  totalDuration: string
}
