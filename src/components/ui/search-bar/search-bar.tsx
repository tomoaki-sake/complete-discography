import { Search } from "lucide-react"

interface SearchBarProps {
  artist: string
  setArtist: (value: string) => void
  handleSearch: (e: React.FormEvent) => void
  isLoading: boolean
}
const SearchBar: React.FC<SearchBarProps> = ({
  artist,
  setArtist,
  handleSearch,
  isLoading,
}) => {
  return (
    <form onSubmit={handleSearch} className="max-w-xl mx-auto">
      <div className="relative">
        <input
          type="text"
          value={artist}
          onChange={(e) => setArtist(e.target.value)}
          placeholder="アーティスト名を入力..."
          className="w-full px-6 py-4 text-lg rounded-full border-2 border-gray-200
                    focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200
                    transition-colors duration-200 bg-white shadow-sm
                    placeholder-gray-400"
        />
        <button
          type="submit"
          disabled={isLoading || !artist}
          className="absolute right-2 top-1/2 -translate-y-1/2
                    bg-indigo-600 text-white p-3 rounded-full
                    hover:bg-indigo-700 transition-colors duration-200
                    disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          <Search className="w-5 h-5" />
        </button>
      </div>
    </form>
  )
}

export { SearchBar }
