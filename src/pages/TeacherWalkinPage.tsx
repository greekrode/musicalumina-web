import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { AlertTriangle, Check, CheckCircle2, Copy, Loader2, MapPin, RotateCw } from "lucide-react";
import { useLanguage } from "../lib/LanguageContext";
import PageTransition from "../components/PageTransition";
import { edgeFunctions, supabase } from "../lib/supabase";
import { Section, Container } from "@/components/ui/section";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eyebrow } from "@/components/ui/eyebrow";
import {
  PageHeader,
  PageHeaderEyebrow,
  PageHeaderLede,
  PageHeaderTitle,
} from "@/components/ui/page-header";
import { cn } from "@/lib/utils";
import { usePageTitle } from "../hooks/usePageTitle";

/**
 * Walk-in teacher form, opened from the QR printed for an event
 * (/teacher-walkin/:eventId). Step 1 proves the visitor is at the venue on an
 * event day and gets a single-use link (#t=<token>); step 2 sends name, email
 * and WhatsApp and gets back a signed entry pass, shown as a QR for the door's
 * QR scanner and kept in localStorage so reopening the page shows it again.
 * The teacher-walkin Edge Function does every check.
 */

/**
 * Error codes from teacher-walkin plus the browser's location failures, each
 * marked with whether only a fresh link (scanning the QR again) fixes it.
 */
const RESTART_BY_ERROR: Record<string, boolean> = {
  closed: false,
  not_event_day: false,
  too_far: false,
  invalid_link: true,
  link_used: true,
  link_expired: true,
  invalid_input: false,
  rate_limited: false,
  location_denied: false,
  location_unavailable: false,
  location_unsupported: false,
  generic: false,
};

class WalkinError extends Error {
  constructor(public code: string) {
    super(code);
  }
}

/** Which "turn location on" steps to show. */
type Platform = "iosSafari" | "iosApp" | "android" | "mac" | "other";

/**
 * Best-effort guess from the user agent; it only picks help text. Browsers
 * never re-ask for location once it is blocked, so the page can only explain
 * how to unblock it. In-app browsers (WhatsApp, Instagram, LINE…) usually
 * can't share location at all, so those visitors are sent to a real browser.
 */
function detectDevice(): { platform: Platform; inApp: boolean } {
  const ua = navigator.userAgent;
  const ios = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  const android = /Android/.test(ua);
  const inApp =
    /FBAN|FBAV|FB_IAB|Instagram|Line\/|WhatsApp|TikTok|musical_ly|BytedanceWebview|Twitter|Snapchat|GSA\//i.test(ua) ||
    (android && /; wv\)/.test(ua)) ||
    (ios && !/Safari\//.test(ua)); // iOS web views drop the Safari token
  const platform: Platform = ios
    ? /CriOS|FxiOS|EdgiOS|OPiOS/.test(ua) ? "iosApp" : "iosSafari"
    : android ? "android" : /Macintosh/.test(ua) ? "mac" : "other";
  return { platform, inApp };
}

const DEVICE = detectDevice();
const LOCATION_ERRORS: Record<string, true> = { location_denied: true, location_unavailable: true };

async function teacherWalkin<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await edgeFunctions.invoke<T>("teacher-walkin", { body });
  if (error) {
    const detail: unknown = error instanceof FunctionsHttpError ? await error.context.json().catch(() => null) : null;
    const code =
      detail && typeof detail === "object" && "code" in detail && typeof detail.code === "string"
        ? detail.code
        : "generic";
    throw new WalkinError(code);
  }
  return data as T;
}

type WalkinForm = { name: string; email: string; whatsapp: string };

function createSchema(t: (key: string) => string): z.ZodType<WalkinForm> {
  return z.object({
    name: z.string().trim().min(2, t("pageCopy.teacherWalkin.nameRequired")).max(120),
    email: z.string().trim().email(t("pageCopy.teacherWalkin.emailInvalid")).max(254),
    whatsapp: z
      .string()
      .trim()
      .max(40)
      .refine(
        (v) => /^[+\d\s().-]+$/.test(v) && v.replace(/\D/g, "").length >= 8 && v.replace(/\D/g, "").length <= 15,
        t("pageCopy.teacherWalkin.whatsappInvalid")
      ),
  });
}

/** The signed entry pass from a successful submit, and the name it was submitted with. */
type EntryPass = { pass: string; name: string };

export default function TeacherWalkinPage() {
  const { t } = useLanguage();
  const { eventId = "" } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const token = new URLSearchParams(location.hash.slice(1)).get("t");
  const storageKey = `teacher-walkin-pass:${eventId}`;

  const [eventTitle, setEventTitle] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [entryPass, setEntryPass] = useState<EntryPass | null>(() => {
    try {
      const stored: unknown = JSON.parse(localStorage.getItem(storageKey) ?? "null");
      return stored && typeof stored === "object" && "pass" in stored && "name" in stored &&
        typeof stored.pass === "string" && typeof stored.name === "string"
        ? { pass: stored.pass, name: stored.name }
        : null;
    } catch {
      return null;
    }
  });
  const [locationBlocked, setLocationBlocked] = useState(false);

  usePageTitle(t("pageCopy.teacherWalkin.title"));

  useEffect(() => {
    let cancelled = false;
    supabase
      .from("events")
      .select("title")
      .eq("id", eventId)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) setEventTitle(data?.title ?? null);
      });
    return () => {
      cancelled = true;
    };
  }, [eventId]);

  // Show the unblock steps before the tap when the browser already says "denied";
  // clear them if the visitor allows location in settings and comes back.
  useEffect(() => {
    let status: PermissionStatus | null = null;
    let cancelled = false;
    const update = () => status && setLocationBlocked(status.state === "denied");
    navigator.permissions
      ?.query({ name: "geolocation" })
      .then((s) => {
        if (cancelled) return;
        status = s;
        update();
        s.addEventListener("change", update);
      })
      .catch(() => {}); // not supported: the error after the tap explains instead
    return () => {
      cancelled = true;
      status?.removeEventListener("change", update);
    };
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<WalkinForm>({
    resolver: zodResolver(createSchema(t)),
    defaultValues: { name: "", email: "", whatsapp: "" },
  });

  const fail = (error: unknown) => {
    const code = error instanceof WalkinError ? error.code : "generic";
    setErrorCode(Object.prototype.hasOwnProperty.call(RESTART_BY_ERROR, code) ? code : "generic");
  };

  const verify = async () => {
    setErrorCode(null);
    if (!navigator.geolocation) {
      setErrorCode("location_unsupported");
      return;
    }
    setIsVerifying(true);
    try {
      let position: GeolocationPosition;
      try {
        position = await new Promise<GeolocationPosition>((resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 20_000,
            maximumAge: 0,
          })
        );
      } catch (error) {
        const denied = error instanceof GeolocationPositionError && error.code === error.PERMISSION_DENIED;
        throw new WalkinError(denied ? "location_denied" : "location_unavailable");
      }
      const { token: linkToken } = await teacherWalkin<{ token: string }>({
        action: "open",
        eventId,
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
      });
      navigate({ hash: `t=${linkToken}` }, { replace: true });
    } catch (error) {
      fail(error);
    } finally {
      setIsVerifying(false);
    }
  };

  const onSubmit = async (data: WalkinForm) => {
    setErrorCode(null);
    setIsSubmitting(true);
    try {
      const { pass } = await teacherWalkin<{ pass: string }>({ action: "submit", token, ...data });
      const issued = { pass, name: data.name.trim() };
      setEntryPass(issued);
      try {
        localStorage.setItem(storageKey, JSON.stringify(issued));
      } catch {
        // Private browsing: the pass still shows now; the teacher can screenshot it.
      }
      navigate({ hash: "" }, { replace: true }); // the link is used up
    } catch (error) {
      fail(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const startOver = () => {
    setErrorCode(null);
    navigate({ hash: "" }, { replace: true });
  };

  return (
    <PageTransition>
      <div className="bg-surface-canvas">
        <section className="pt-28 md:pt-32 lg:pt-36 pb-10 md:pb-12">
          <Container>
            <PageHeader align="start" className="max-w-3xl">
              <PageHeaderEyebrow>{eventTitle ?? t("pageCopy.teacherWalkin.eyebrow")}</PageHeaderEyebrow>
              <PageHeaderTitle size="xl">{t("pageCopy.teacherWalkin.title")}</PageHeaderTitle>
              {(token || !entryPass) && <PageHeaderLede>{t("pageCopy.teacherWalkin.lede")}</PageHeaderLede>}
            </PageHeader>
          </Container>
        </section>

        <Section tone="canvas" pause="md" rule="top">
          <Container>
            <div className="max-w-xl mx-auto flex flex-col gap-8">
              {token ? (
                <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-6">
                  <Eyebrow withRule>{t("pageCopy.teacherWalkin.step2")}</Eyebrow>
                  <Field id="name" label={t("pageCopy.teacherWalkin.name")} error={errors.name?.message}>
                    <Input
                      variant="boxed"
                      id="name"
                      autoComplete="name"
                      {...register("name")}
                      aria-invalid={errors.name ? true : undefined}
                    />
                  </Field>
                  <Field id="email" label={t("pageCopy.teacherWalkin.email")} error={errors.email?.message}>
                    <Input
                      variant="boxed"
                      id="email"
                      type="email"
                      autoComplete="email"
                      inputMode="email"
                      {...register("email")}
                      aria-invalid={errors.email ? true : undefined}
                    />
                  </Field>
                  <Field
                    id="whatsapp"
                    label={t("pageCopy.teacherWalkin.whatsapp")}
                    help={t("pageCopy.teacherWalkin.whatsappHelp")}
                    error={errors.whatsapp?.message}
                  >
                    <Input
                      variant="boxed"
                      id="whatsapp"
                      type="tel"
                      autoComplete="tel"
                      inputMode="tel"
                      placeholder="0812 3456 7890"
                      {...register("whatsapp")}
                      aria-invalid={errors.whatsapp ? true : undefined}
                    />
                  </Field>
                  {errorCode && (
                    <ErrorBanner code={errorCode} onStartOver={startOver} />
                  )}
                  <Button type="submit" size="lg" disabled={isSubmitting} className="w-full">
                    {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                    {isSubmitting
                      ? t("pageCopy.teacherWalkin.submitting")
                      : t("pageCopy.teacherWalkin.submit")}
                  </Button>
                </form>
              ) : entryPass ? (
                <EntryPassCard entryPass={entryPass} />
              ) : (
                <div className="flex flex-col gap-6">
                  <Eyebrow withRule>{t("pageCopy.teacherWalkin.step1")}</Eyebrow>
                  <p className="type-body-md text-ink-body flex items-start gap-3">
                    <MapPin className="h-5 w-5 flex-shrink-0 text-marigold mt-0.5" />
                    {t("pageCopy.teacherWalkin.locationHelp")}
                  </p>
                  {DEVICE.inApp && <InAppNotice />}
                  {(errorCode || locationBlocked) && (
                    <ErrorBanner code={errorCode ?? "location_denied"} onStartOver={startOver} />
                  )}
                  <Button type="button" size="lg" onClick={verify} disabled={isVerifying} className="w-full">
                    {isVerifying && <Loader2 className="h-4 w-4 animate-spin" />}
                    {isVerifying
                      ? t("pageCopy.teacherWalkin.verifying")
                      : t("pageCopy.teacherWalkin.verify")}
                  </Button>
                </div>
              )}
            </div>
          </Container>
        </Section>
      </div>
    </PageTransition>
  );
}

function EntryPassCard({ entryPass }: { entryPass: EntryPass }) {
  const { t } = useLanguage();
  const [qrDataUrl, setQrDataUrl] = useState("");

  useEffect(() => {
    let cancelled = false;
    // ECC Q like the printed passes; the scanner reads the raw ML2 string.
    QRCode.toDataURL(entryPass.pass, { width: 720, margin: 2, errorCorrectionLevel: "Q" })
      .then((url) => {
        if (!cancelled) setQrDataUrl(url);
      })
      .catch((error) => console.error("Entry pass QR failed:", error));
    return () => {
      cancelled = true;
    };
  }, [entryPass.pass]);

  return (
    <div className="flex flex-col gap-6">
      <StatusBanner kind="success">
        <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
        <span className="type-body-md font-semibold">{t("pageCopy.teacherWalkin.success")}</span>
      </StatusBanner>
      <div className="bg-white border border-rule-hairline p-6 flex flex-col items-center gap-4 text-center">
        <Eyebrow>{t("pageCopy.teacherWalkin.passEyebrow")}</Eyebrow>
        {qrDataUrl ? (
          <img src={qrDataUrl} alt={t("pageCopy.teacherWalkin.passAlt")} className="w-64 h-64 sm:w-72 sm:h-72" />
        ) : (
          <div className="w-64 h-64 sm:w-72 sm:h-72 bg-surface-canvas-warm" />
        )}
        <p className="type-body-lg font-semibold text-burgundy">{entryPass.name}</p>
        <p className="type-body-sm text-ink-body">{t("pageCopy.teacherWalkin.passShow")}</p>
        <p className="type-caption text-ink-muted">{t("pageCopy.teacherWalkin.passSave")}</p>
      </div>
    </div>
  );
}

function Field({
  id,
  label,
  help,
  error,
  children,
}: {
  id: string;
  label: string;
  help?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <Label variant="editorial" htmlFor={id}>
        {label} <span className="text-[color:var(--status-error)]">*</span>
      </Label>
      {children}
      {error ? (
        <p className="mt-2 type-caption text-[color:var(--status-error)]">{error}</p>
      ) : (
        help && <p className="mt-2 type-caption text-ink-muted">{help}</p>
      )}
    </div>
  );
}

function ErrorBanner({ code, onStartOver }: { code: string; onStartOver: () => void }) {
  const { t } = useLanguage();
  return (
    <StatusBanner kind="error">
      <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
      <div className="flex flex-col gap-3">
        <span>{t(`pageCopy.teacherWalkin.errors.${code}`)}</span>
        {LOCATION_ERRORS[code] && <LocationSteps />}
        {RESTART_BY_ERROR[code] && (
          <Button type="button" variant="outline" size="sm" onClick={onStartOver} className="self-start">
            {t("pageCopy.teacherWalkin.startOver")}
          </Button>
        )}
      </div>
    </StatusBanner>
  );
}

function LocationSteps() {
  const { t } = useLanguage();
  if (DEVICE.platform === "other") return null;
  const steps = t(`pageCopy.teacherWalkin.locationSteps.${DEVICE.platform}`).split("\n");
  return (
    <div className="flex flex-col gap-3 text-ink-body">
      <span className="font-semibold">{t("pageCopy.teacherWalkin.locationStepsTitle")}</span>
      <ol className="list-decimal pl-5 flex flex-col gap-1.5">
        {steps.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>
      <Button type="button" variant="outline" size="sm" onClick={() => window.location.reload()} className="self-start">
        <RotateCw className="h-4 w-4" />
        {t("pageCopy.teacherWalkin.reload")}
      </Button>
    </div>
  );
}

function InAppNotice() {
  const { t } = useLanguage();
  const [copied, setCopied] = useState(false);
  const href = window.location.href;
  const copy = () =>
    navigator.clipboard?.writeText(href).then(
      () => setCopied(true),
      () => {} // some in-app browsers block the clipboard; the link stays visible to long-press
    );
  return (
    <StatusBanner kind="warn">
      <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
      <div className="flex flex-col gap-3 min-w-0">
        <span className="font-semibold">{t("pageCopy.teacherWalkin.inAppTitle")}</span>
        <span>{t("pageCopy.teacherWalkin.inAppBody")}</span>
        <span className="type-caption break-all select-all text-ink-body">{href}</span>
        <Button type="button" variant="outline" size="sm" onClick={copy} className="self-start">
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {copied ? t("pageCopy.teacherWalkin.linkCopied") : t("pageCopy.teacherWalkin.copyLink")}
        </Button>
      </div>
    </StatusBanner>
  );
}

function StatusBanner({ kind, children }: { kind: "success" | "warn" | "error"; children: React.ReactNode }) {
  return (
    <div
      role="status"
      className={cn(
        "border-l-2 px-5 py-4 flex items-start gap-3 type-body-sm",
        kind === "success"
          ? "border-[color:var(--status-open)] bg-[color:var(--status-open-bg)] text-[color:var(--status-open)]"
          : kind === "warn"
            ? "border-[color:var(--status-upcoming)] bg-[color:var(--status-upcoming-bg)] text-[color:var(--status-upcoming)]"
            : "border-[color:var(--status-error)] bg-[color:var(--status-error-bg)] text-[color:var(--status-error)]"
      )}
    >
      {children}
    </div>
  );
}
