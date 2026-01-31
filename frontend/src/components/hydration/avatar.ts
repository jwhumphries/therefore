import { createRoot } from "react-dom/client";
import { createElement } from "react";
import { Avatar } from "@heroui/react";

/**
 * Hydrates author avatar with HeroUI Avatar component.
 */
export function initAvatar(el: HTMLElement): void {
  const img = el.querySelector<HTMLImageElement>("img");
  if (!img) return;

  const src = img.src;
  const alt = img.alt;
  const initials = alt
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  // Create a container for React
  const container = document.createElement("div");
  container.className = "inline-block";
  el.replaceWith(container);

  // Render HeroUI Avatar with compound components
  const root = createRoot(container);
  root.render(
    createElement(
      Avatar,
      { className: "size-16" },
      createElement(Avatar.Image, { src, alt }),
      createElement(Avatar.Fallback, null, initials)
    )
  );
}
