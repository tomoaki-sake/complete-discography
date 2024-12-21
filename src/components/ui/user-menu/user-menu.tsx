import type { SpotifyUserProfile } from "@/types/spotify"
import { LogOut, User } from "lucide-react"

interface UserMenuProps {
  user: SpotifyUserProfile
  onLogout: () => void
}

const UserMenu: React.FC<UserMenuProps> = ({ user, onLogout }) => {
  return (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-2">
        {user.images?.[0]?.url ? (
          <img
            src={user.images[0].url}
            alt={user.display_name}
            className="w-8 h-8 rounded-full"
          />
        ) : (
          <User className="w-8 h-8 p-1 bg-gray-100 rounded-full text-gray-600" />
        )}
        <span className="text-sm font-medium text-gray-700">
          {user.display_name}
        </span>
      </div>
      <button
        type="button"
        onClick={onLogout}
        className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
      >
        <LogOut className="w-4 h-4" />
        ログアウト
      </button>
    </div>
  )
}

export { UserMenu }
