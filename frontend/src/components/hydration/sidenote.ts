/**
 * Sidenote component for margin notes.
 * Enhances mobile behavior with click-to-reveal.
 */
export function initSidenote(el: HTMLElement): void {
  const label = el.querySelector<HTMLLabelElement>(".sidenote-number");
  const toggle = el.querySelector<HTMLInputElement>(".sidenote-toggle");
  const content = el.querySelector<HTMLElement>(".sidenote");

  if (!label || !toggle || !content) return;

  // On desktop (wide screens), sidenotes are always visible via CSS
  // On mobile, we enhance with click behavior

  // Add keyboard accessibility
  label.setAttribute("role", "button");
  label.setAttribute("tabindex", "0");
  label.setAttribute("aria-expanded", String(toggle.checked));

  const updateState = () => {
    label.setAttribute("aria-expanded", String(toggle.checked));
  };

  toggle.addEventListener("change", updateState);

  // Handle keyboard
  label.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      toggle.checked = !toggle.checked;
      updateState();
    }
  });
}
