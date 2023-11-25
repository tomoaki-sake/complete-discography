import { Text, TextProps } from "@chakra-ui/react";
import React, { ReactNode } from "react";

type DescriptionProps = TextProps & {
  children: ReactNode;
};

export const Description: React.FC<DescriptionProps> = ({
  children,
  ...rest
}) => {
  return (
    <Text color="gray.500" fontSize="sm" {...rest}>
      {children}
    </Text>
  );
};
