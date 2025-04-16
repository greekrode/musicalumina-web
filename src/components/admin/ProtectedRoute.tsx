import { ReactNode } from "react";
import { SignedIn, SignedOut } from "@clerk/clerk-react";
import { Navigate } from "react-router-dom";
import LoadingSpinner from "@/components/LoadingSpinner";

interface ProtectedRouteProps {
  children: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  return (
    <>
      <SignedIn>
        {children}
      </SignedIn>
      <SignedOut>
        <Navigate to="/admin" replace />
      </SignedOut>
    </>
  );
}
