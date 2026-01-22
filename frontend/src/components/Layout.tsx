import { Link, NavLink } from "react-router-dom";
import type { ReactNode } from "react";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="border-b border-divider sticky top-0 bg-background/80 backdrop-blur-md z-50">
        <nav className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Link
            to="/"
            className="text-2xl font-serif font-semibold hover:text-primary transition-colors"
          >
            Therefore
          </Link>
          <div className="flex gap-6">
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                `hover:text-primary transition-colors ${isActive ? "text-primary font-medium" : ""}`
              }
            >
              Posts
            </NavLink>
            <NavLink
              to="/tags"
              className={({ isActive }) =>
                `hover:text-primary transition-colors ${isActive ? "text-primary font-medium" : ""}`
              }
            >
              Tags
            </NavLink>
            <NavLink
              to="/about"
              className={({ isActive }) =>
                `hover:text-primary transition-colors ${isActive ? "text-primary font-medium" : ""}`
              }
            >
              About
            </NavLink>
          </div>
        </nav>
      </header>

      <main className="container mx-auto px-4 py-8 flex-grow">{children}</main>

      <footer className="border-t border-divider mt-auto">
        <div className="container mx-auto px-4 py-6 text-center text-sm text-default-500">
          &copy; {new Date().getFullYear()} Therefore. Philosophy &amp;
          Theology.
        </div>
      </footer>
    </div>
  );
}
