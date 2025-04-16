import { SignIn } from "@clerk/clerk-react";

export function AdminLogin() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-gray-100 to-gray-50 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <SignIn
          fallbackRedirectUrl="/admin/dashboard"
          withSignUp={false}
          appearance={{
            variables: {
              colorPrimary: "#E2A225",
              colorText: "#491822",
            },
            elements: {
              formFieldInput: "rounded-xl",
              rootBox: "w-full",
              card: "rounded-lg shadow-md bg-white",
              headerTitle: "text-lg text-center",
              headerSubtitle: "text-center",
            },
            layout: {
              logoImageUrl: "/logo.png",
              unsafe_disableDevelopmentModeWarnings: true,
            },
          }}
        />
      </div>
    </div>
  );
}
