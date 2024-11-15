import { Music } from "lucide-react"

interface PlaylistCardProps {
  artist: string
  songCount: number
  duration: string
  image: string
}

const PlaylistCard: React.FC<PlaylistCardProps> = ({
  artist,
  songCount,
  duration,
  image,
}) => {
  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
      <div className="md:flex">
        <div className="md:w-1/3">
          <img
            src={image}
            alt={`${artist} playlist`}
            className="h-full w-full object-cover"
          />
        </div>
        <div className="p-8 md:w-2/3">
          <div className="uppercase tracking-wide text-sm text-indigo-600 font-semibold">
            コンプリートプレイリスト
          </div>
          <h2 className="mt-2 text-2xl font-bold text-gray-800">
            {artist}の全曲
          </h2>
          <div className="mt-4 space-y-2 text-gray-600">
            <div className="flex items-center">
              <Music className="w-5 h-5 mr-2" />
              <span>{songCount} 曲</span>
            </div>
            <div className="flex items-center">
              <span>総再生時間: {duration}</span>
            </div>
          </div>
          <div className="mt-6">
            <button
              type="button"
              className="bg-indigo-600 text-white px-6 py-3 rounded-full
                            hover:bg-indigo-700 transition-colors duration-200
                            focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
              プレイリストを作成する
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export { PlaylistCard }
