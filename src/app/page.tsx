"use client"
import { Accordion } from "@/components/ui/accordion"
import { ListItemWithIcon } from "@/components/ui/list-item-with-icon"
import { SearchBar } from "@/components/ui/search-bar/search-bar"
import { getAllArtistTracks, searchArtists } from "@/lib/spotify-client"
import type { PlaylistData } from "@/types/music"
import { formatDuration } from "@/utils/format"
import type { Artist, Page } from "@spotify/web-api-ts-sdk"
import { Loader2 } from "lucide-react"
import { useState } from "react"

export default function Home() {
  const [searchQuery, setSearchQuery] = useState("")
  const [artists, setArtists] = useState<Page<Artist> | null>(null)
  const [isSearching, setIsSearching] = useState(false)
  const [isLoadingPlaylist, setIsLoadingPlaylist] = useState(false)
  const [playlistData, setPlaylistData] = useState<PlaylistData | null>(null)
  const [selectedArtist, setSelectedArtist] = useState<string | null>(null)
  const [isListVisible, setIsListVisible] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const toggleListVisibility = () => {
    setIsListVisible(!isListVisible)
  }

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchQuery.trim()) return

    setIsSearching(true)
    setError(null)
    setPlaylistData(null)

    try {
      const artistData = await searchArtists(searchQuery)

      if (!artistData) {
        throw new Error("アーティストが見つかりませんでした")
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
    setIsLoadingPlaylist(true)
    setSelectedArtist(artist.name)
    setIsListVisible(false)
    setError(null)

    try {
      const tracks = await getAllArtistTracks(artist.id)
      if (tracks.length === 0) {
        throw new Error("トラックが見つかりませんでした")
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-2 text-gray-800">
            アーティスト全曲プレイリスト
          </h1>
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
                ? `選ばれたアーティスト: ${selectedArtist}`
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
        <pre>{JSON.stringify(playlistData, null, 2)}</pre>
      </div>
    </div>
  )
}
