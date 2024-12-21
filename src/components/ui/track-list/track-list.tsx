import type { SpotifyTrack } from "@/types/spotify"
import { formatDuration } from "@/utils/format"

interface TrackListProps {
  tracks: SpotifyTrack[]
  handleSelectTrack: (trackId: string) => void
}

const TrackList: React.FC<TrackListProps> = ({ tracks, handleSelectTrack }) => {
  return (
    <div className="bg-white rounded-xl shadow-lg p-6 space-y-4">
      <h3 className="text-lg font-semibold text-gray-800">トラックリスト</h3>
      <div className="space-y-2">
        {tracks.map((track) => (
          <button
            type="button"
            key={track.id}
            className="w-full flex items-center p-4 hover:bg-gray-50 rounded-lg transition-colors"
            onClick={() => handleSelectTrack(track.id)}
          >
            <div className="flex-1 min-w-0 text-left">
              <p className="font-medium text-gray-800 truncate">{track.name}</p>
            </div>
            <p className="text-sm text-gray-500 ml-4">
              {formatDuration(track.duration_ms)}
            </p>
          </button>
        ))}
      </div>
    </div>
  )
}

export default TrackList
