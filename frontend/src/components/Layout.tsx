import { useState } from "react";
import { useLocation, Outlet } from "react-router-dom";
import type { ReactNode } from "react";
import { Button } from "@heroui/react";
import { ThemeSwitcher } from "./ThemeSwitcher";
import { TransitionLink } from "./TransitionLink";
import { useViewTransitionNavigate } from "../hooks/useViewTransition";
import { SearchModal } from "./SearchModal";

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className={className}
    >
      <path
        fillRule="evenodd"
        d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function NavLink({ to, children }: { to: string; children: ReactNode }) {
  const location = useLocation();
  const navigate = useViewTransitionNavigate();
  const isActive = to === "/posts"
    ? location.pathname === "/posts" || location.pathname.startsWith("/posts/")
    : location.pathname.startsWith(to);

  const handlePress = () => {
    if (location.pathname === to) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      navigate(to);
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onPress={handlePress}
      className={isActive ? "text-accent font-medium" : ""}
    >
      {children}
    </Button>
  );
}

export function Layout() {
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="border-b border-border sticky top-0 bg-background/80 backdrop-blur-md z-50" style={{ viewTransitionName: 'header' }}>
        <nav className="container mx-auto px-4 py-4 flex justify-between items-center">
          <TransitionLink
            to="/posts"
            className="text-2xl font-semibold hover:text-accent transition-colors"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Therefore
          </TransitionLink>
          <div className="flex items-center gap-6">
            <NavLink to="/posts">Posts</NavLink>
            <NavLink to="/series">Series</NavLink>
            <NavLink to="/tags">Tags</NavLink>
            <NavLink to="/about">About</NavLink>
            <Button
              variant="ghost"
              size="sm"
              onPress={() => setSearchOpen(true)}
              aria-label="Search posts"
            >
              <SearchIcon className="w-5 h-5" />
            </Button>
            <ThemeSwitcher />
          </div>
        </nav>
      </header>

      <SearchModal isOpen={searchOpen} onOpenChange={setSearchOpen} />

      <main className="container mx-auto px-4 py-8 flex-grow">
        <Outlet />
      </main>

      <footer className="border-t border-border mt-auto">
        <div className="container mx-auto px-4 py-6 text-center text-sm text-muted">
          &copy; {new Date().getFullYear()} Therefore. Philosophy &amp;
          Theology.
        </div>
      </footer>
    </div>
  );
}
