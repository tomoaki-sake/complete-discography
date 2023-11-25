import {
  Box,
  Divider,
  List,
  ListItem,
  useColorModeValue,
} from "@chakra-ui/react";
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
}) => {
  const hoverBg = useColorModeValue("gray.100", "gray.700");
  const selectedBg = useColorModeValue("blue.100", "blue.700");
  return (
    <Box mx="auto" overflow="auto" bg="white" rounded="5px">
      <List spacing={3}>
        {items.map((item, index) => (
          <Box key={index}>
            <ListItem
              px={4}
              py={2}
              cursor="pointer"
              bg={selectedItem?.id === item.id ? selectedBg : "transparent"}
              _hover={{ bg: hoverBg }}
              onClick={() => handleItemClick(item)}
            >
              {item.content}
            </ListItem>
            {index < items.length - 1 && <Divider />}
          </Box>
        ))}
      </List>
    </Box>
  );
};
