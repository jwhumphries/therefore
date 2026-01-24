/**
 * Hydrates server-rendered tag links to use view transitions.
 * Dispatches a custom event that React can intercept for client-side routing.
 */
export function initTagLinks(container: HTMLElement): void {
  const tagLinks = container.querySelectorAll<HTMLAnchorElement>("a.tag-link");

  tagLinks.forEach((link) => {
    if (link.dataset.hydrated) return;
    link.dataset.hydrated = "true";

    link.addEventListener("click", (e) => {
      const href = link.getAttribute("href");
      if (!href || href.startsWith("http")) return;

      e.preventDefault();

      // Dispatch custom event for React to handle
      window.dispatchEvent(
        new CustomEvent("navigate", { detail: { to: href, transition: "slide" } })
      );
    });
  });
}
