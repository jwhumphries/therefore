import type { ReactNode, MouseEvent } from "react";
import { useViewTransitionNavigate } from "../hooks/useViewTransition";

interface TransitionLinkProps {
  to: string;
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
  onClick?: (e: MouseEvent<HTMLAnchorElement>) => void;
}

export function TransitionLink({
  to,
  children,
  className,
  style,
  onClick,
}: TransitionLinkProps) {
  const navigateWithTransition = useViewTransitionNavigate();

  const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    if (onClick) {
      onClick(e);
      // If onClick called stopPropagation, don't navigate
      if (e.defaultPrevented) return;
    }
    navigateWithTransition(to);
  };

  return (
    <a href={to} onClick={handleClick} className={className} style={style}>
      {children}
    </a>
  );
}
