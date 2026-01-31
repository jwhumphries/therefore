import { describe, it, expect, afterEach } from "vitest";
import { initSidenote } from "./sidenote";

function createSidenote(content: string): HTMLElement {
  const el = document.createElement("span");
  el.className = "sidenote-wrapper";
  el.dataset.sidenoteContent = content;

  const trigger = document.createElement("button");
  trigger.className = "sidenote-trigger";
  el.appendChild(trigger);

  return el;
}

describe("initSidenote", () => {
  let cleanup: () => void;

  afterEach(() => {
    cleanup?.();
  });

  it("returns noop when no trigger", () => {
    const el = document.createElement("span");
    el.dataset.sidenoteContent = "test";
    cleanup = initSidenote(el);
    expect(typeof cleanup).toBe("function");
  });

  it("returns noop when no content", () => {
    const el = document.createElement("span");
    const trigger = document.createElement("button");
    trigger.className = "sidenote-trigger";
    el.appendChild(trigger);
    cleanup = initSidenote(el);
    expect(typeof cleanup).toBe("function");
  });

  it("creates popover element", () => {
    const el = createSidenote("Test note content");
    cleanup = initSidenote(el);
    const popover = el.querySelector("[role='tooltip']");
    expect(popover).not.toBeNull();
    expect(popover!.getAttribute("role")).toBe("tooltip");
  });

  it("sets ARIA attributes on trigger", () => {
    const el = createSidenote("Test note");
    cleanup = initSidenote(el);
    const trigger = el.querySelector(".sidenote-trigger")!;

    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(trigger.getAttribute("aria-haspopup")).toBe("true");
    expect(trigger.getAttribute("aria-controls")).toBeTruthy();
    expect(trigger.getAttribute("aria-label")).toBe("Show sidenote");
  });

  it("opens popover on click", () => {
    const el = createSidenote("Click test");
    cleanup = initSidenote(el);
    const trigger = el.querySelector<HTMLButtonElement>(".sidenote-trigger")!;
    const popover = el.querySelector("[role='tooltip']") as HTMLElement;

    trigger.click();

    expect(popover.style.display).toBe("block");
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
  });

  it("closes popover on second click", () => {
    const el = createSidenote("Toggle test");
    cleanup = initSidenote(el);
    const trigger = el.querySelector<HTMLButtonElement>(".sidenote-trigger")!;
    const popover = el.querySelector("[role='tooltip']") as HTMLElement;

    trigger.click(); // open
    trigger.click(); // close

    expect(popover.style.display).toBe("none");
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
  });

  it("opens on Enter key", () => {
    const el = createSidenote("Key test");
    cleanup = initSidenote(el);
    const trigger = el.querySelector<HTMLButtonElement>(".sidenote-trigger")!;
    const popover = el.querySelector("[role='tooltip']") as HTMLElement;

    trigger.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));

    expect(popover.style.display).toBe("block");
  });

  it("closes on Escape key", () => {
    const el = createSidenote("Escape test");
    cleanup = initSidenote(el);
    const trigger = el.querySelector<HTMLButtonElement>(".sidenote-trigger")!;
    const popover = el.querySelector("[role='tooltip']") as HTMLElement;

    trigger.click(); // open
    trigger.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));

    expect(popover.style.display).toBe("none");
  });

  it("closes on outside click", () => {
    const el = createSidenote("Outside test");
    document.body.appendChild(el);
    cleanup = initSidenote(el);
    const trigger = el.querySelector<HTMLButtonElement>(".sidenote-trigger")!;
    const popover = el.querySelector("[role='tooltip']") as HTMLElement;

    trigger.click(); // open
    document.body.dispatchEvent(new Event("click", { bubbles: true }));

    expect(popover.style.display).toBe("none");
    el.remove();
  });

  it("removes popover on cleanup", () => {
    const el = createSidenote("Cleanup test");
    cleanup = initSidenote(el);
    const popoverId = el.querySelector("[role='tooltip']")!.id;

    cleanup();
    cleanup = () => {}; // prevent double cleanup

    expect(el.querySelector(`#${popoverId}`)).toBeNull();
  });
});
