"use client";

import { useState } from "react";

import { useI18n } from "~/components/i18n-provider";
import { Button } from "~/components/ui";

type Service = "ai" | "elevenlabs";
type CheckState =
  | { status: "idle" }
  | { status: "checking" }
  | { status: "success" | "error"; message: string };

const labels: Record<Service, string> = {
  ai: "AI",
  elevenlabs: "ElevenLabs",
};

const initialState: Record<Service, CheckState> = {
  ai: { status: "idle" },
  elevenlabs: { status: "idle" },
};

export const ConnectionChecks = () => {
  const { t } = useI18n();
  const [checks, setChecks] = useState(initialState);

  const check = async (service: Service) => {
    setChecks((current) => ({ ...current, [service]: { status: "checking" } }));
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 15_000);

    try {
      const response = await fetch("/api/connections", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ service }),
        signal: controller.signal,
      });
      const body = (await response.json()) as { ok?: boolean; message?: string };
      if (!response.ok || !body.ok) {
        throw new Error(body.message ?? `${labels[service]} connection failed.`);
      }
      setChecks((current) => ({
        ...current,
        [service]: { status: "success", message: body.message ?? "Connected." },
      }));
    } catch (error) {
      const message =
        error instanceof DOMException && error.name === "AbortError"
          ? `${labels[service]} check timed out after 15 seconds.`
          : error instanceof Error
            ? error.message
            : `${labels[service]} connection failed.`;
      setChecks((current) => ({ ...current, [service]: { status: "error", message } }));
    } finally {
      window.clearTimeout(timeout);
    }
  };

  return (
    <section className="mt-5 border-t border-rule pt-4" aria-labelledby="connection-checks-title">
      <div>
        <h3 id="connection-checks-title" className="text-sm font-medium text-ink">
          {t("connections")}
        </h3>
        <p className="mt-1 text-xs text-ink-soft">
          {t("connectionsHint")}
        </p>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {(Object.keys(labels) as Service[]).map((service) => {
          const state = checks[service];
          return (
            <div key={service} className="rounded-lg border border-rule p-3">
              <Button
                variant="ghost"
                className="w-full"
                disabled={state.status === "checking"}
                onClick={() => void check(service)}
              >
                {state.status === "checking"
                  ? t("checkingConnection", { service: labels[service] })
                  : t("checkConnection", { service: labels[service] })}
              </Button>
              {state.status === "success" || state.status === "error" ? (
                <p
                  className={`mt-2 text-xs ${
                    state.status === "success" ? "text-accent" : "text-flag"
                  }`}
                  role="status"
                >
                  {state.status === "success" ? "✓ " : "✕ "}
                  {state.message}
                </p>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
};
