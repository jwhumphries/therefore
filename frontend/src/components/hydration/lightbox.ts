/**
 * Lightbox component for image viewing.
 * Adds click-to-zoom functionality to figures.
 * Returns a cleanup function to remove event listeners.
 */
export function initLightbox(el: HTMLElement): () => void {
  const img = el.querySelector("img");
  if (!img) return () => {};

  img.style.cursor = "pointer";

  // Track active lightbox state for cleanup
  let activeCleanup: (() => void) | null = null;

  const handleImageClick = () => {
    activeCleanup = openLightbox(img.src, img.alt);
  };

  img.addEventListener("click", handleImageClick);

  // Return cleanup function
  return () => {
    img.removeEventListener("click", handleImageClick);
    // Close any open lightbox
    if (activeCleanup) {
      activeCleanup();
      activeCleanup = null;
    }
  };
}

function openLightbox(src: string, alt: string): () => void {
  // Store the element that had focus so we can restore it
  const previousFocus = document.activeElement as HTMLElement | null;

  // Create overlay
  const overlay = document.createElement("div");
  overlay.className =
    "fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.setAttribute("aria-label", alt || "Image lightbox");

  // Create image container
  const container = document.createElement("div");
  container.className = "relative max-w-full max-h-full";

  // Create image
  const img = document.createElement("img");
  img.src = src;
  img.alt = alt;
  img.className = "max-w-full max-h-[90vh] object-contain rounded-lg";

  // Create close button
  const closeBtn = document.createElement("button");
  closeBtn.className =
    "absolute -top-12 right-0 text-white text-4xl hover:text-gray-300 transition-colors";
  closeBtn.innerHTML = "&times;";
  closeBtn.setAttribute("aria-label", "Close lightbox");

  // Close handler - removes all listeners and restores focus
  const close = () => {
    document.removeEventListener("keydown", handleKeydown);
    overlay.remove();
    document.body.style.overflow = "";
    previousFocus?.focus();
  };

  const handleKeydown = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      close();
    }
    // Trap focus within the lightbox (only the close button is focusable)
    if (e.key === "Tab") {
      e.preventDefault();
      closeBtn.focus();
    }
  };

  const handleOverlayClick = (e: Event) => {
    if (e.target === overlay) close();
  };

  // Attach listeners
  overlay.addEventListener("click", handleOverlayClick);
  closeBtn.addEventListener("click", close);
  document.addEventListener("keydown", handleKeydown);

  // Prevent body scroll
  document.body.style.overflow = "hidden";

  // Assemble and mount
  container.appendChild(closeBtn);
  container.appendChild(img);
  overlay.appendChild(container);
  document.body.appendChild(overlay);

  // Focus the close button
  closeBtn.focus();

  // Return cleanup function for this lightbox instance
  return close;
}
