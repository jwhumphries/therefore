/**
 * Timeline component for chronological events.
 * Adds interactive highlighting and scroll-based animations.
 */
export function initTimeline(el: HTMLElement): void {
  const events = el.querySelectorAll<HTMLElement>(".timeline-event");

  // Add staggered entrance animation
  events.forEach((event, index) => {
    event.style.opacity = "0";
    event.style.transform = "translateX(-20px)";

    setTimeout(() => {
      event.style.transition = "opacity 0.5s ease, transform 0.5s ease";
      event.style.opacity = "1";
      event.style.transform = "translateX(0)";
    }, index * 100);
  });

  // Add click-to-highlight
  events.forEach((event) => {
    event.addEventListener("click", () => {
      // Remove highlight from all
      events.forEach((e) => e.classList.remove("bg-primary/10"));
      // Add highlight to clicked
      event.classList.add("bg-primary/10");
    });
  });
}
