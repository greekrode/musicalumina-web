import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";

/**
 * Cloudflare Turnstile bot check (managed widget "musicalumina-web").
 *
 * Renders explicitly so each form keeps its own widget id: tokens are
 * single-use, so call `reset()` after every request that consumed one.
 * The edge functions verify the token server-side (action + hostname).
 */
export const TURNSTILE_SITE_KEY = "0x4AAAAAAFOPGgNxd2bh6m_c";

type TurnstileApi = {
  render(el: HTMLElement, opts: Record<string, unknown>): string;
  reset(id?: string): void;
  remove(id: string): void;
  getResponse(id?: string): string | undefined;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

let scriptPromise: Promise<TurnstileApi> | null = null;

function loadTurnstile(): Promise<TurnstileApi> {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  scriptPromise ??= new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async = true;
    script.onload = () => (window.turnstile ? resolve(window.turnstile) : reject(new Error("Turnstile unavailable")));
    script.onerror = () => {
      scriptPromise = null;
      reject(new Error("Turnstile failed to load"));
    };
    document.head.appendChild(script);
  });
  return scriptPromise;
}

export type TurnstileHandle = {
  /** Current token, or null if the check has not passed yet. */
  getToken(): string | null;
  /** Get a fresh token for the next request (tokens are single-use). */
  reset(): void;
};

export const Turnstile = forwardRef<TurnstileHandle, { action: string; className?: string }>(
  function Turnstile({ action, className }, ref) {
    const container = useRef<HTMLDivElement>(null);
    const widgetId = useRef<string | null>(null);
    const token = useRef<string | null>(null);

    useImperativeHandle(ref, () => ({
      getToken: () => (widgetId.current && window.turnstile?.getResponse(widgetId.current)) || token.current,
      reset: () => {
        token.current = null;
        if (widgetId.current) window.turnstile?.reset(widgetId.current);
      },
    }));

    useEffect(() => {
      let cancelled = false;
      loadTurnstile()
        .then((api) => {
          if (cancelled || !container.current) return;
          widgetId.current = api.render(container.current, {
            sitekey: TURNSTILE_SITE_KEY,
            action,
            appearance: "interaction-only",
            callback: (t: string) => (token.current = t),
            "expired-callback": () => (token.current = null),
            "error-callback": () => (token.current = null),
          });
        })
        .catch((error) => console.error(error));
      return () => {
        cancelled = true;
        if (widgetId.current) window.turnstile?.remove(widgetId.current);
        widgetId.current = null;
      };
    }, [action]);

    return <div ref={container} className={className} />;
  }
);
