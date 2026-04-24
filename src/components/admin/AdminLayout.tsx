import { ReactNode } from "react";
import { Menu } from "lucide-react";
import { Sidebar } from "./Sidebar";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

interface AdminLayoutProps {
  children: ReactNode;
}

/**
 * AdminLayout — editorial shell for every admin page.
 *
 * Desktop: fixed 18rem (72 * 0.25) sidebar on the left, content shifts right.
 * Mobile: compact glass top bar with a hamburger that opens the sidebar in
 * the existing shadcn Sheet primitive.
 */
export function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <div className="min-h-screen bg-surface-canvas">
      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 inset-x-0 z-50 h-14 border-b border-rule-hairline bg-offWhite/85 backdrop-blur-md px-4 flex items-center gap-3">
        <Sheet>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Open admin navigation"
            >
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-72 border-rule-hairline">
            <Sidebar />
          </SheetContent>
        </Sheet>
        <span className="type-label text-ink-accent">Admin</span>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:z-40 lg:flex lg:w-72 lg:flex-col">
        <Sidebar />
      </div>

      {/* Main content area */}
      <div className="lg:pl-72">
        <main className="py-8 pt-20 lg:pt-10">
          <div className="px-4 sm:px-6 lg:px-10">{children}</div>
        </main>
      </div>
    </div>
  );
}
