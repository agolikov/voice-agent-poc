"use client";

import { useRef, useState } from "react";

import { useI18n } from "~/components/i18n-provider";
import { Button, Card, fieldClass, Label, Select } from "~/components/ui";
import {
  beatCountPresets,
  beatCountRange,
  type SessionSettings,
} from "~/lib/session/settings";
import { downscaleImage } from "~/lib/image/downscale";
import type { ScenarioTemplate } from "~/lib/scenario/schema";
import { useDictation } from "~/lib/speech/use-dictation";

type Props = {
  settings: SessionSettings;
  onSettingsChange: (settings: SessionSettings) => void;
  onCreated: (template: ScenarioTemplate) => void;
};

export const ScenarioComposer = ({ settings, onSettingsChange, onCreated }: Props) => {
  const { locale, t } = useI18n();
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [imageContext, setImageContext] = useState("");
  const [reading, setReading] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const dictation = useDictation({ locale, value: description, onChange: setDescription });
  const examples = [t("exampleParcel"), t("exampleRemote"), t("exampleMechanic")];

  const { min, max } = beatCountRange[settings.beatCount];

  /**
   * Read the photo the moment it is attached rather than at generation time, so
   * the learner sees what the model got off it — and can fix a misread price —
   * before a scene is written on top of it.
   */
  const attach = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    setReading(true);
    try {
      const image = await downscaleImage(file);
      setPhoto(image);
      const response = await fetch("/api/scenarios/vision", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ image, uiLocale: locale }),
      });
      const body = (await response.json()) as { context?: string; error?: string };
      if (!response.ok || !body.context) {
        throw new Error(body.error ?? t("couldNotReadPhoto"));
      }
      setImageContext(body.context);
    } catch (thrown) {
      setError(thrown instanceof Error ? thrown.message : t("couldNotReadPhoto"));
    } finally {
      setReading(false);
    }
  };

  const removePhoto = () => {
    setPhoto(null);
    setImageContext("");
    if (fileInput.current) fileInput.current.value = "";
  };

  const create = async () => {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/scenarios/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ description, imageContext, settings, uiLocale: locale }),
      });
      const body = (await response.json()) as { template?: ScenarioTemplate; error?: string };
      if (!response.ok || !body.template) {
        throw new Error(body.error ?? t("couldNotWrite"));
      }
      setDescription("");
      removePhoto();
      onCreated(body.template);
    } catch (thrown) {
      setError(thrown instanceof Error ? thrown.message : t("somethingWrong"));
    } finally {
      setBusy(false);
    }
  };

  // A photo is a brief on its own: a menu is enough to build a scene from with
  // nothing typed at all.
  const ready = description.trim().length >= 3 || imageContext.trim().length > 0;

  return (
    <Card className="p-5">
      <Label>{t("describeOwn")}</Label>
      <textarea
        className={`${fieldClass} min-h-20 resize-y`}
        placeholder={t("describePlaceholder")}
        value={description}
        onChange={(event) => setDescription(event.target.value)}
      />
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <Button
          variant={dictation.listening ? "danger" : "ghost"}
          onClick={dictation.listening ? dictation.stop : dictation.start}
          disabled={busy || dictation.supported === false}
          className="flex items-center gap-2"
        >
          <span
            aria-hidden="true"
            className={`h-2 w-2 rounded-full ${dictation.listening ? "animate-pulse bg-flag" : "bg-accent"}`}
          />
          {dictation.listening ? t("stopDictation") : t("startDictation")}
        </Button>
        <Button
          variant="ghost"
          onClick={() => fileInput.current?.click()}
          disabled={busy || reading}
        >
          {reading ? t("readingPhoto") : photo ? t("replacePhoto") : t("addPhoto")}
        </Button>
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          /* No `capture`: it would send a phone straight to the camera and cut
             off the gallery, and half the time the menu was photographed
             yesterday. The OS picker offers the camera as its first option
             anyway. */
          className="hidden"
          onChange={(event) => void attach(event.target.files?.[0])}
        />
        <span className="text-xs text-ink-soft" role="status" aria-live="polite">
          {dictation.listening ? t("listening") : null}
          {dictation.supported === false ? t("micUnsupported") : null}
          {dictation.error === "denied" ? t("micDenied") : null}
          {dictation.error === "no-speech" ? t("micNoSpeech") : null}
          {dictation.error === "failed" ? t("micError") : null}
        </span>
      </div>
      <p className="mt-2 text-xs text-ink-soft">{t("addPhotoHint")}</p>

      {photo ? (
        <div className="mt-4 rounded-lg border border-rule bg-paper p-4">
          <div className="flex items-start gap-4">
            {/* The photo never leaves this step, so a plain <img> on a data URL
                is right here: next/image would only try to optimise it. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photo}
              alt={t("photoAlt")}
              className="h-24 w-24 shrink-0 rounded-md border border-rule object-cover"
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-3">
                <Label>{t("whatPhotoShows")}</Label>
                <button
                  type="button"
                  onClick={removePhoto}
                  disabled={busy}
                  className="text-xs text-flag hover:underline disabled:opacity-40"
                >
                  {t("removePhoto")}
                </button>
              </div>
              <p className="mb-2 text-xs text-ink-soft">{t("whatPhotoShowsHint")}</p>
            </div>
          </div>
          <textarea
            className={`${fieldClass} mt-1 min-h-32 resize-y font-mono text-xs`}
            placeholder={reading ? t("readingPhoto") : ""}
            value={imageContext}
            onChange={(event) => setImageContext(event.target.value)}
          />
        </div>
      ) : null}

      <div className="mt-3 flex flex-wrap gap-1.5">
        {examples.map((example) => (
          <button
            key={example}
            type="button"
            onClick={() => setDescription(example)}
            className="rounded-full border border-rule px-2.5 py-1 text-xs text-ink-soft transition hover:border-accent"
          >
            {example}
          </button>
        ))}
      </div>
      <div className="mt-4 grid items-end gap-4 sm:grid-cols-2">
        {/* Scene length only shapes situations you write; the curated ones already have their beats. */}
        <Select
          label={t("sceneLength")}
          value={settings.beatCount}
          options={beatCountPresets.map((preset) => ({
            value: preset,
            label: `${t(preset)} — ${beatCountRange[preset].min}–${beatCountRange[preset].max} ${t("beats")}`,
          }))}
          onChange={(value) => onSettingsChange({ ...settings, beatCount: value })}
          hint={t("sceneBeatsHint", { min, max })}
        />
        <div className="flex items-center gap-3 pb-5">
          <Button onClick={create} disabled={busy || reading || !ready} variant="ghost">
            {busy ? t("writingScene") : t("writeIt")}
          </Button>
          {error ? <span className="text-xs text-flag">{error}</span> : null}
        </div>
      </div>
    </Card>
  );
};
