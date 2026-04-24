import { SignIn } from "@clerk/clerk-react";
import logo from "../../assets/ML-LogoColor.png";
import { WireframeWave } from "@/components/ui/wireframe-wave";
import { Eyebrow } from "@/components/ui/eyebrow";

/**
 * AdminLogin — Musical Lumina
 *
 * Editorial single-column login on canvas surface. Clerk's <SignIn> widget
 * is themed through `appearance` to match the brand palette (marigold CTA,
 * burgundy text, hairline borders, Manrope body + Noto Serif headings).
 * Behavior preserved: same fallbackRedirectUrl, same dev warning disabled.
 */
export function AdminLogin() {
  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center bg-surface-canvas px-4 sm:px-6 overflow-hidden">
      <WireframeWave opacity={0.04} amplitude={0.7} lines={6} />

      <div className="relative w-full max-w-md flex flex-col items-center gap-8">
        {/* Brand mark */}
        <div className="flex flex-col items-center gap-3">
          <img
            src={logo}
            alt="Musica Lumina"
            className="h-14 w-auto"
          />
          <Eyebrow withRule>Admin · Access</Eyebrow>
        </div>

        {/* Headline */}
        <div className="flex flex-col items-center gap-2 text-center">
          <h1 className="type-headline-lg text-burgundy">Sign in.</h1>
          <p className="type-body-sm text-ink-muted max-w-sm">
            Access restricted to Musica Lumina staff and administrators.
          </p>
        </div>

        {/* Clerk sign-in widget, themed to the brand system */}
        <SignIn
          fallbackRedirectUrl="/admin/dashboard"
          withSignUp={false}
          appearance={{
            variables: {
              colorPrimary: "#E2A225",
              colorBackground: "#FFFBEF",
              colorText: "#491822",
              colorTextSecondary: "#6b5a52",
              colorDanger: "#8b3a3a",
              colorSuccess: "#5a8c6a",
              fontFamily: "Manrope, system-ui, sans-serif",
              fontFamilyButtons: "Manrope, system-ui, sans-serif",
              borderRadius: "0.25rem",
            },
            elements: {
              rootBox: "w-full",
              card: "bg-transparent shadow-none border-0 p-0",
              header: "hidden",
              formButtonPrimary:
                "bg-marigold hover:bg-marigold-600 text-burgundy font-semibold rounded-sm normal-case tracking-[0.01em] transition-colors",
              formFieldInput:
                "rounded-sm border border-burgundy/20 bg-surface-elevated focus:border-marigold focus:ring-2 focus:ring-marigold/20",
              formFieldLabel: "text-burgundy text-sm font-medium",
              socialButtonsBlockButton:
                "border border-burgundy/20 rounded-sm hover:bg-surface-canvas-warm",
              socialButtonsBlockButtonText: "text-burgundy font-medium",
              footerActionLink:
                "text-burgundy hover:text-marigold underline-offset-2",
              identityPreviewText: "text-burgundy",
              identityPreviewEditButton: "text-marigold hover:text-marigold-600",
              dividerLine: "bg-rule-hairline",
              dividerText: "text-ink-muted text-xs uppercase tracking-wider",
              formFieldSuccessText: "text-[color:var(--status-open)]",
              formFieldErrorText: "text-[color:var(--status-error)]",
              alert: "border-l-2 border-[color:var(--status-error)] bg-[color:var(--status-error-bg)] rounded-none",
            },
            layout: {
              logoImageUrl: "",
              unsafe_disableDevelopmentModeWarnings: true,
            },
          }}
        />

        <p className="type-label text-ink-muted">
          © {new Date().getFullYear()} Musica Lumina
        </p>
      </div>
    </div>
  );
}
