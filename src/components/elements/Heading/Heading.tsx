import { Heading, HeadingProps as ChakraHeadingProps } from "@chakra-ui/react";
import React, { ReactNode } from "react";

type HeadingProps = ChakraHeadingProps & {
  children: ReactNode;
};

export const H1: React.FC<HeadingProps> = ({ children }) => {
  return <Heading as="h1">{children}</Heading>;
};

export const H2: React.FC<HeadingProps> = ({ children }) => {
  return <Heading as="h2">{children}</Heading>;
};

export const H3: React.FC<HeadingProps> = ({ children }) => {
  return <Heading as="h3">{children}</Heading>;
};

export const H4: React.FC<HeadingProps> = ({ children }) => {
  return <Heading as="h4">{children}</Heading>;
};

export const H5: React.FC<HeadingProps> = ({ children }) => {
  return <Heading as="h5">{children}</Heading>;
};
