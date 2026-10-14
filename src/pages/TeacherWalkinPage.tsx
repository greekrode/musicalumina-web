import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { AlertTriangle, CheckCircle2, Loader2, MapPin } from "lucide-react";
import { useLanguage } from "../lib/LanguageContext";
import PageTransition from "../components/PageTransition";
import { edgeFunctions, supabase } from "../lib/supabase";
import { Turnstile, type TurnstileHandle } from "../components/Turnstile";
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
 * and WhatsApp. The teacher-walkin Edge Function does every check.
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
  verification: false,
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

export default function TeacherWalkinPage() {
  const { t } = useLanguage();
  const { eventId = "" } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const turnstileRef = useRef<TurnstileHandle>(null);
  const token = new URLSearchParams(location.hash.slice(1)).get("t");

  const [eventTitle, setEventTitle] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [done, setDone] = useState(false);

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
    const turnstileToken = turnstileRef.current?.getToken() ?? null;
    if (!turnstileToken) {
      setErrorCode("verification");
      return;
    }
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
        turnstileToken,
      });
      navigate({ hash: `t=${linkToken}` }, { replace: true });
    } catch (error) {
      fail(error);
    } finally {
      setIsVerifying(false);
      turnstileRef.current?.reset();
    }
  };

  const onSubmit = async (data: WalkinForm) => {
    setErrorCode(null);
    setIsSubmitting(true);
    try {
      await teacherWalkin({ action: "submit", token, ...data });
      setDone(true);
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
              {!done && <PageHeaderLede>{t("pageCopy.teacherWalkin.lede")}</PageHeaderLede>}
            </PageHeader>
          </Container>
        </section>

        <Section tone="canvas" pause="md" rule="top">
          <Container>
            <div className="max-w-xl mx-auto flex flex-col gap-8">
              {done ? (
                <StatusBanner kind="success">
                  <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
                  <span className="type-body-md font-semibold">
                    {t("pageCopy.teacherWalkin.success")}
                  </span>
                </StatusBanner>
              ) : token ? (
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
              ) : (
                <div className="flex flex-col gap-6">
                  <Eyebrow withRule>{t("pageCopy.teacherWalkin.step1")}</Eyebrow>
                  <p className="type-body-md text-ink-body flex items-start gap-3">
                    <MapPin className="h-5 w-5 flex-shrink-0 text-marigold mt-0.5" />
                    {t("pageCopy.teacherWalkin.locationHelp")}
                  </p>
                  <Turnstile ref={turnstileRef} action="teacher" className="flex justify-center" />
                  {errorCode && <ErrorBanner code={errorCode} onStartOver={startOver} />}
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
        {RESTART_BY_ERROR[code] && (
          <Button type="button" variant="outline" size="sm" onClick={onStartOver} className="self-start">
            {t("pageCopy.teacherWalkin.startOver")}
          </Button>
        )}
      </div>
    </StatusBanner>
  );
}

function StatusBanner({ kind, children }: { kind: "success" | "error"; children: React.ReactNode }) {
  return (
    <div
      role="status"
      className={cn(
        "border-l-2 px-5 py-4 flex items-start gap-3 type-body-sm",
        kind === "success"
          ? "border-[color:var(--status-open)] bg-[color:var(--status-open-bg)] text-[color:var(--status-open)]"
          : "border-[color:var(--status-error)] bg-[color:var(--status-error-bg)] text-[color:var(--status-error)]"
      )}
    >
      {children}
    </div>
  );
}
