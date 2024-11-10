interface ListItemWithIconProps {
  imageSrc: string
  imageAlt: string
  title: string
  content: string
  onClick?: () => void
}

const ListItemWithIcon: React.FC<ListItemWithIconProps> = ({
  imageSrc,
  imageAlt,
  title,
  content,
  onClick,
}) => {
  return (
    <div className="flex items-center space-x-4">
      {imageSrc ? (
        <img src={imageSrc} alt={imageAlt} className="w-16 h-16 rounded-full" />
      ) : (
        <div className="w-16 h-16 bg-gray-200 rounded-full" />
      )}
      <div>
        <h2 className="text-lg font-bold text-gray-800">{title}</h2>
        <p className="text-gray-600">{content}</p>
      </div>
    </div>
  )
}

export { ListItemWithIcon }
