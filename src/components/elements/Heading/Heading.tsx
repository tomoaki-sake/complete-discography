import clsx from "clsx";
import React, { ComponentProps, ReactNode } from "react";

type Heading1Props = ComponentProps<"h1"> & {
  children: ReactNode;
};

export const H1: React.FC<Heading1Props> = ({ children, className = "" }) => {
  return <h1 className={clsx("text-4xl font-bold", className)}>{children}</h1>;
};

type Heading2Props = ComponentProps<"h2"> & {
  children: ReactNode;
};

export const H2: React.FC<Heading2Props> = ({ children, className = "" }) => {
  return <h2 className={clsx("text-3xl font-bold", className)}>{children}</h2>;
};

type Heading3Props = ComponentProps<"h3"> & {
  children: ReactNode;
};

export const H3: React.FC<Heading3Props> = ({ children, className = "" }) => {
  return <h3 className={clsx("text-2xl font-bold", className)}>{children}</h3>;
};

type Heading4Props = ComponentProps<"h4"> & {
  children: ReactNode;
};

export const H4: React.FC<Heading4Props> = ({ children, className = "" }) => {
  return <h4 className={clsx("text-xl font-bold", className)}>{children}</h4>;
};

type Heading5Props = ComponentProps<"h5"> & {
  children: ReactNode;
};

export const H5: React.FC<Heading5Props> = ({ children, className = "" }) => {
  return <h5 className={clsx("text-lg font-bold", className)}>{children}</h5>;
};
