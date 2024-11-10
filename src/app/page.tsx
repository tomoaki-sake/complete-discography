"use client"
import { ListItemWithIcon } from "@/components/ui/list-item-with-icon"
import { SearchBar } from "@/components/ui/search-bar/search-bar"
import { searchArtists } from "@/lib/spotify-client"
import {
  Artist,
  ArtistSearchResult,
  Page,
  SearchResults,
  SimplifiedTrack,
} from "@spotify/web-api-ts-sdk"
import { Loader2 } from "lucide-react"
import { useState } from "react"

export default function Home() {
  const [artist, setArtist] = useState("")
  const [artists, setArtists] = useState<Page<Artist> | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [playlistData, setPlaylistData] = useState<SimplifiedTrack[] | null>(
    null,
  )
  const [error, setError] = useState<string | null>(null)

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const artistData = await searchArtists(artist)

      if (!artistData) {
        throw new Error("アーティストが見つかりませんでした")
      }
      setArtists(artistData)

      // const tracks = await spotifyService.getAllArtistTracks(artistData.id);

      // if (tracks.length === 0) {
      //   throw new Error('トラックが見つかりませんでした');
      // }

      // const uniqueAlbums = new Set(tracks.map(track => track.album.name));

      // const formattedTracks = tracks.map(track => ({
      //   id: track.id,
      //   name: track.name,
      //   duration: spotifyService.formatDuration(track.duration_ms),
      //   durationMs: track.duration_ms,
      //   albumName: track.album.name,
      //   albumImage: track.album.images[0]?.url || 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&q=80&w=1000'
      // }));

      // const totalMs = formattedTracks.reduce((acc, track) => acc + track.durationMs, 0);

      // setPlaylistData({
      //   artist: artistData.name,
      //   image: artistData.images[0]?.url || 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&q=80&w=1000',
      //   tracks: formattedTracks,
      //   totalDuration: spotifyService.formatDuration(totalMs),
      //   albumCount: uniqueAlbums.size
      // });
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました")
      // setPlaylistData(null);
    } finally {
      setIsLoading(false)
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
            artist={artist}
            setArtist={setArtist}
            handleSearch={handleSearch}
            isLoading={isLoading}
          />

          {error && (
            <div className="mt-4 text-red-600 bg-red-50 p-3 rounded-lg">
              {error}
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center mt-16">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          </div>
        ) : (
          artists && (
            <div className="space-y-8 max-w-xl mx-auto">
              {artists.items.map((artist) => (
                <ListItemWithIcon
                  key={artist.id}
                  imageSrc={artist.images[0]?.url}
                  imageAlt={artist.name}
                  title={artist.name}
                  content={`${artist.followers.total.toLocaleString()} フォロワー`}
                />
              ))}
            </div>
          )
        )}
      </div>
    </div>
  )
}
