import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "muted" | "footer";
  icon?: React.ReactNode;
  iconPosition?: "left" | "right";
  iconOnly?: boolean;
  href?: string;
  target?: string;
}

export default function Button({
  children,
  variant = "default",
  icon,
  iconPosition = "left",
  iconOnly = false,
  href,
  target,
  className = "",
  disabled = false,
  ...props
}: ButtonProps) {
  const baseStyles = [
    "inline-flex",
    "h-9",
    "items-center",
    "justify-center",
    "select-none",
    "rounded-lg",
    "text-sm",
    "font-medium",
    "leading-none",
    "transition-all",
    "duration-200",
    "ease-out",
    "box-border",
    "no-underline",
    "cursor-pointer",
    "shrink-0",
  ].join(" ");

  const sizeStyles = iconOnly ? "w-9 p-0" : "gap-2 px-4 sm:px-5";

  const variantClasses = {
    default: "selaura-button-default",

    outline: "selaura-button-outline",

    muted: "selaura-button-muted",

    footer: "selaura-button-footer",
  };

  const classes = [
    baseStyles,
    sizeStyles,
    variantClasses[variant],
    className,
  ].join(" ");

  const content = (
    <>
      {icon && iconPosition === "left" && (
        <span className="inline-flex shrink-0">{icon}</span>
      )}

      {!iconOnly && <span className="whitespace-nowrap">{children}</span>}

      {icon && iconPosition === "right" && (
        <span className="inline-flex shrink-0">{icon}</span>
      )}

      {iconOnly && !icon && (
        <span className="inline-flex shrink-0">{children}</span>
      )}
    </>
  );

  if (href) {
    return (
      <a
        href={disabled ? undefined : href}
        target={target}
        aria-disabled={disabled}
        className={[
          classes,
          disabled ? "pointer-events-none opacity-50" : "",
        ].join(" ")}
      >
        {content}
      </a>
    );
  }

  return (
    <button
      {...props}
      type={props.type ?? "button"}
      disabled={disabled}
      className={classes}
    >
      {content}
    </button>
  );
}
