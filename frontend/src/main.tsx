import "./index.css";
import { hydrateComponents } from "./components/hydration";

// Auto-hydrate components on page load
document.addEventListener("DOMContentLoaded", () => {
  hydrateComponents(document.body);
});

// Re-hydrate on navigation (for SPA-like behavior in the future)
window.addEventListener("popstate", () => {
  hydrateComponents(document.body);
});
