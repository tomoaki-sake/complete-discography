import type { SimplifiedTrack } from "@spotify/web-api-ts-sdk"

export interface PlaylistData {
  artist: string
  image: string
  tracks: SimplifiedTrack[]
  totalDuration: string
}
