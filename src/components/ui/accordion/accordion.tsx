interface AccordionProps {
  title: string | null
  existContent: boolean
  isListVisible: boolean
  toggleListVisibility: () => void
}

const Accordion: React.FC<AccordionProps> = ({
  title,
  existContent,
  isListVisible,
  toggleListVisibility,
}) => {
  if (!existContent) return null

  return (
    <div className="border-b border-slate-200">
      <button
        type="button"
        onClick={toggleListVisibility}
        className="w-full flex justify-between items-center pb-5 text-slate-800"
      >
        {title}
        <span
          id="icon-1"
          className="text-slate-800 transition-transform duration-300"
        >
          <svg
            data-accordion-icon
            className={`w-3 h-3 shrink-0 ${!isListVisible && "rotate-180"}`}
            aria-hidden="true"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 10 6"
          >
            <path
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M9 5 5 1 1 5"
            />
          </svg>
        </span>
      </button>
      <div
        id="content-1"
        className="max-h-0 overflow-hidden transition-all duration-300 ease-in-out"
      >
        <div className="pb-5 text-sm text-slate-500">
          {isListVisible ? "閉じる" : "開く"}
        </div>
      </div>
    </div>
  )
}

export { Accordion }
