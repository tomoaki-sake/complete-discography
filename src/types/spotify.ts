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

interface SpotifyExplicitContent {
  filter_enabled: boolean
  filter_locked: boolean
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

interface SpotifyUser {
  display_name: string
  email: string
  external_urls: SpotifyExternalUrls
  followers: SpotifyFollowers
  href: string
  id: string
  images: SpotifyImage[]
  type: string
  uri: string
}

interface SpotifyUserProfile extends SpotifyUser {
  country: string
  explicit_content: SpotifyExplicitContent
  product: string
}

interface SpotifySimplifiedArtist {
  external_urls: SpotifyExternalUrls
  href: string
  id: string
  name: string
  type: string
  uri: string
}

interface SpotifyArtist extends SpotifySimplifiedArtist {
  followers: SpotifyFollowers
  genres: string[]
  images: SpotifyImage[]
  popularity: number
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
  album_group: string
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
  tracks: SpotifyTrack[]
}

export type {
  SpotifyTokens,
  SpotifyPage,
  SpotifyUserProfile,
  SpotifyArtist,
  SpotifyArtistsSearchResponse,
  SpotifyAlbum,
  SpotifyTrack,
  SpotifyPlaylist,
}
