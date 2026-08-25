import React, { forwardRef } from "react";
import styles from "./IconButton.module.css";

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "ghost" | "subtle" | "primary" | "danger";
  size?: "sm" | "md" | "lg";
  isActive?: boolean;
  tooltip?: string;
  children: React.ReactNode;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  function IconButton(
    {
      variant = "ghost",
      size = "md",
      isActive = false,
      tooltip,
      className,
      children,
      ...props
    },
    ref
  ) {
    const classNames = [
      styles.iconBtn,
      styles[variant],
      styles[size],
      isActive ? styles.active : "",
      className || "",
    ]
      .filter(Boolean)
      .join(" ");

    return (
      <button
        ref={ref}
        type="button"
        className={classNames}
        title={tooltip}
        aria-label={tooltip || props["aria-label"]}
        data-active={isActive}
        {...props}
      >
        {children}
      </button>
    );
  }
);
