interface SpotifyTokens {
  access_token: string
  refresh_token: string
  expires_in: number
  token_type: string
  scope: string
}

interface SpotifyPage<ItemType> {
  href: string
  items: ItemType[]
  limit: number
  next: string | null
  offset: number
  previous: string | null
  total: number
}

interface SpotifyExternalUrls {
  spotify: string
}

interface SpotifyFollowers {
  href: string | null
  total: number
}

interface SpotifyImage {
  url: string
  height: number
  width: number
}

interface SpotifyUserReference {
  display_name: string
  external_urls: SpotifyExternalUrls
  followers: SpotifyFollowers
  href: string
  id: string
  type: string
  uri: string
}

// 2026-02 の仕様変更で email / followers / country / explicit_content / product は返らなくなった
interface SpotifyUser {
  display_name: string
  external_urls: SpotifyExternalUrls
  href: string
  id: string
  images: SpotifyImage[]
  type: string
  uri: string
}

type SpotifyUserProfile = SpotifyUser

interface SpotifySimplifiedArtist {
  external_urls: SpotifyExternalUrls
  href: string
  id: string
  name: string
  type: string
  uri: string
}

// 2026-02 の仕様変更で followers / popularity は返らなくなった
interface SpotifyArtist extends SpotifySimplifiedArtist {
  genres?: string[]
  images: SpotifyImage[]
}

interface SpotifyTracksSearchResponse {
  tracks: SpotifyPage<SpotifyTrack>
}

interface SpotifyArtistsSearchResponse {
  artists: SpotifyPage<SpotifyArtist>
}

interface SpotifyAlbum {
  album_type: string
  total_tracks: number
  is_playable: boolean
  external_urls: SpotifyExternalUrls
  href: string
  id: string
  images: SpotifyImage[]
  name: string
  release_date: string
  release_date_precision: string
  type: string
  uri: string
  artists: SpotifyArtist[]
}

interface SpotifyTrack {
  artists: SpotifyArtist[]
  disc_number: number
  duration_ms: number
  explicit: boolean
  external_urls: SpotifyExternalUrls
  href: string
  id: string
  is_playable: boolean
  name: string
  preview_url: string | null
  track_number: number
  type: string
  uri: string
  is_local: boolean
}

interface SpotifyPlaylist {
  collaborative: boolean
  description: string
  external_urls: SpotifyExternalUrls
  followers: SpotifyFollowers
  href: string
  id: string
  images: SpotifyImage[]
  name: string
  owner: SpotifyUserReference
  public: boolean
  snapshot_id: string
  type: string
  uri: string
}

export type {
  SpotifyAlbum,
  SpotifyArtist,
  SpotifyArtistsSearchResponse,
  SpotifyPage,
  SpotifyPlaylist,
  SpotifyTokens,
  SpotifyTrack,
  SpotifyTracksSearchResponse,
  SpotifyUserProfile,
}
