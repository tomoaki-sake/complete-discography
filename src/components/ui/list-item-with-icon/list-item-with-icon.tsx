import { useState } from "react"

interface ListItemWithIconProps {
  imageSrc: string
  imageAlt: string
  title: string
  content: string
  isDisabled: boolean
  onClick: () => void
}

const ListItemWithIcon: React.FC<ListItemWithIconProps> = ({
  imageSrc,
  imageAlt,
  title,
  content,
  isDisabled,
  onClick,
}) => {
  const [isClicked, setIsClicked] = useState(false)

  const handleClick = () => {
    if (!isClicked) {
      onClick()
      setIsClicked(true)
    }
  }

  return (
    <button
      type="button"
      className={`w-full flex items-center space-x-4 p-4 border rounded-lg transition-all duration-300 ${
        isClicked
          ? "cursor-not-allowed bg-gray-200"
          : "cursor-pointer hover:bg-gray-100"
      }`}
      onClick={handleClick}
      disabled={isClicked || isDisabled}
    >
      {imageSrc ? (
        <img src={imageSrc} alt={imageAlt} className="w-16 h-16 rounded-full" />
      ) : (
        <div className="w-16 h-16 bg-gray-200 rounded-full" />
      )}
      <div className="text-left">
        <h2 className="text-lg font-bold text-gray-800">{title}</h2>
        <p className="text-gray-600">{content}</p>
      </div>
    </button>
  )
}

export { ListItemWithIcon }
