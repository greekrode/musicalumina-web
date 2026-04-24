import { Link, useLocation } from "react-router-dom";
import { SignOutButton } from "@clerk/clerk-react";
import { LogOut } from "lucide-react";
import logo from "../../assets/ML-LogoColor.png";
import { cn } from "@/lib/utils";

/**
 * Sidebar — admin navigation panel.
 *
 * Editorial chrome: ivory canvas surface, serif nav labels with an animated
 * marigold left-rule marking the active route, clearly grouped under a
 * small eyebrow. Sign-out moved to the bottom with a ghost treatment.
 * Routes and destinations are unchanged.
 */

interface NavItem {
  name: string;
  href: string;
}

const NAV_ITEMS: readonly NavItem[] = [
  { name: "Overview", href: "/admin/dashboard" },
  { name: "Events", href: "/admin/events" },
  { name: "Event Categories", href: "/admin/event-categories" },
  { name: "Event Jury", href: "/admin/jury" },
  { name: "Registrations", href: "/admin/registrations" },
  { name: "Masterclass", href: "/admin/masterclass" },
];

export function Sidebar() {
  const location = useLocation();

  return (
    <div className="flex h-full grow flex-col gap-7 overflow-y-auto bg-surface-elevated border-r border-rule-hairline px-6 py-6">
      {/* Brand mark */}
      <Link
        to="/admin/dashboard"
        className="flex items-center gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-marigold rounded-sm"
      >
        <img src={logo} alt="Musica Lumina" className="h-9 w-auto" />
        <span className="type-label text-ink-accent">Admin</span>
      </Link>

      {/* Navigation */}
      <nav className="flex flex-1 flex-col gap-6">
        <div>
          <span className="type-label text-ink-muted flex items-center gap-3 mb-3 px-2">
            <span
              aria-hidden
              className="inline-block h-px w-5 bg-marigold"
            />
            Manage
          </span>
          <ul className="flex flex-col gap-0.5">
            {NAV_ITEMS.map((item) => {
              const isActive =
                location.pathname === item.href ||
                location.pathname.startsWith(`${item.href}/`);
              return (
                <li key={item.href}>
                  <Link
                    to={item.href}
                    aria-current={isActive ? "page" : undefined}
                    className={cn(
                      "relative group flex items-center px-4 py-2.5 font-serif text-body-md transition-colors duration-fast ease-out-quart rounded-sm",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-marigold",
                      isActive
                        ? "text-burgundy bg-surface-canvas-warm"
                        : "text-ink-body hover:text-burgundy hover:bg-surface-canvas-warm/60"
                    )}
                  >
                    <span
                      aria-hidden
                      className={cn(
                        "absolute left-0 top-2 bottom-2 w-[2px] bg-marigold origin-top transition-transform duration-base ease-out-quart",
                        isActive ? "scale-y-100" : "scale-y-0"
                      )}
                    />
                    {item.name}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Sign out — pinned to bottom */}
        <div className="mt-auto pt-4 border-t border-rule-hairline">
          <SignOutButton redirectUrl="/admin">
            <button
              type="button"
              className={cn(
                "w-full flex items-center gap-2 px-4 py-2.5 type-label text-ink-muted hover:text-burgundy hover:bg-surface-canvas-warm/60 rounded-sm transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-marigold"
              )}
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign out
            </button>
          </SignOutButton>
        </div>
      </nav>
    </div>
  );
}
