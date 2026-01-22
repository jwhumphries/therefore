import { initLightbox } from "./lightbox";
import { initTimeline } from "./timeline";
import { initSidenote } from "./sidenote";

type ComponentInit = (el: HTMLElement) => void;

const registry: Record<string, ComponentInit> = {
  lightbox: initLightbox,
  timeline: initTimeline,
  sidenote: initSidenote,
};

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
        init(el);
        el.dataset.hydrated = "true";
      }
    } else {
      console.warn(`Unknown component: ${componentName}`);
    }
  });
}
