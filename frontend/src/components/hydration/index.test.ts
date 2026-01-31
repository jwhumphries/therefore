import { describe, it, expect, afterEach } from "vitest";
import { hydrateComponents, cleanupComponents } from "./index";

function createContainer(...components: string[]): HTMLElement {
  const container = document.createElement("div");
  container.className = "post-content";

  for (const name of components) {
    if (name === "sidenote") {
      const el = document.createElement("span");
      el.className = "sidenote-wrapper";
      el.dataset.component = "sidenote";
      el.dataset.sidenoteContent = "Test sidenote content";
      const trigger = document.createElement("button");
      trigger.className = "sidenote-trigger";
      el.appendChild(trigger);
      container.appendChild(el);
    } else if (name === "lightbox") {
      const el = document.createElement("figure");
      el.dataset.component = "lightbox";
      const img = document.createElement("img");
      img.src = "/test.jpg";
      img.alt = "Test";
      el.appendChild(img);
      container.appendChild(el);
    }
  }

  return container;
}

describe("hydration orchestrator", () => {
  afterEach(() => {
    cleanupComponents();
    document.querySelectorAll("[role='dialog']").forEach((el) => el.remove());
    document.body.style.overflow = "";
  });

  it("hydrates components and sets data-hydrated", () => {
    const container = createContainer("sidenote");
    hydrateComponents(container);

    const el = container.querySelector("[data-component='sidenote']") as HTMLElement;
    expect(el.dataset.hydrated).toBe("true");
    expect(el.querySelector("[role='tooltip']")).not.toBeNull();
  });

  it("skips already-hydrated elements", () => {
    const container = createContainer("sidenote");
    hydrateComponents(container);
    hydrateComponents(container);

    // Should only have one popover, not two
    const popovers = container.querySelectorAll("[role='tooltip']");
    expect(popovers.length).toBe(1);
  });

  it("clears data-hydrated on cleanup", () => {
    const container = createContainer("sidenote");
    hydrateComponents(container);

    const el = container.querySelector("[data-component='sidenote']") as HTMLElement;
    expect(el.dataset.hydrated).toBe("true");

    cleanupComponents();
    expect(el.dataset.hydrated).toBeUndefined();
  });

  it("re-hydrates after cleanup (TanStack Query refetch scenario)", () => {
    const container = createContainer("sidenote");

    // First hydration (initial data load)
    hydrateComponents(container);
    const el = container.querySelector("[data-component='sidenote']") as HTMLElement;
    const trigger = el.querySelector<HTMLButtonElement>(".sidenote-trigger")!;

    // Simulate TanStack Query refetch: cleanup runs, then re-hydrate
    cleanupComponents();
    hydrateComponents(container);

    // Sidenote should work — trigger click should open the popover
    const popover = el.querySelector("[role='tooltip']") as HTMLElement;
    expect(popover).not.toBeNull();

    trigger.click();
    expect(popover.style.display).toBe("block");
  });

  it("hydrates multiple component types", () => {
    const container = createContainer("sidenote", "lightbox");
    hydrateComponents(container);

    const sidenote = container.querySelector("[data-component='sidenote']") as HTMLElement;
    const lightbox = container.querySelector("[data-component='lightbox']") as HTMLElement;

    expect(sidenote.dataset.hydrated).toBe("true");
    expect(lightbox.dataset.hydrated).toBe("true");
  });
});
