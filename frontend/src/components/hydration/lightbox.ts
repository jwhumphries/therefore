/**
 * Lightbox component for image viewing.
 * Adds click-to-zoom functionality to figures.
 */
export function initLightbox(el: HTMLElement): void {
  const img = el.querySelector("img");
  if (!img) return;

  img.style.cursor = "pointer";

  img.addEventListener("click", () => {
    openLightbox(img.src, img.alt);
  });
}

function openLightbox(src: string, alt: string): void {
  // Create overlay
  const overlay = document.createElement("div");
  overlay.className = "fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4";
  overlay.style.cursor = "pointer";

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
  closeBtn.className = "absolute -top-12 right-0 text-white text-4xl hover:text-gray-300 transition-colors";
  closeBtn.innerHTML = "&times;";
  closeBtn.setAttribute("aria-label", "Close lightbox");

  // Close handlers
  const close = () => {
    overlay.remove();
    document.body.style.overflow = "";
  };

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) close();
  });
  closeBtn.addEventListener("click", close);
  document.addEventListener("keydown", function handler(e) {
    if (e.key === "Escape") {
      close();
      document.removeEventListener("keydown", handler);
    }
  });

  // Prevent body scroll
  document.body.style.overflow = "hidden";

  // Assemble and mount
  container.appendChild(closeBtn);
  container.appendChild(img);
  overlay.appendChild(container);
  document.body.appendChild(overlay);
}
