import { SignedIn, SignedOut, useUser, useClerk } from "@clerk/clerk-react";
import { ReactNode, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { Shield, AlertTriangle, Loader2 } from "lucide-react";
import { Eyebrow } from "@/components/ui/eyebrow";
import { WireframeWave } from "@/components/ui/wireframe-wave";

interface ProtectedRouteProps {
  children: ReactNode;
}

/**
 * ProtectedRoute — authorization wall for every admin route.
 *
 * Authorization rules preserved exactly from the original:
 *   - Clerk `org:admin` role → authorized
 *   - Email or username contains "staff" → authorized
 *   - Otherwise → denied, auto-logout after 3 seconds
 *
 * Only the loading / denied UIs have been redesigned to the editorial system.
 */
export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [authError, setAuthError] = useState<string>("");

  useEffect(() => {
    if (isLoaded && user) {
      const checkAuthorization = () => {
        try {
          const hasAdminRole =
            user.organizationMemberships?.some(
              (membership) => membership.role === "org:admin"
            ) || user.publicMetadata?.role === "org:admin";

          if (hasAdminRole) {
            setIsAuthorized(true);
            return;
          }

          const email =
            user.primaryEmailAddress?.emailAddress?.toLowerCase() || "";
          const username = user.username?.toLowerCase() || "";

          if (email.includes("staff") || username.includes("staff")) {
            setIsAuthorized(true);
            return;
          }

          setIsAuthorized(false);
          setAuthError(
            "Access denied: You must be an admin or staff member to use this application."
          );

          setTimeout(() => {
            signOut();
          }, 3000);
        } catch (error) {
          console.error("Authorization check error:", error);
          setIsAuthorized(false);
          setAuthError("Error checking authorization. Please try again.");
          setTimeout(() => {
            signOut();
          }, 3000);
        }
      };

      checkAuthorization();
    } else if (isLoaded && !user) {
      setIsAuthorized(null);
    }
  }, [isLoaded, user, signOut]);

  // Loading — editorial card with marigold pulse
  if (isLoaded && user && isAuthorized === null) {
    return (
      <div className="relative min-h-screen bg-surface-canvas flex items-center justify-center px-4 overflow-hidden">
        <WireframeWave opacity={0.04} amplitude={0.7} lines={5} />
        <div className="relative max-w-md w-full flex flex-col items-center gap-5 text-center">
          <span
            aria-hidden
            className="flex h-14 w-14 items-center justify-center bg-marigold/15 border border-marigold/30"
          >
            <Shield className="h-6 w-6 text-marigold" />
          </span>
          <Eyebrow withRule>Authorization</Eyebrow>
          <h2 className="type-headline-md text-burgundy">
            Verifying access…
          </h2>
          <p className="type-body-sm text-ink-muted max-w-sm">
            Checking your permissions against the Musica Lumina admin directory.
          </p>
          <Loader2
            className="h-4 w-4 text-marigold animate-spin mt-2"
            aria-hidden
          />
        </div>
      </div>
    );
  }

  // Denied — editorial error state
  if (isLoaded && user && isAuthorized === false) {
    return (
      <div className="relative min-h-screen bg-surface-canvas flex items-center justify-center px-4 overflow-hidden">
        <WireframeWave opacity={0.04} amplitude={0.7} lines={5} />
        <div className="relative max-w-md w-full flex flex-col items-center gap-5 text-center">
          <span
            aria-hidden
            className="flex h-14 w-14 items-center justify-center bg-[color:var(--status-error-bg)] border border-[color:var(--status-error)]/30"
          >
            <AlertTriangle className="h-6 w-6 text-[color:var(--status-error)]" />
          </span>
          <Eyebrow withRule tone="muted">
            Access denied
          </Eyebrow>
          <h2 className="type-headline-md text-burgundy">
            Not authorised.
          </h2>
          <p className="type-body-sm text-ink-body max-w-sm">{authError}</p>
          <p className="type-caption text-ink-muted italic">
            Signing you out in a few seconds…
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <SignedIn>{isAuthorized === true ? children : null}</SignedIn>
      <SignedOut>
        <Navigate to="/admin" replace />
      </SignedOut>
    </>
  );
}
