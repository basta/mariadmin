/**
 * A certificate of authenticity for one painting, ready to print.
 *
 * Nothing typed here is saved. The site's data lives in a public repository,
 * which is no place for a buyer's name, so the fields start again each time and
 * the server draws the PDF and forgets it.
 *
 * The preview is the real PDF drawn as a picture by the server, so there is only
 * one layout and what she checks here is what prints.
 */

import { useEffect, useState } from "react";

import { api, type CertificateFields } from "./api";
import { Field, Sheet } from "./bits";

/** Long enough that a name being typed does not ask for a picture per letter. */
const PREVIEW_DELAY_MS = 500;

function today(): string {
  return new Intl.DateTimeFormat("cs-CZ", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());
}

/**
 * Hand the finished file over.
 *
 * Opened from the home screen, iOS has no downloads to put a file in and a
 * download link can leave her stuck in a viewer with no way back to the app, so
 * there it goes to the share sheet, which has Save to Files, mail and WhatsApp.
 * Everywhere else, including Android's home-screen app, a plain download works
 * and a share sheet would only be missing the "save" she came for.
 */
async function deliver(blob: Blob, name: string): Promise<void> {
  const file = new File([blob], name, { type: "application/pdf" });
  const homeScreenIos =
    (navigator as Navigator & { standalone?: boolean }).standalone === true;

  if (homeScreenIos && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file] });
      return;
    } catch (error) {
      // Closing the share sheet is an answer. Anything else falls through.
      if (error instanceof DOMException && error.name === "AbortError") return;
    }
  }

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export function CertificateSheet({
  id,
  title,
  year,
  onClose,
}: {
  id: number;
  title: string;
  year: string;
  onClose: () => void;
}) {
  const [fields, setFields] = useState<CertificateFields>(() => ({
    title: title.trim(),
    year,
    technique: "",
    size: "",
    buyer: "",
    date: today(),
  }));
  const [preview, setPreview] = useState<string | null>(null);
  const [drawing, setDrawing] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (name: keyof CertificateFields) => (value: string) =>
    setFields((all) => ({ ...all, [name]: value }));

  useEffect(() => {
    const control = new AbortController();
    setDrawing(true);
    const timer = setTimeout(() => {
      api
        .certificatePreview(id, fields, control.signal)
        .then((image) => {
          setPreview(URL.createObjectURL(image));
          setError(null);
          setDrawing(false);
        })
        .catch((failure: unknown) => {
          if (control.signal.aborted) return;
          setError(
            failure instanceof Error ? failure.message : "Náhled se nepovedl.",
          );
          setDrawing(false);
        });
    }, PREVIEW_DELAY_MS);
    return () => {
      clearTimeout(timer);
      control.abort();
    };
  }, [id, fields]);

  useEffect(() => {
    if (!preview) return;
    return () => URL.revokeObjectURL(preview);
  }, [preview]);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const pdf = await api.certificate(id, fields);
      // Characters a phone will not put in a filename.
      const name = fields.title.trim().replace(/[\\/:*?"<>|]/g, "");
      await deliver(pdf, `Certifikát ${name}.pdf`);
    } catch (failure) {
      setError(
        failure instanceof Error ? failure.message : "PDF se nepovedlo.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet
      title="Certifikát pravosti"
      onClose={onClose}
      footer={
        <button
          type="button"
          className="btn btn--gold"
          disabled={saving}
          onClick={() => void save()}
        >
          {saving ? "Připravuji…" : "Stáhnout PDF"}
        </button>
      }
    >
      {error ? <p className="error">{error}</p> : null}

      <div className={`certificate ${drawing ? "certificate--stale" : ""}`}>
        {preview ? <img src={preview} alt="Náhled certifikátu" /> : null}
      </div>

      <Field label="Název">
        <input
          className="input"
          type="text"
          maxLength={120}
          value={fields.title}
          onChange={(event) => set("title")(event.target.value)}
        />
      </Field>
      <Field label="Rok">
        <input
          className="input"
          type="text"
          inputMode="numeric"
          maxLength={20}
          placeholder="např. 2023"
          value={fields.year}
          onChange={(event) => set("year")(event.target.value)}
        />
      </Field>
      <Field label="Technika">
        <input
          className="input"
          type="text"
          maxLength={80}
          placeholder="např. akryl na plátně"
          value={fields.technique}
          onChange={(event) => set("technique")(event.target.value)}
        />
      </Field>
      <Field label="Rozměr" hint="V centimetrech, stačí napsat 60x80">
        <input
          className="input"
          type="text"
          maxLength={40}
          placeholder="např. 60 × 80 cm"
          value={fields.size}
          onChange={(event) => set("size")(event.target.value)}
        />
      </Field>
      <Field
        label="Vystaveno pro"
        hint="Ve 4. pádu, tedy komu: Jana Nováka, paní Marii Svobodovou"
      >
        <input
          className="input"
          type="text"
          maxLength={80}
          value={fields.buyer}
          onChange={(event) => set("buyer")(event.target.value)}
        />
      </Field>
      <Field label="Datum">
        <input
          className="input"
          type="text"
          maxLength={40}
          value={fields.date}
          onChange={(event) => set("date")(event.target.value)}
        />
      </Field>
    </Sheet>
  );
}
