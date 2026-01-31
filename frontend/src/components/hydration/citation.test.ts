import { describe, it, expect, afterEach, beforeEach } from "vitest";
import { initCitation, resetCitationRegistry } from "./citation";

function createCitation(text: string, url?: string): HTMLElement {
  const el = document.createElement("span");
  el.className = "citation-wrapper";
  el.dataset.citationText = text;
  if (url) el.dataset.citationUrl = url;

  const trigger = document.createElement("button");
  trigger.className = "citation-trigger";
  el.appendChild(trigger);

  return el;
}

describe("initCitation", () => {
  let cleanup: () => void;

  beforeEach(() => {
    resetCitationRegistry();
  });

  afterEach(() => {
    cleanup?.();
  });

  it("returns noop when no trigger", () => {
    const el = document.createElement("span");
    el.dataset.citationText = "test";
    cleanup = initCitation(el);
    expect(typeof cleanup).toBe("function");
  });

  it("returns noop when no text", () => {
    const el = document.createElement("span");
    const trigger = document.createElement("button");
    trigger.className = "citation-trigger";
    el.appendChild(trigger);
    cleanup = initCitation(el);
    expect(typeof cleanup).toBe("function");
  });

  it("creates popover with role tooltip", () => {
    const el = createCitation("Source text");
    cleanup = initCitation(el);
    const popover = el.querySelector("[role='tooltip']");
    expect(popover).not.toBeNull();
  });

  it("assigns sequential citation numbers", () => {
    const el1 = createCitation("First");
    const el2 = createCitation("Second");
    const cleanup1 = initCitation(el1);
    const cleanup2 = initCitation(el2);

    expect(el1.dataset.citationNumber).toBe("1");
    expect(el2.dataset.citationNumber).toBe("2");

    cleanup1();
    cleanup2();
    cleanup = () => {};
  });

  it("sets ARIA attributes on trigger", () => {
    const el = createCitation("Test citation");
    cleanup = initCitation(el);
    const trigger = el.querySelector(".citation-trigger")!;

    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(trigger.getAttribute("aria-haspopup")).toBe("true");
    expect(trigger.getAttribute("aria-controls")).toBeTruthy();
  });

  it("toggles popover on click", () => {
    const el = createCitation("Click test");
    cleanup = initCitation(el);
    const trigger = el.querySelector<HTMLButtonElement>(".citation-trigger")!;
    const popover = el.querySelector("[role='tooltip']") as HTMLElement;

    trigger.click();
    expect(popover.style.display).toBe("block");
    expect(trigger.getAttribute("aria-expanded")).toBe("true");

    trigger.click();
    expect(popover.style.display).toBe("none");
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
  });

  it("includes link when URL is provided", () => {
    const el = createCitation("Source text", "https://example.com");
    cleanup = initCitation(el);
    const link = el.querySelector("a");
    expect(link).not.toBeNull();
    expect(link!.href).toBe("https://example.com/");
    expect(link!.target).toBe("_blank");
  });

  it("has no link when URL is not provided", () => {
    const el = createCitation("Just text");
    cleanup = initCitation(el);
    const link = el.querySelector("a");
    expect(link).toBeNull();
  });

  it("closes on Escape key", () => {
    const el = createCitation("Escape test");
    cleanup = initCitation(el);
    const trigger = el.querySelector<HTMLButtonElement>(".citation-trigger")!;
    const popover = el.querySelector("[role='tooltip']") as HTMLElement;

    trigger.click(); // open
    trigger.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));

    expect(popover.style.display).toBe("none");
  });

  it("removes popover on cleanup", () => {
    const el = createCitation("Cleanup test");
    cleanup = initCitation(el);
    const popoverId = el.querySelector("[role='tooltip']")!.id;

    cleanup();
    cleanup = () => {};

    expect(el.querySelector(`#${popoverId}`)).toBeNull();
  });
});
