"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button, Label, fieldClass } from "~/components/ui";
import { useI18n } from "~/components/i18n-provider";

const errorKey = { invalid: "unlockWrong", throttled: "unlockThrottled" } as const;

export const UnlockForm = ({ next }: { next: string }) => {
  const { t } = useI18n();
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (checking || !code.trim()) return;
    setChecking(true);
    setError(null);
    try {
      const response = await fetch("/api/unlock", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ passcode: code, next }),
      });
      const payload = (await response.json().catch(() => null)) as {
        redirectTo?: string;
        error?: keyof typeof errorKey;
      } | null;

      if (!response.ok) {
        setError(t(errorKey[payload?.error ?? "invalid"] ?? "unlockFailed"));
        setChecking(false);
        return;
      }

      // A full navigation rather than router.push: the cookie the gate needs
      // arrived on this response, and the proxy only sees it on a new request.
      window.location.href = payload?.redirectTo ?? next;
    } catch {
      setError(t("unlockFailed"));
      setChecking(false);
    }
  };

  return (
    <form onSubmit={submit} className="mt-6 space-y-3">
      <label className="block">
        <Label>{t("unlockLabel")}</Label>
        <input
          type="password"
          autoFocus
          autoComplete="one-time-code"
          className={fieldClass}
          value={code}
          onChange={(event) => setCode(event.target.value)}
          aria-invalid={error !== null}
          aria-describedby={error ? "unlock-error" : undefined}
        />
      </label>
      {error ? (
        <p id="unlock-error" role="alert" className="text-sm text-flag">
          {error}
        </p>
      ) : null}
      <Button type="submit" disabled={checking || !code.trim()} className="w-full">
        {checking ? t("unlockChecking") : t("unlockAction")}
      </Button>
    </form>
  );
};
