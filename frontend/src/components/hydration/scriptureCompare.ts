/**
 * Scripture Compare component: cycles through alternate translation panels.
 * Updates the version label, position indicator, and Bible Gateway link.
 */
export function initScriptureCompare(el: HTMLElement): () => void {
  const altCount = parseInt(el.dataset.altCount || "0", 10);
  if (altCount <= 1) return () => {};

  const altVersions = (el.dataset.altVersions || "").split(",");
  const ref = el.dataset.ref || "";
  const panels = el.querySelectorAll<HTMLElement>(".scripture-compare__panel");
  const label = el.querySelector<HTMLElement>(".scripture-compare__alt-label");
  const position = el.querySelector<HTMLElement>(
    ".scripture-compare__position",
  );
  const cycleBtn = el.querySelector<HTMLButtonElement>(
    ".scripture-compare__cycle-btn",
  );
  const gatewayLink = el.querySelector<HTMLAnchorElement>(
    ".scripture-gateway-link",
  );

  if (!cycleBtn || panels.length === 0) return () => {};

  cycleBtn.setAttribute("aria-label", "Next translation");
  if (label) label.setAttribute("aria-live", "polite");

  // Set initial aria-hidden on inactive panels
  panels.forEach((panel, i) => {
    panel.setAttribute("aria-hidden", i === 0 ? "false" : "true");
  });

  let current = 0;

  function update(next: number) {
    panels[current].classList.remove("scripture-compare__panel--active");
    panels[current].setAttribute("aria-hidden", "true");
    panels[next].classList.add("scripture-compare__panel--active");
    panels[next].setAttribute("aria-hidden", "false");
    current = next;

    if (label) label.textContent = altVersions[current] || "";
    if (position) position.textContent = `${current + 1}/${altCount}`;
    if (gatewayLink && ref) {
      const encoded = ref.replace(/ /g, "+").replace(/:/g, "%3A");
      const version = altVersions[current] || "";
      gatewayLink.href = `https://www.biblegateway.com/passage/?search=${encoded}&version=${version}`;
    }
  }

  const handleClick = () => {
    update((current + 1) % altCount);
  };

  const handleKeydown = (e: KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      update((current + 1) % altCount);
    }
  };

  cycleBtn.addEventListener("click", handleClick);
  cycleBtn.addEventListener("keydown", handleKeydown);

  return () => {
    cycleBtn.removeEventListener("click", handleClick);
    cycleBtn.removeEventListener("keydown", handleKeydown);
  };
}
