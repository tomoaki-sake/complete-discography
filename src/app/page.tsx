"use client"
import { Accordion } from "@/components/ui/accordion"
import { ListItemWithIcon } from "@/components/ui/list-item-with-icon"
import { LoginButton } from "@/components/ui/login-button"
import { PlaylistCard } from "@/components/ui/playlist-card"
import { SearchBar } from "@/components/ui/search-bar/search-bar"
import TrackList from "@/components/ui/track-list/track-list"
import { UserMenu } from "@/components/ui/user-menu/user-menu"
import {
  createAllTracksPlayList,
  getAllArtistTracks,
  getMe,
  logout,
  searchArtists,
} from "@/lib/spotify-client"
import type { PlaylistData } from "@/types/music"
import { formatDuration } from "@/utils/format"
import type {
  Artist,
  Page,
  Playlist,
  TrackItem,
  UserProfile,
} from "@spotify/web-api-ts-sdk"
import { Loader2 } from "lucide-react"
import { useEffect, useState } from "react"
import toast, { Toaster } from "react-hot-toast"

export default function Home() {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [artists, setArtists] = useState<Page<Artist> | null>(null)
  const [isSearching, setIsSearching] = useState(false)
  const [isLoadingPlaylist, setIsLoadingPlaylist] = useState(false)
  const [playlistData, setPlaylistData] = useState<PlaylistData | null>(null)
  const [selectedArtist, setSelectedArtist] = useState<Artist | null>(null)
  const [isListVisible, setIsListVisible] = useState(true)
  const [selectedTrackId, setSelectedTrackId] = useState<string | null>(null)
  const [isCreatingPlaylist, setIsCreatingPlaylist] = useState(false)
  const [createdPlayList, setIsCreatedPlayList] =
    useState<Playlist<TrackItem> | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const setLoggedInUser = async () => {
      const user = await getMe()
      if (user) {
        setUser(user)
        toast.success("Spotifyにログインしました！ ")
      }
    }

    setLoggedInUser()
  }, [])

  const handleLogin = async () => {
    const user = await getMe()
    if (!user) return

    setUser(user)
  }

  const handleLogout = () => {
    setSearchQuery("")
    setArtists(null)
    setPlaylistData(null)
    setSelectedArtist(null)
    setSelectedTrackId(null)
    setUser(null)
    setIsCreatedPlayList(null)
    logout()
    toast.success("ログアウトしました")
  }

  const toggleListVisibility = () => {
    setIsListVisible(!isListVisible)
  }

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchQuery.trim()) return

    setIsSearching(true)
    setIsCreatedPlayList(null)
    setSelectedArtist(null)
    setError(null)
    setPlaylistData(null)

    try {
      const artistData = await searchArtists(searchQuery)

      if (!artistData) {
        toast.error("アーティストが見つかりませんでした")
        setArtists(null)
        setIsListVisible(false)
      }
      setArtists(artistData)
      setIsListVisible(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました")
      setArtists(null)
    } finally {
      setIsSearching(false)
    }
  }

  const handleSelectArtist = async (artist: Artist) => {
    setIsCreatedPlayList(null)
    setIsLoadingPlaylist(true)
    setSelectedArtist(artist)
    setIsListVisible(false)
    setError(null)

    try {
      const tracks = await getAllArtistTracks(artist.id)
      if (tracks.length === 0) {
        toast.error("アーティストの楽曲が見つかりませんでした")
        return
      }

      const totalMs = tracks.reduce((acc, track) => acc + track.duration_ms, 0)

      setPlaylistData({
        artist: artist.name,
        image: artist.images[0]?.url ?? "",
        tracks: tracks,
        totalDuration: formatDuration(totalMs),
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました")
      setPlaylistData(null)
      setSelectedArtist(null)
      setIsListVisible(true)
    } finally {
      setIsLoadingPlaylist(false)
    }
  }

  const handleCreatePlaylist = async () => {
    if (!playlistData || !user) return

    setIsCreatingPlaylist(true)
    const toastId = toast.loading("プレイリストを作成中...")

    try {
      const trackUris = playlistData.tracks.map((track) => track.uri)
      const playlist = await createAllTracksPlayList(
        user.id,
        `${playlistData.artist} 全曲`,
        trackUris,
      )
      if (!playlist) {
        toast.error("プレイリストの作成に失敗しました", { id: toastId })
        return
      }
      setIsCreatedPlayList(playlist)
      toast.success(
        (t) => (
          <div className="flex flex-col gap-2">
            <span>プレイリストを作成しました！</span>
            <a
              href={playlist.external_urls.spotify}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-green-600 hover:text-green-700 underline"
            >
              Spotifyで開く
            </a>
          </div>
        ),
        { id: toastId, duration: 5000 },
      )
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "プレイリストの作成に失敗しました"
      toast.error(message, { id: toastId })
    } finally {
      setIsCreatingPlaylist(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 3000,
          style: {
            background: "#fff",
            color: "#363636",
            boxShadow:
              "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
          },
          success: {
            iconTheme: {
              primary: "#059669",
              secondary: "#fff",
            },
          },
          error: {
            iconTheme: {
              primary: "#DC2626",
              secondary: "#fff",
            },
          },
        }}
      />

      <header className="bg-white shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-800">
            アーティスト全曲プレイリスト
          </h1>
          {user ? (
            <UserMenu user={user} onLogout={handleLogout} />
          ) : (
            <LoginButton onLogin={handleLogin} />
          )}
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <p className="text-gray-600 mb-8">
            アーティスト名を入力して、全曲プレイリストを作成
          </p>
          <SearchBar
            artist={searchQuery}
            setArtist={setSearchQuery}
            handleSearch={handleSearch}
            isLoading={isSearching}
          />

          {error && (
            <div className="mt-4 text-red-600 bg-red-50 p-3 rounded-lg">
              {error}
            </div>
          )}
        </div>

        <div className="max-w-xl mx-auto">
          <Accordion
            title={
              selectedArtist
                ? `選ばれたアーティスト: ${selectedArtist.name}`
                : "アーティストを選択してください"
            }
            existContent={!!artists && artists.items.length > 0}
            isListVisible={isListVisible}
            toggleListVisibility={toggleListVisibility}
          />
          {isSearching ? (
            <div className="flex justify-center items-center mt-16">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            </div>
          ) : (
            isListVisible &&
            artists && (
              <div className="space-y-4 mt-4">
                {artists.items.map((artist) => (
                  <ListItemWithIcon
                    key={artist.id}
                    imageSrc={artist.images[0]?.url}
                    imageAlt={artist.name}
                    title={artist.name}
                    content={`${artist.followers.total.toLocaleString()} フォロワー`}
                    isDisabled={isLoadingPlaylist}
                    onClick={() => handleSelectArtist(artist)}
                  />
                ))}
              </div>
            )
          )}
        </div>

        <div className="mt-6 max-w-xl mx-auto">
          {isLoadingPlaylist ? (
            <div className="flex justify-center items-center mt-16">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
              <p className="ml-2 text-indigo-600">楽曲情報取得中...</p>
            </div>
          ) : playlistData ? (
            <div className="space-y-8">
              <PlaylistCard
                artist={playlistData.artist}
                songCount={playlistData.tracks.length}
                duration={playlistData.totalDuration}
                image={playlistData.image}
                handleCreatePlaylist={handleCreatePlaylist}
                isCreating={isCreatingPlaylist}
                spotifyLink={createdPlayList?.external_urls.spotify}
              />

              {selectedTrackId && (
                <div className="fixed bottom-4 right-4 bg-white shadow-lg rounded-lg p-4 z-50">
                  <iframe
                    title="Selected Artist Songs"
                    src={`https://open.spotify.com/embed/track/${selectedTrackId}`}
                    width="300"
                    height="80"
                    allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                    loading="lazy"
                  />
                </div>
              )}

              <TrackList
                tracks={playlistData.tracks}
                handleSelectTrack={setSelectedTrackId}
              />
            </div>
          ) : null}
        </div>
      </main>
    </div>
  )
}
