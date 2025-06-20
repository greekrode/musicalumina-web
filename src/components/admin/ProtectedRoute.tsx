import { SignedIn, SignedOut, useUser, useClerk } from "@clerk/clerk-react";
import { ReactNode, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { Shield, AlertTriangle } from "lucide-react";

interface ProtectedRouteProps {
  children: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [authError, setAuthError] = useState<string>('');

  useEffect(() => {
    if (isLoaded && user) {
      // Check authorization
      const checkAuthorization = () => {
        try {
          // Check for org:admin role
          const hasAdminRole = user.organizationMemberships?.some(
            membership => membership.role === 'org:admin'
          ) || user.publicMetadata?.role === 'org:admin';

          if (hasAdminRole) {
            setIsAuthorized(true);
            return;
          }

          // Check if email or username contains 'staff'
          const email = user.primaryEmailAddress?.emailAddress?.toLowerCase() || '';
          const username = user.username?.toLowerCase() || '';
          
          const hasStaffInEmail = email.includes('staff');
          const hasStaffInUsername = username.includes('staff');

          if (hasStaffInEmail || hasStaffInUsername) {
            setIsAuthorized(true);
            return;
          }

          // If neither condition is met, user is not authorized
          setIsAuthorized(false);
          setAuthError('Access denied: You must be an admin or staff member to use this application.');

          // Force logout after a short delay to show the error message
          setTimeout(() => {
            signOut();
          }, 3000);

        } catch (error) {
          console.error('Authorization check error:', error);
          setIsAuthorized(false);
          setAuthError('Error checking authorization. Please try again.');
          
          setTimeout(() => {
            signOut();
          }, 3000);
        }
      };

      checkAuthorization();
    } else if (isLoaded && !user) {
      // User is not signed in
      setIsAuthorized(null);
    }
  }, [isLoaded, user, signOut]);

  // Loading state while checking authorization
  if (isLoaded && user && isAuthorized === null) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-musica-cream via-amber-50 to-musica-cream flex items-center justify-center">
        <div className="text-center bg-white/80 backdrop-blur-lg rounded-2xl p-8 border border-musica-burgundy/10 shadow-xl max-w-md w-full">
          <div className="w-16 h-16 bg-musica-gold rounded-xl flex items-center justify-center shadow-lg mx-auto mb-6 animate-pulse">
            <Shield className="w-8 h-8 text-musica-burgundy" />
          </div>
          <h2 className="text-2xl font-bold text-musica-burgundy mb-4">
            Checking Authorization...
          </h2>
          <p className="text-musica-burgundy/70">
            Please wait while we verify your access permissions.
          </p>
        </div>
      </div>
    );
  }

  // Authorization failed state
  if (isLoaded && user && isAuthorized === false) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-red-25 to-red-50 flex items-center justify-center">
        <div className="text-center bg-white/80 backdrop-blur-lg rounded-2xl p-8 border border-red-200 shadow-xl max-w-md w-full">
          <div className="w-16 h-16 bg-red-100 rounded-xl flex items-center justify-center shadow-lg mx-auto mb-6">
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-red-700 mb-4">
            Access Denied
          </h2>
          <p className="text-red-600 mb-6">
            {authError}
          </p>
          <p className="text-red-500 text-sm">
            You will be signed out automatically in a few seconds...
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <SignedIn>
        {/* Only render children if user is authorized */}
        {isAuthorized === true ? children : null}
      </SignedIn>
      <SignedOut>
        <Navigate to="/admin" replace />
      </SignedOut>
    </>
  );
}
