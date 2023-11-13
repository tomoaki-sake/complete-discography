import clsx from "clsx";
import React, { ComponentProps, ReactNode } from "react";

type DescriptionProps = ComponentProps<"p"> & {
  children: ReactNode;
};

export const Description: React.FC<DescriptionProps> = ({
  children,
  className = "",
  ...rest
}) => {
  return (
    <p
      className={clsx(
        "text-base font-medium text-gray-500 dark:text-gray-400",
        className
      )}
      {...rest}
    >
      {children}
    </p>
  );
};
