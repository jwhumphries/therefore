import { initLightbox } from "./lightbox";
import { initTimeline } from "./timeline";
import { initSidenote } from "./sidenote";
import { initAvatar } from "./avatar";

type CleanupFn = () => void;
type ComponentInit = (el: HTMLElement) => CleanupFn | void;

const registry: Record<string, ComponentInit> = {
  lightbox: initLightbox,
  timeline: initTimeline,
  sidenote: initSidenote,
  avatar: initAvatar,
};

// Store cleanup functions for all hydrated components
let cleanupFunctions: CleanupFn[] = [];

/**
 * Hydrates all components with data-component attributes within a container.
 * This is the main entry point for progressive enhancement.
 */
export function hydrateComponents(container: HTMLElement): void {
  const elements = container.querySelectorAll<HTMLElement>("[data-component]");

  elements.forEach((el) => {
    const componentName = el.dataset.component;
    if (!componentName) return;

    const init = registry[componentName];
    if (init) {
      // Avoid re-initializing
      if (!el.dataset.hydrated) {
        const cleanup = init(el);
        if (cleanup) {
          cleanupFunctions.push(cleanup);
        }
        el.dataset.hydrated = "true";
      }
    } else {
      console.warn(`Unknown component: ${componentName}`);
    }
  });
}

/**
 * Cleans up all hydrated components.
 * Call this before navigating away or re-hydrating.
 */
export function cleanupComponents(): void {
  cleanupFunctions.forEach((cleanup) => cleanup());
  cleanupFunctions = [];
}
