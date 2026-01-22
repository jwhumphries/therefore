import { Link, NavLink } from "react-router-dom";
import type { ReactNode } from "react";
import { ThemeSwitcher } from "./ThemeSwitcher";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="border-b border-border sticky top-0 bg-background/80 backdrop-blur-md z-50">
        <nav className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Link
            to="/"
            className="text-2xl font-serif font-semibold hover:text-accent transition-colors"
          >
            Therefore
          </Link>
          <div className="flex items-center gap-6">
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                `hover:text-accent transition-colors ${isActive ? "text-accent font-medium" : ""}`
              }
            >
              Posts
            </NavLink>
            <NavLink
              to="/tags"
              className={({ isActive }) =>
                `hover:text-accent transition-colors ${isActive ? "text-accent font-medium" : ""}`
              }
            >
              Tags
            </NavLink>
            <NavLink
              to="/about"
              className={({ isActive }) =>
                `hover:text-accent transition-colors ${isActive ? "text-accent font-medium" : ""}`
              }
            >
              About
            </NavLink>
            <ThemeSwitcher />
          </div>
        </nav>
      </header>

      <main className="container mx-auto px-4 py-8 flex-grow">{children}</main>

      <footer className="border-t border-border mt-auto">
        <div className="container mx-auto px-4 py-6 text-center text-sm text-muted">
          &copy; {new Date().getFullYear()} Therefore. Philosophy &amp;
          Theology.
        </div>
      </footer>
    </div>
  );
}
