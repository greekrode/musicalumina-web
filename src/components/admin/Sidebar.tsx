import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useClerk, SignOutButton } from "@clerk/clerk-react";
import { Button } from "@/components/ui/button";

const navigation = [
  { name: "Overview", href: "/admin/dashboard" },
  { name: "Events", href: "/admin/events" },
  { name: "Registrations", href: "/admin/registrations" },
  { name: "Masterclass", href: "/admin/masterclass" },
];

export function Sidebar() {
  const location = useLocation();
  const { signOut } = useClerk();

  return (
    <div className="flex h-full grow flex-col gap-y-5 overflow-y-auto bg-white px-6 pb-4 border-r">
      <div className="flex h-16 shrink-0 items-center">
        <img className="h-8 w-auto" src="/logo.png" alt="Musicalumina" />
      </div>
      <nav className="flex flex-1 flex-col">
        <ul role="list" className="flex flex-1 flex-col gap-y-7">
          <li>
            <ul role="list" className="-mx-2 space-y-1">
              {navigation.map((item) => (
                <li key={item.name}>
                  <Link
                    to={item.href}
                    className={cn(
                      location.pathname === item.href
                        ? "bg-gray-50 text-primary"
                        : "text-gray-700 hover:text-primary hover:bg-gray-50",
                      "group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold"
                    )}
                  >
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </li>
          <li className="mt-auto">
            <SignOutButton redirectUrl="/admin">
              <Button
                variant="ghost"
                className="w-full justify-start text-gray-700 hover:text-primary hover:bg-gray-50"
              >
                Sign Out
              </Button>
            </SignOutButton>
          </li>
        </ul>
      </nav>
    </div>
  );
}
