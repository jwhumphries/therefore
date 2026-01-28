import { describe, it, expect, afterEach } from "vitest";
import { initScriptureCompare } from "./scriptureCompare";

function createScriptureCompare(altCount: number): HTMLElement {
  const el = document.createElement("div");
  el.dataset.altCount = String(altCount);
  el.dataset.altVersions = ["ESV", "KJV", "NASB"].slice(0, altCount).join(",");
  el.dataset.ref = "John 3:16";

  const label = document.createElement("div");
  label.className = "scripture-compare__alt-label";
  label.textContent = "ESV";
  el.appendChild(label);

  const position = document.createElement("span");
  position.className = "scripture-compare__position";
  position.textContent = `1/${altCount}`;
  el.appendChild(position);

  const cycleBtn = document.createElement("button");
  cycleBtn.className = "scripture-compare__cycle-btn";
  el.appendChild(cycleBtn);

  const gatewayLink = document.createElement("a");
  gatewayLink.className = "scripture-gateway-link";
  gatewayLink.href = "#";
  el.appendChild(gatewayLink);

  for (let i = 0; i < altCount; i++) {
    const panel = document.createElement("div");
    panel.className = "scripture-compare__panel";
    if (i === 0) panel.classList.add("scripture-compare__panel--active");
    panel.dataset.panelIndex = String(i);
    panel.textContent = `Content for version ${i}`;
    el.appendChild(panel);
  }

  return el;
}

describe("initScriptureCompare", () => {
  let cleanup: () => void;

  afterEach(() => {
    cleanup?.();
  });

  it("returns noop for single translation", () => {
    const el = createScriptureCompare(1);
    cleanup = initScriptureCompare(el);
    // Should not throw and should be a function
    expect(typeof cleanup).toBe("function");
  });

  it("sets aria-label on cycle button", () => {
    const el = createScriptureCompare(3);
    cleanup = initScriptureCompare(el);
    const btn = el.querySelector(".scripture-compare__cycle-btn")!;
    expect(btn.getAttribute("aria-label")).toBe("Next translation");
  });

  it("sets aria-live on version label", () => {
    const el = createScriptureCompare(3);
    cleanup = initScriptureCompare(el);
    const label = el.querySelector(".scripture-compare__alt-label")!;
    expect(label.getAttribute("aria-live")).toBe("polite");
  });

  it("sets aria-hidden on panels initially", () => {
    const el = createScriptureCompare(3);
    cleanup = initScriptureCompare(el);
    const panels = el.querySelectorAll(".scripture-compare__panel");
    expect(panels[0].getAttribute("aria-hidden")).toBe("false");
    expect(panels[1].getAttribute("aria-hidden")).toBe("true");
    expect(panels[2].getAttribute("aria-hidden")).toBe("true");
  });

  it("cycles to next panel on click", () => {
    const el = createScriptureCompare(3);
    cleanup = initScriptureCompare(el);
    const btn = el.querySelector<HTMLButtonElement>(".scripture-compare__cycle-btn")!;
    const panels = el.querySelectorAll(".scripture-compare__panel");

    btn.click();

    expect(panels[0].classList.contains("scripture-compare__panel--active")).toBe(false);
    expect(panels[1].classList.contains("scripture-compare__panel--active")).toBe(true);
    expect(panels[0].getAttribute("aria-hidden")).toBe("true");
    expect(panels[1].getAttribute("aria-hidden")).toBe("false");
  });

  it("updates label and position on cycle", () => {
    const el = createScriptureCompare(3);
    cleanup = initScriptureCompare(el);
    const btn = el.querySelector<HTMLButtonElement>(".scripture-compare__cycle-btn")!;
    const label = el.querySelector(".scripture-compare__alt-label")!;
    const position = el.querySelector(".scripture-compare__position")!;

    btn.click();

    expect(label.textContent).toBe("KJV");
    expect(position.textContent).toBe("2/3");
  });

  it("wraps around to first panel", () => {
    const el = createScriptureCompare(2);
    cleanup = initScriptureCompare(el);
    const btn = el.querySelector<HTMLButtonElement>(".scripture-compare__cycle-btn")!;
    const panels = el.querySelectorAll(".scripture-compare__panel");

    btn.click(); // → panel 1
    btn.click(); // → panel 0 (wrap)

    expect(panels[0].classList.contains("scripture-compare__panel--active")).toBe(true);
    expect(panels[1].classList.contains("scripture-compare__panel--active")).toBe(false);
  });

  it("cycles on Enter key", () => {
    const el = createScriptureCompare(2);
    cleanup = initScriptureCompare(el);
    const btn = el.querySelector<HTMLButtonElement>(".scripture-compare__cycle-btn")!;
    const panels = el.querySelectorAll(".scripture-compare__panel");

    btn.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));

    expect(panels[1].classList.contains("scripture-compare__panel--active")).toBe(true);
  });

  it("cycles on Space key", () => {
    const el = createScriptureCompare(2);
    cleanup = initScriptureCompare(el);
    const btn = el.querySelector<HTMLButtonElement>(".scripture-compare__cycle-btn")!;
    const panels = el.querySelectorAll(".scripture-compare__panel");

    btn.dispatchEvent(new KeyboardEvent("keydown", { key: " ", bubbles: true }));

    expect(panels[1].classList.contains("scripture-compare__panel--active")).toBe(true);
  });

  it("updates Bible Gateway link on cycle", () => {
    const el = createScriptureCompare(2);
    cleanup = initScriptureCompare(el);
    const btn = el.querySelector<HTMLButtonElement>(".scripture-compare__cycle-btn")!;
    const link = el.querySelector<HTMLAnchorElement>(".scripture-gateway-link")!;

    btn.click();

    expect(link.href).toContain("search=John+3%3A16");
    expect(link.href).toContain("version=KJV");
  });
});
