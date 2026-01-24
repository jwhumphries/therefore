import { useCallback } from "react";
import { useNavigate } from "react-router-dom";

type TransitionType = "fade" | "slide";

function getTransitionType(path: string): TransitionType {
  // Posts use fade transition
  if (path.startsWith("/posts/")) {
    return "fade";
  }
  // Navigation pages (home, tags, about) use slide transition
  return "slide";
}

export function useViewTransitionNavigate() {
  const navigate = useNavigate();

  const navigateWithTransition = useCallback(
    (to: string) => {
      const transitionType = getTransitionType(to);

      // Check if View Transitions API is supported
      if (!document.startViewTransition) {
        navigate(to);
        window.scrollTo(0, 0);
        return;
      }

      // Set transition type on document
      document.documentElement.dataset.transition = transitionType;

      const transition = document.startViewTransition(() => {
        navigate(to);
      });

      // Scroll to top after the transition starts
      transition.ready.then(() => {
        window.scrollTo(0, 0);
      });
    },
    [navigate]
  );

  return navigateWithTransition;
}

export function getTransitionTypeForPath(path: string): TransitionType {
  return getTransitionType(path);
}
