import clsx from "clsx";
import React, { ComponentProps } from "react";

export type ListItem = {
  id: string;
  content: string;
};

type SelectableListProps = ComponentProps<"div"> & {
  items: ListItem[];
  selectedItem: ListItem | null;
  handleItemClick: (item: ListItem) => void;
};

export const SelectableList: React.FC<SelectableListProps> = ({
  items,
  selectedItem,
  handleItemClick,
  className = "",
}) => {
  return (
    <div
      className={clsx(
        "max-w-md mx-auto max-h-96 overflow-auto bg-white rounded-md shadow-md",
        className
      )}
    >
      <ul className="divide-y divide-gray-200">
        {items.map((item, index) => (
          <li
            key={index}
            className={`p-4 cursor-pointer ${
              selectedItem?.id === item.id
                ? "bg-blue-100 hover:none"
                : "hover:bg-gray-100"
            }`}
            onClick={() => handleItemClick(item)}
          >
            {item.content}
          </li>
        ))}
      </ul>
    </div>
  );
};
