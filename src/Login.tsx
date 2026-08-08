/**
 * One password, one field.
 *
 * The cookie lasts a year, so on her phone this screen should appear exactly
 * once. It is wrapped in a <form> so iOS shows a real submit key and offers to
 * remember the password in the keychain.
 */

import { useState } from "react";

import { api } from "./api";

export function Login({ onIn }: { onIn: () => void }) {
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy || password === "") return;
    setBusy(true);
    setError(null);
    try {
      await api.login(password);
      onIn();
    } catch (failure) {
      setError(
        failure instanceof Error ? failure.message : "Přihlášení se nepovedlo.",
      );
      setPassword("");
      setBusy(false);
    }
  }

  return (
    <form className="login" onSubmit={(event) => void submit(event)}>
      {/* Her own mark, served by api.py from the site's images/. It is the
          first thing on screen so the app is recognisably hers. */}
      <img
        className="login__mark"
        src="/images/logo_w.png"
        alt="Maří Magdalena"
      />
      <p className="login__note">Správa webu</p>

      <input
        className="input login__input"
        type="password"
        name="password"
        autoComplete="current-password"
        placeholder="Heslo"
        aria-label="Heslo"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        autoFocus
      />

      {error ? <p className="error">{error}</p> : null}

      <button type="submit" className="btn btn--gold btn--wide" disabled={busy}>
        {busy ? "Přihlašuji…" : "Přihlásit"}
      </button>
    </form>
  );
}
