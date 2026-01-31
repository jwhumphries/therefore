/**
 * Sidenote component using a popover for notes.
 * Creates a clickable number that shows content in a popover.
 * Returns a cleanup function to remove event listeners.
 */
export function initSidenote(el: HTMLElement): () => void {
  const trigger = el.querySelector<HTMLButtonElement>(".sidenote-trigger");
  const content = el.dataset.sidenoteContent;

  if (!trigger || !content) return () => {};

  // Create popover element
  const popoverId = `sidenote-popover-${Math.random().toString(36).slice(2, 9)}`;
  const popover = document.createElement("div");
  popover.id = popoverId;
  popover.setAttribute("role", "tooltip");
  popover.className =
    "sidenote-popover absolute z-50 p-3 text-sm bg-overlay text-overlay-foreground border border-border rounded shadow-lg w-[min(20rem,calc(100vw-2rem))]";
  popover.style.display = "none";

  // Safely set HTML content using template element (prevents script execution)
  const template = document.createElement("template");
  template.innerHTML = content.trim();
  popover.appendChild(template.content.cloneNode(true));

  // Insert popover after trigger
  el.appendChild(popover);

  let isOpen = false;

  const positionPopover = () => {
    const triggerRect = trigger.getBoundingClientRect();
    const popoverRect = popover.getBoundingClientRect();

    // Position above or below based on available space
    const spaceBelow = window.innerHeight - triggerRect.bottom;
    const spaceAbove = triggerRect.top;

    if (spaceBelow >= popoverRect.height + 8 || spaceBelow >= spaceAbove) {
      // Position below
      popover.style.top = "100%";
      popover.style.bottom = "auto";
      popover.style.marginTop = "4px";
    } else {
      // Position above
      popover.style.bottom = "100%";
      popover.style.top = "auto";
      popover.style.marginBottom = "4px";
    }

    // Center horizontally, but keep within viewport
    popover.style.left = "50%";
    popover.style.transform = "translateX(-50%)";
  };

  const openPopover = () => {
    popover.style.display = "block";
    isOpen = true;
    trigger.setAttribute("aria-expanded", "true");
    trigger.setAttribute("aria-label", "Hide sidenote");
    requestAnimationFrame(positionPopover);
  };

  const closePopover = () => {
    popover.style.display = "none";
    isOpen = false;
    trigger.setAttribute("aria-expanded", "false");
    trigger.setAttribute("aria-label", "Show sidenote");
  };

  const togglePopover = () => {
    if (isOpen) {
      closePopover();
    } else {
      openPopover();
    }
  };

  // Set up ARIA attributes
  trigger.setAttribute("aria-expanded", "false");
  trigger.setAttribute("aria-haspopup", "true");
  trigger.setAttribute("aria-controls", popoverId);
  trigger.setAttribute("aria-label", "Show sidenote");

  // Event handlers (stored for cleanup)
  const handleTriggerClick = (e: Event) => {
    e.preventDefault();
    e.stopPropagation();
    togglePopover();
  };

  const handleTriggerKeydown = (e: KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      togglePopover();
    } else if (e.key === "Escape" && isOpen) {
      closePopover();
    }
  };

  const handleDocumentClick = (e: Event) => {
    if (isOpen && !el.contains(e.target as Node)) {
      closePopover();
    }
  };

  // Attach listeners
  trigger.addEventListener("click", handleTriggerClick);
  trigger.addEventListener("keydown", handleTriggerKeydown);
  document.addEventListener("click", handleDocumentClick);

  // Return cleanup function
  return () => {
    trigger.removeEventListener("click", handleTriggerClick);
    trigger.removeEventListener("keydown", handleTriggerKeydown);
    document.removeEventListener("click", handleDocumentClick);
    popover.remove();
  };
}
