/**
 * The one screen for editing anything.
 *
 * A photograph chosen here is *held* until Uložit. The old form uploaded on
 * file-select, so every time she looked at a picture and changed her mind it
 * left a file behind in images/ that nothing referenced and nobody would ever
 * find again.
 */

import { useEffect, useState } from "react";

import { api, thumb, type Item, type Link, type Resource } from "./api";
import { createFeedItem, FEED_FIELDS } from "./FeedTab";
import {
  Confirm,
  Field,
  linkLooksWrong,
  LinksEditor,
  Sheet,
  Toggle,
} from "./bits";

const TITLE: Record<Resource, { edit: string; add: string }> = {
  paintings: { edit: "Obraz", add: "Nový obraz" },
  galerie: { edit: "Fotka v galerii", add: "Nová fotka" },
  projekty: { edit: "Projekt", add: "Nový projekt" },
  vystavy: { edit: "Výstava", add: "Nová výstava" },
};

/** Every field this sheet can show, as the form holds them: never null. */
interface Values {
  title: string;
  sold: boolean;
  date: string;
  description: string;
  video: string;
  links: Link[];
}

/**
 * A record's fields, in form terms.
 *
 * Both the initial state and the did-anything-change comparison go through
 * here, so the two cannot drift apart and start reporting an edit that never
 * happened.
 */
function valuesOf(item: Item | null): Values {
  return {
    title: item?.title ?? "",
    sold: Boolean(item?.sold),
    date: item?.date ?? "",
    description: item?.description ?? "",
    video: item?.video_url ?? "",
    links: item?.links ?? [],
  };
}

export function EditSheet({
  resource,
  item,
  onClose,
  onSaved,
  onDeleted,
  onMove,
}: {
  resource: Resource;
  /** null when adding a project or exhibition from scratch. */
  item: Item | null;
  onClose: () => void;
  onSaved: (saved: Item) => void;
  onDeleted: (id: number) => void;
  /** Start or end of its block on the page; the sheet stays open. */
  onMove?: (where: "start" | "end") => Promise<void>;
}) {
  const start = valuesOf(item);
  const [title, setTitle] = useState(start.title);
  const [sold, setSold] = useState(start.sold);
  const [date, setDate] = useState(start.date);
  const [description, setDescription] = useState(start.description);
  const [video, setVideo] = useState(start.video);
  const [links, setLinks] = useState<Link[]>(start.links);

  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // A local preview of a photograph that has not been uploaded yet, and no
  // object URL left behind when it is replaced or the sheet closes.
  useEffect(() => {
    if (!photo) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(photo);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photo]);

  const isNew = item === null;
  const isFeed = resource === "projekty" || resource === "vystavy";
  const shown =
    preview ??
    (item?.image_path ? thumb(item.image_path, 800, item.image_v) : null);

  /** The editable fields of one set of values, shaped the way the API wants. */
  function bodyOf(values: Values): Partial<Item> {
    if (isFeed) {
      return {
        title: values.title,
        date: values.date || null,
        links: values.links.filter((link) => link.url.trim() !== ""),
        ...(resource === "projekty"
          ? {
              description: values.description || null,
              video_url: values.video || null,
            }
          : {}),
      };
    }
    return resource === "paintings"
      ? { title: values.title, sold: values.sold }
      : {};
  }

  async function save() {
    // Checked before anything is sent: a scheme-less address is a link to a
    // page on her own site that does not exist, and it would go live looking
    // exactly like a working one.
    if (links.some((link) => linkLooksWrong(link.url))) {
      setError("Opravte prosím odkaz — adresa má začínat na https://");
      return;
    }
    if (video.trim() !== "" && linkLooksWrong(video)) {
      setError("Opravte prosím odkaz na video — má začínat na https://");
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const body = bodyOf({ title, sold, date, description, video, links });

      let saved: Item;
      if (isNew) {
        saved = await createFeedItem(resource, body, photo);
      } else {
        saved = item;
        // Only send an update that updates something. Galerie photographs have
        // no editable fields at all, so their body is always empty: sending it
        // rewrote the file for nothing and put a second line — "Upravena fotka
        // v galerii" — in the banner beside the photo swap that was the one
        // thing she actually did.
        if (JSON.stringify(body) !== JSON.stringify(bodyOf(valuesOf(item)))) {
          saved = await api.update(resource, item.id, body);
        }
        if (photo) saved = await api.replacePhoto(resource, item.id, photo);
      }
      onSaved(saved);
    } catch (failure) {
      setError(
        failure instanceof Error ? failure.message : "Uložení se nepovedlo.",
      );
      setBusy(false);
    }
  }

  async function remove() {
    if (!item) return;
    setBusy(true);
    setError(null);
    try {
      await api.remove(resource, item.id);
      onDeleted(item.id);
    } catch (failure) {
      setError(
        failure instanceof Error ? failure.message : "Smazání se nepovedlo.",
      );
      setBusy(false);
      setConfirmDelete(false);
    }
  }

  return (
    <Sheet
      title={isNew ? TITLE[resource].add : TITLE[resource].edit}
      onClose={onClose}
      footer={
        <>
          {!isNew ? (
            <button
              type="button"
              className="btn btn--danger"
              disabled={busy}
              onClick={() => setConfirmDelete(true)}
            >
              Smazat
            </button>
          ) : null}
          <button
            type="button"
            className="btn btn--gold"
            disabled={busy}
            onClick={() => void save()}
          >
            {busy ? "Ukládám…" : "Uložit"}
          </button>
        </>
      }
    >
      {error ? <p className="error">{error}</p> : null}

      {shown ? <img className="sheet__photo" src={shown} alt="" /> : null}

      <PhotoPicker
        label={shown ? "Vyměnit fotku" : "Vybrat fotku"}
        onPick={setPhoto}
        pending={photo !== null}
      />

      {resource !== "galerie" ? (
        <Field label="Název">
          <input
            className="input"
            type="text"
            placeholder={
              resource === "paintings" ? "Jak se obraz jmenuje?" : ""
            }
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
        </Field>
      ) : null}

      {resource === "paintings" ? (
        <Toggle label="Prodáno" value={sold} onChange={setSold} />
      ) : null}

      {isFeed ? (
        <>
          <Field label="Datum" hint={FEED_FIELDS[resource].date}>
            <input
              className="input"
              type="text"
              value={date}
              onChange={(event) => setDate(event.target.value)}
            />
          </Field>

          {resource === "projekty" ? (
            <Field label="Popis">
              <textarea
                className="textarea"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
            </Field>
          ) : null}

          <LinksEditor links={links} onChange={setLinks} />

          {resource === "projekty" ? (
            <Field label="Video" hint="Odkaz na YouTube nebo Vimeo">
              <input
                className="input"
                type="url"
                inputMode="url"
                autoCapitalize="off"
                autoCorrect="off"
                placeholder="https://…"
                value={video}
                onChange={(event) => setVideo(event.target.value)}
              />
            </Field>
          ) : null}
        </>
      ) : null}

      {resource === "galerie" ? (
        <p className="field__hint">
          První fotka v galerii je ta velká nahoře na stránce. Pořadí změníte
          přetažením v mřížce.
        </p>
      ) : null}

      {/* Dragging one painting past eighty others is a long way to carry it
          on a phone. The common move — this one first — is one tap. */}
      {!isNew &&
      onMove &&
      (resource === "paintings" || resource === "galerie") ? (
        <div className="sheet__move">
          <button
            type="button"
            className="btn"
            disabled={busy}
            onClick={() => void onMove("start")}
          >
            {resource === "galerie" ? "Nastavit jako titulní" : "Na začátek"}
          </button>
          <button
            type="button"
            className="btn"
            disabled={busy}
            onClick={() => void onMove("end")}
          >
            Na konec
          </button>
        </div>
      ) : null}

      {confirmDelete ? (
        <Confirm
          text="Opravdu smazat? Zmizí to z webu, až kliknete na Publikovat."
          confirmLabel="Smazat"
          onConfirm={() => void remove()}
          onCancel={() => setConfirmDelete(false)}
        />
      ) : null}
    </Sheet>
  );
}

function PhotoPicker({
  label,
  pending,
  onPick,
}: {
  label: string;
  pending: boolean;
  onPick: (file: File) => void;
}) {
  return (
    <label
      className="btn btn--wide"
      style={{ display: "block", textAlign: "center" }}
    >
      {pending ? "Fotka připravena — uložte změny" : label}
      <input
        type="file"
        accept="image/*"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onPick(file);
          event.target.value = "";
        }}
      />
    </label>
  );
}
