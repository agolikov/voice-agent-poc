"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { useI18n } from "~/components/i18n-provider";

/**
 * Delete one row from the history list.
 *
 * It asks before it deletes, and asks inline rather than through `confirm()`:
 * the control sits a few pixels from the two download links, and what it throws
 * away cannot be reconstructed — the call it transcribed is over, and
 * ElevenLabs is not asked to replay it.
 */
export const DeleteConversation = ({ sessionId }: { sessionId: string }) => {
  const { t } = useI18n();
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const remove = async () => {
    setBusy(true);
    setFailed(false);
    try {
      const response = await fetch(`/api/sessions/${sessionId}`, { method: "DELETE" });
      if (!response.ok) throw new Error(String(response.status));
      // `busy` stays set: the row is gone from the database, and clearing it
      // would flash the buttons back for the frame before the list re-renders.
      router.refresh();
    } catch {
      setBusy(false);
      setFailed(true);
    }
  };

  if (!confirming) {
    return (
      <button type="button" onClick={() => setConfirming(true)} className="text-flag hover:underline">
        {t("deleteConversation")}
      </button>
    );
  }

  return (
    <span className="flex flex-wrap items-center gap-2">
      <span className="text-ink-soft">
        {failed ? t("deleteConversationFailed") : t("deleteConversationConfirm")}
      </span>
      <button
        type="button"
        onClick={remove}
        disabled={busy}
        className="font-medium text-flag hover:underline disabled:opacity-40"
      >
        {busy ? t("deletingConversation") : t("deleteConversation")}
      </button>
      <button
        type="button"
        onClick={() => setConfirming(false)}
        disabled={busy}
        className="text-ink-soft hover:underline disabled:opacity-40"
      >
        {t("cancel")}
      </button>
    </span>
  );
};
