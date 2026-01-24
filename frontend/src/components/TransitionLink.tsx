import type { ReactNode, MouseEvent } from "react";
import { useLocation } from "react-router-dom";
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
  const location = useLocation();

  const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    if (onClick) {
      onClick(e);
      // If onClick called stopPropagation, don't navigate
      if (e.defaultPrevented) return;
    }

    // If already on the target page, smooth scroll to top instead of navigating
    if (location.pathname === to) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    navigateWithTransition(to);
  };

  return (
    <a href={to} onClick={handleClick} className={className} style={style}>
      {children}
    </a>
  );
}
