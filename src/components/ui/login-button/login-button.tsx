import { LogIn } from "lucide-react"

interface LoginButtonProps {
  onLogin: () => void
}

const LoginButton: React.FC<LoginButtonProps> = ({ onLogin }) => {
  return (
    <button
      type="button"
      onClick={onLogin}
      className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg
                hover:bg-green-700 transition-colors duration-200
                focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
    >
      <LogIn className="w-5 h-5" />
      Spotifyでログイン
    </button>
  )
}

export { LoginButton }
