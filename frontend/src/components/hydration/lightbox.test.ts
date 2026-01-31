import { describe, it, expect, afterEach } from "vitest";
import { initLightbox } from "./lightbox";

function createFigure(src = "/test.jpg", alt = "Test image"): HTMLElement {
  const el = document.createElement("figure");
  el.dataset.component = "lightbox";
  const img = document.createElement("img");
  img.src = src;
  img.alt = alt;
  el.appendChild(img);
  return el;
}

describe("initLightbox", () => {
  let cleanup: () => void;

  afterEach(() => {
    cleanup?.();
    // Remove any leftover overlays
    document.querySelectorAll("[role='dialog']").forEach((el) => el.remove());
    document.body.style.overflow = "";
  });

  it("returns noop when no img", () => {
    const el = document.createElement("figure");
    cleanup = initLightbox(el);
    expect(typeof cleanup).toBe("function");
  });

  it("sets cursor pointer on image", () => {
    const el = createFigure();
    cleanup = initLightbox(el);
    const img = el.querySelector("img")!;
    expect(img.style.cursor).toBe("pointer");
  });

  it("opens lightbox overlay on click", () => {
    const el = createFigure();
    cleanup = initLightbox(el);
    const img = el.querySelector("img")!;

    img.click();

    const overlay = document.querySelector("[role='dialog']");
    expect(overlay).not.toBeNull();
    expect(overlay!.getAttribute("aria-modal")).toBe("true");
  });

  it("prevents body scroll when open", () => {
    const el = createFigure();
    cleanup = initLightbox(el);
    const img = el.querySelector("img")!;

    img.click();

    expect(document.body.style.overflow).toBe("hidden");
  });

  it("closes on Escape key", () => {
    const el = createFigure();
    cleanup = initLightbox(el);
    const img = el.querySelector("img")!;

    img.click();
    expect(document.querySelector("[role='dialog']")).not.toBeNull();

    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(document.querySelector("[role='dialog']")).toBeNull();
    expect(document.body.style.overflow).toBe("");
  });

  it("closes on close button click", () => {
    const el = createFigure();
    cleanup = initLightbox(el);
    const img = el.querySelector("img")!;

    img.click();
    const closeBtn = document.querySelector("[aria-label='Close lightbox']") as HTMLButtonElement;
    expect(closeBtn).not.toBeNull();

    closeBtn.click();
    expect(document.querySelector("[role='dialog']")).toBeNull();
  });

  it("closes on overlay background click", () => {
    const el = createFigure();
    cleanup = initLightbox(el);
    const img = el.querySelector("img")!;

    img.click();
    const overlay = document.querySelector("[role='dialog']") as HTMLElement;

    // Click directly on overlay (not on child elements)
    overlay.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(document.querySelector("[role='dialog']")).toBeNull();
  });

  it("sets alt text as aria-label", () => {
    const el = createFigure("/img.jpg", "A beautiful sunset");
    cleanup = initLightbox(el);
    const img = el.querySelector("img")!;

    img.click();
    const overlay = document.querySelector("[role='dialog']")!;
    expect(overlay.getAttribute("aria-label")).toBe("A beautiful sunset");
  });

  it("cleans up open lightbox on component cleanup", () => {
    const el = createFigure();
    cleanup = initLightbox(el);
    const img = el.querySelector("img")!;

    img.click();
    expect(document.querySelector("[role='dialog']")).not.toBeNull();

    cleanup();
    cleanup = () => {};
    expect(document.querySelector("[role='dialog']")).toBeNull();
    expect(document.body.style.overflow).toBe("");
  });
});
