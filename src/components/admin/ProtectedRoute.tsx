import { SignedIn, SignedOut, useUser, useClerk } from "@clerk/clerk-react";
import { ReactNode, useEffect } from "react";
import { Navigate } from "react-router-dom";

interface ProtectedRouteProps {
  children: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();

  useEffect(() => {
    if (isLoaded && user) {
      // Check if user has org:admin role
      const hasAdminRole = user.organizationMemberships?.some(
        (membership) => membership.role === "org:admin"
      );

      if (!hasAdminRole) {
        // Force logout if user doesn't have admin role
        signOut();
      }
    }
  }, [isLoaded, user, signOut]);

  // Show loading while checking user data
  if (!isLoaded) {
    return <div>Loading...</div>;
  }

  return (
    <>
      <SignedIn>
        {/* Only render children if user has admin role */}
        {user?.organizationMemberships?.some(
          (membership) => membership.role === "org:admin"
        ) ? (
          children
        ) : (
          <div>Checking permissions...</div>
        )}
      </SignedIn>
      <SignedOut>
        <Navigate to="/admin" replace />
      </SignedOut>
    </>
  );
}
