import { StrictMode } from "react";
import { createRoot, hydrateRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import "./index.css";
import { Layout } from "./components/Layout";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { SplashPage, HomePage, PostPage, TagsPage, TagPage, AboutPage, SeriesPage } from "./pages";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 1,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ErrorBoundary>
        <Routes>
          {/* Splash page without layout */}
          <Route path="/" element={<SplashPage />} />

          {/* Main app with layout */}
          <Route element={<Layout />}>
            <Route path="/posts" element={<HomePage />} />
            <Route path="/posts/:slug" element={<PostPage />} />
            <Route path="/tags" element={<TagsPage />} />
            <Route path="/tags/:tag" element={<TagPage />} />
            <Route path="/series" element={<SeriesPage />} />
            <Route path="/about" element={<AboutPage />} />
          </Route>
        </Routes>
        </ErrorBoundary>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

const container = document.getElementById("root")!;
const app = (
  <StrictMode>
    <App />
  </StrictMode>
);

// Check if we have pre-rendered SSG content
// SSG pages have actual content inside #root, not just empty
const hasSSGContent = container.children.length > 0;

if (hasSSGContent) {
  // Hydrate onto pre-rendered HTML
  hydrateRoot(container, app);
} else {
  // Client-side render (dev mode or dynamic routes)
  createRoot(container).render(app);
}
