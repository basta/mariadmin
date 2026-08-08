/**
 * The small pieces every screen is built from.
 *
 * Kept deliberately plain: this app has four tabs and a few sheets, which is
 * not enough structure to justify a component library, a router, or a styling
 * runtime. The markup is the markup and the classes live in styles.css.
 */

import { useEffect, useRef, type ReactNode } from "react";
import type { Link } from "./api";

/** A full-screen sheet. Escape closes it, and focus starts inside it. */
export function Sheet({
  title,
  onClose,
  children,
  footer,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    // Nothing behind the sheet should scroll under it.
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panel.current
      ?.querySelector<HTMLElement>("input, textarea, button")
      ?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [onClose]);

  return (
    <div
      className="sheet"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      ref={panel}
    >
      <div className="sheet__head">
        <h2 className="sheet__title">{title}</h2>
        <button type="button" className="btn btn--quiet" onClick={onClose}>
          Zavřít
        </button>
      </div>
      <div className="sheet__body">{children}</div>
      {footer ? <div className="sheet__foot">{footer}</div> : null}
    </div>
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="field">
      <span className="field__label">{label}</span>
      {children}
      {hint ? <span className="field__hint">{hint}</span> : null}
    </label>
  );
}

export function Toggle({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <button
      type="button"
      className="toggle"
      aria-pressed={value}
      onClick={() => onChange(!value)}
    >
      <span>{label}</span>
      <span className="toggle__track" aria-hidden="true">
        <span className="toggle__knob" />
      </span>
    </button>
  );
}

/**
 * Link rows.
 *
 * The URL field is first and labelled, because the old form's two unlabelled
 * boxes were filled in the wrong order often enough that build.py carries a
 * `normalise_links()` repair function to undo it after the fact.
 */
export function LinksEditor({
  links,
  onChange,
}: {
  links: Link[];
  onChange: (next: Link[]) => void;
}) {
  const set = (index: number, patch: Partial<Link>) =>
    onChange(
      links.map((link, i) => (i === index ? { ...link, ...patch } : link)),
    );

  return (
    <div className="field">
      <span className="field__label">Odkazy</span>
      {links.map((link, index) => (
        <div className="links__row" key={index}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <input
              className={`input ${linkLooksWrong(link.url) ? "input--invalid" : ""}`}
              type="url"
              inputMode="url"
              autoCapitalize="off"
              autoCorrect="off"
              placeholder="https://…"
              aria-label={`Adresa odkazu ${index + 1}`}
              value={link.url}
              onChange={(event) => set(index, { url: event.target.value })}
            />
            <input
              className="input"
              style={{ marginTop: "0.35rem" }}
              type="text"
              placeholder="Popisek, např. Galerie"
              aria-label={`Popisek odkazu ${index + 1}`}
              value={link.text}
              onChange={(event) => set(index, { text: event.target.value })}
            />
          </div>
          <button
            type="button"
            className="links__drop"
            aria-label={`Odebrat odkaz ${index + 1}`}
            onClick={() => onChange(links.filter((_, i) => i !== index))}
          >
            ×
          </button>
        </div>
      ))}
      <button
        type="button"
        className="btn btn--wide"
        onClick={() => onChange([...links, { url: "", text: "" }])}
      >
        Přidat odkaz
      </button>
      {links.some((link) => linkLooksWrong(link.url)) ? (
        <span className="field__hint">Adresa má začínat na https://</span>
      ) : null}
    </div>
  );
}

/**
 * A link that would break the page if it were published.
 *
 * An address with no scheme is a *relative* href: `instagram.com/mari` renders
 * as a link to marimagdalena.cz/instagram.com/mari, which is a 404 on her own
 * site. Exported because the sheet refuses to save while one of these is on
 * screen — a red border that lets the save through is decoration, not
 * validation.
 */
export function linkLooksWrong(url: string): boolean {
  return url.trim() !== "" && !/^https?:\/\//i.test(url.trim());
}

/** A question with two answers, one of which is destructive. */
export function Confirm({
  text,
  confirmLabel,
  onConfirm,
  onCancel,
}: {
  text: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="confirm" role="dialog" aria-modal="true">
      <div className="confirm__panel">
        <p className="confirm__text">{text}</p>
        <div className="confirm__row">
          <button type="button" className="btn" onClick={onCancel}>
            Zpět
          </button>
          <button type="button" className="btn btn--danger" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export function Toast({ text, bad }: { text: string; bad?: boolean }) {
  return (
    <div className={`toast ${bad ? "toast--bad" : ""}`} role="status">
      {text}
    </div>
  );
}

export function Empty({ title, note }: { title: string; note: string }) {
  return (
    <div className="state">
      <p className="state__title">{title}</p>
      <p>{note}</p>
    </div>
  );
}
