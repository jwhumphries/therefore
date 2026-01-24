/**
 * Hydrates server-rendered tag links to use view transitions.
 * Dispatches a custom event that React can intercept for client-side routing.
 * Returns a cleanup function to remove event listeners.
 */
export function initTagLinks(container: HTMLElement): () => void {
  const tagLinks = container.querySelectorAll<HTMLAnchorElement>("a.tag-link");
  const cleanupFns: (() => void)[] = [];

  tagLinks.forEach((link) => {
    if (link.dataset.hydrated) return;
    link.dataset.hydrated = "true";

    const handleClick = (e: Event) => {
      const href = link.getAttribute("href");
      if (!href || href.startsWith("http")) return;

      e.preventDefault();

      // Dispatch custom event for React to handle
      window.dispatchEvent(
        new CustomEvent("navigate", { detail: { to: href, transition: "slide" } })
      );
    };

    link.addEventListener("click", handleClick);

    // Store cleanup for this link
    cleanupFns.push(() => {
      link.removeEventListener("click", handleClick);
      delete link.dataset.hydrated;
    });
  });

  // Return combined cleanup function
  return () => {
    cleanupFns.forEach((fn) => fn());
  };
}
