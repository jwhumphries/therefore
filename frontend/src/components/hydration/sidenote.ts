/**
 * Sidenote component using a popover for notes.
 * Creates a clickable number that shows content in a popover.
 */
export function initSidenote(el: HTMLElement): void {
  const trigger = el.querySelector<HTMLButtonElement>(".sidenote-trigger");
  const content = el.dataset.sidenoteContent;

  if (!trigger || !content) return;

  // Create popover element
  const popover = document.createElement("div");
  popover.className =
    "sidenote-popover absolute z-50 p-3 text-sm bg-overlay text-overlay-foreground border border-border rounded shadow-lg w-[min(20rem,calc(100vw-2rem))]";
  popover.style.display = "none";
  popover.innerHTML = content;

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
    requestAnimationFrame(positionPopover);
  };

  const closePopover = () => {
    popover.style.display = "none";
    isOpen = false;
    trigger.setAttribute("aria-expanded", "false");
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

  // Click handler
  trigger.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    togglePopover();
  });

  // Keyboard handler
  trigger.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      togglePopover();
    } else if (e.key === "Escape" && isOpen) {
      closePopover();
    }
  });

  // Close when clicking outside
  document.addEventListener("click", (e) => {
    if (isOpen && !el.contains(e.target as Node)) {
      closePopover();
    }
  });
}
