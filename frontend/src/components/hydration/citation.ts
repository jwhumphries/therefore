interface CitationData {
  number: number;
  text: string;
  url: string;
}

// Track citations across all elements for the accordion
let citationRegistry: CitationData[] = [];
let accordionElement: HTMLElement | null = null;

/**
 * Citation component using a popover for inline references.
 * Creates a clickable number [1] that shows citation text and link in a popover.
 * Returns a cleanup function to remove event listeners.
 */
export function initCitation(el: HTMLElement): () => void {
  const trigger = el.querySelector<HTMLButtonElement>(".citation-trigger");
  const text = el.dataset.citationText;
  const url = el.dataset.citationUrl;

  if (!trigger || !text) return () => {};

  // Assign citation number based on order (matches CSS counter)
  const citationNumber = citationRegistry.length + 1;
  citationRegistry.push({ number: citationNumber, text, url: url || "" });

  // Store the citation number on the element for reference
  el.dataset.citationNumber = String(citationNumber);

  // Create popover element
  const popoverId = `citation-popover-${citationNumber}`;
  const popover = document.createElement("div");
  popover.id = popoverId;
  popover.setAttribute("role", "tooltip");
  popover.className =
    "citation-popover absolute z-50 p-3 text-sm bg-overlay text-overlay-foreground border border-border rounded shadow-lg w-[min(20rem,calc(100vw-2rem))]";
  popover.style.display = "none";

  // Build popover content with citation text and link
  const contentWrapper = document.createElement("div");
  contentWrapper.className = "flex flex-col gap-2";

  const textEl = document.createElement("span");
  textEl.className = "text-foreground";
  textEl.textContent = text;
  contentWrapper.appendChild(textEl);

  if (url) {
    const linkEl = document.createElement("a");
    linkEl.href = url;
    linkEl.target = "_blank";
    linkEl.rel = "noopener noreferrer";
    linkEl.className =
      "text-accent hover:underline text-xs flex items-center gap-1";
    linkEl.innerHTML = `View source <svg aria-hidden="true" class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>`;
    contentWrapper.appendChild(linkEl);
  }

  popover.appendChild(contentWrapper);

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
    trigger.setAttribute("aria-label", "Hide citation");
    requestAnimationFrame(positionPopover);
  };

  const closePopover = () => {
    popover.style.display = "none";
    isOpen = false;
    trigger.setAttribute("aria-expanded", "false");
    trigger.setAttribute("aria-label", "Show citation");
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
  trigger.setAttribute("aria-label", `Show citation ${citationNumber}`);

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

/**
 * Build and insert the citations accordion at the end of the article.
 * Should be called after all citations are hydrated.
 */
export function buildCitationsAccordion(container: HTMLElement): () => void {
  if (citationRegistry.length === 0) return () => {};

  // Find the article content area
  const contentArea = container.querySelector(".content") || container;

  // Create the accordion
  accordionElement = document.createElement("details");
  accordionElement.className = "citations-accordion mt-12 border-t border-border py-6";

  const summary = document.createElement("summary");
  summary.className =
    "cursor-pointer text-sm font-medium text-muted hover:text-foreground transition-colors flex items-center gap-2";
  summary.innerHTML = `
    <svg aria-hidden="true" class="citations-chevron w-4 h-4 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
    </svg>
    Citations (${citationRegistry.length})
  `;
  accordionElement.appendChild(summary);

  const list = document.createElement("ol");
  list.className = "citations-list mt-4 space-y-2 text-sm";

  for (const citation of citationRegistry) {
    const li = document.createElement("li");
    li.className = "flex gap-2";

    const numSpan = document.createElement("span");
    numSpan.className = "text-muted flex-shrink-0";
    numSpan.textContent = `[${citation.number}]`;
    li.appendChild(numSpan);

    if (citation.url) {
      const link = document.createElement("a");
      link.href = citation.url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.className = "text-accent hover:underline";
      link.textContent = citation.text;
      link.insertAdjacentHTML("beforeend", ' <svg aria-hidden="true" class="inline-block w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>');
      li.appendChild(link);
    } else {
      const textSpan = document.createElement("span");
      textSpan.textContent = citation.text;
      li.appendChild(textSpan);
    }

    list.appendChild(li);
  }

  accordionElement.appendChild(list);
  contentArea.appendChild(accordionElement);

  return () => {
    if (accordionElement) {
      accordionElement.remove();
      accordionElement = null;
    }
  };
}

/**
 * Reset the citation registry. Call this when navigating away from a post.
 */
export function resetCitationRegistry(): void {
  citationRegistry = [];
  if (accordionElement) {
    accordionElement.remove();
    accordionElement = null;
  }
}
