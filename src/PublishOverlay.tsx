/**
 * What Publikovat looks like while it runs.
 *
 * The publish takes anywhere from a few seconds to a couple of minutes,
 * depending on how many photographs have to be re-encoded. The whole screen is
 * taken over deliberately: there is nothing useful to do meanwhile, and an
 * edit made mid-publish would land in the next commit rather than this one.
 */

import { useEffect, useRef, useState } from "react";

import { api, type PublishStatus } from "./api";

const POLL_MS = 1500;

export function PublishOverlay({
  onDone,
  onFailed,
  onClose,
}: {
  /** Fired once, when the push has landed. */
  onDone: (status: PublishStatus) => void;
  onFailed: (message: string) => void;
  onClose: () => void;
}) {
  const [status, setStatus] = useState<PublishStatus>({
    state: "running",
    step: "Začínám…",
    message: "",
    commit_url: null,
  });
  // Guards against the interval firing again after the terminal state, which
  // would call onDone twice and refresh the list under her twice.
  const settled = useRef(false);

  useEffect(() => {
    let alive = true;

    async function poll() {
      try {
        const next = await api.publishStatus();
        if (!alive || settled.current) return;
        setStatus(next);
        if (next.state === "done") {
          settled.current = true;
          onDone(next);
        } else if (next.state === "error") {
          settled.current = true;
          onFailed(next.message || "Publikování se nepovedlo.");
        }
      } catch {
        // A dropped connection mid-publish is not a failed publish — the
        // server is still working. Keep polling; the next tick usually lands.
      }
    }

    void poll();
    const timer = setInterval(() => void poll(), POLL_MS);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [onDone, onFailed]);

  const finished = status.state === "done" || status.state === "error";

  return (
    <div className="publish" role="dialog" aria-modal="true" aria-live="polite">
      {status.state === "done" ? (
        <>
          <p className="publish__mark">✓</p>
          <p className="publish__step">Hotovo</p>
          <p className="publish__detail">
            Změny jsou na webu. Než se na něm objeví, může to pár minut trvat.
          </p>
        </>
      ) : status.state === "error" ? (
        <>
          <p className="publish__mark publish__mark--bad">!</p>
          <p className="publish__step">Nepovedlo se</p>
          <p className="publish__detail">
            Vaše změny se neztratily — zůstávají nezveřejněné a můžete to zkusit
            znovu.
          </p>
          {/* build.py's own words, kept verbatim: when this goes wrong it goes
              wrong in a way only the person reading the repository can fix. */}
          <p className="publish__detail publish__detail--log">
            {status.message}
          </p>
        </>
      ) : (
        <>
          <span className="publish__bar" aria-hidden="true" />
          {/* `step` is a machine token; `message` is the Czech sentence. */}
          <p className="publish__step">{status.message || "Publikuji…"}</p>
          <p className="publish__detail">Nezavírejte prosím okno.</p>
        </>
      )}

      {finished ? (
        <button
          type="button"
          className="btn btn--gold btn--wide"
          onClick={onClose}
        >
          Zavřít
        </button>
      ) : null}
    </div>
  );
}
