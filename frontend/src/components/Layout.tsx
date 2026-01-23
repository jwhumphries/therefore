import { useLocation, Outlet } from "react-router-dom";
import type { ReactNode } from "react";
import { ThemeSwitcher } from "./ThemeSwitcher";
import { TransitionLink } from "./TransitionLink";

function NavLink({ to, children }: { to: string; children: ReactNode }) {
  const location = useLocation();
  const isActive = to === "/posts"
    ? location.pathname === "/posts" || location.pathname.startsWith("/posts/")
    : location.pathname.startsWith(to);

  return (
    <TransitionLink
      to={to}
      className={`hover:text-accent transition-colors ${isActive ? "text-accent font-medium" : ""}`}
    >
      {children}
    </TransitionLink>
  );
}

export function Layout() {
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
            <NavLink to="/tags">Tags</NavLink>
            <NavLink to="/about">About</NavLink>
            <ThemeSwitcher />
          </div>
        </nav>
      </header>

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
