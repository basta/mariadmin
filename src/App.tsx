/**
 * The whole app: a header, four tabs, and whatever sheet is open on top.
 *
 * There is no router. Four tabs and three sheets is not enough structure to
 * justify one, and a router would put URLs in front of someone who opens this
 * from a home-screen icon and never sees an address bar.
 *
 * Lists are cached per tab so switching back is instant, and every mutation
 * patches the cached list rather than refetching — on cellular, a round trip
 * to redraw a row she just changed is a second of staring at nothing.
 */

import { useCallback, useEffect, useState } from "react";

import {
  api,
  IS_GRID,
  pluralCz,
  RESOURCES,
  TAB_LABEL,
  Unauthorized,
  type Item,
  type Pending,
  type Resource,
} from "./api";
import { Confirm, Empty, Toast } from "./bits";
import { EditSheet } from "./EditSheet";
import { FeedTab } from "./FeedTab";
import { GridTab, moved } from "./GridTab";
import { Login } from "./Login";
import { PublishOverlay } from "./PublishOverlay";

const EMPTY: Record<Resource, { title: string; note: string }> = {
  paintings: {
    title: "Zatím žádné obrazy",
    note: "Přidejte první tlačítkem +.",
  },
  galerie: {
    title: "Galerie je prázdná",
    note: "Nahrajte fotky ze salonu tlačítkem +.",
  },
  projekty: {
    title: "Zatím žádné projekty",
    note: "Přidejte první tlačítkem +.",
  },
  vystavy: {
    title: "Zatím žádné výstavy",
    note: "Přidejte první tlačítkem +.",
  },
};

type Sheet = { resource: Resource; item: Item | null } | null;

export function App() {
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [tab, setTab] = useState<Resource>("paintings");
  const [lists, setLists] = useState<Partial<Record<Resource, Item[]>>>({});
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);

  const [pending, setPending] = useState<Pending | null>(null);
  const [sheet, setSheet] = useState<Sheet>(null);
  const [publishing, setPublishing] = useState(false);
  const [askDiscard, setAskDiscard] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState<{ text: string; bad?: boolean } | null>(
    null,
  );

  const items = lists[tab];

  const say = useCallback(
    (text: string, bad = false) => setToast({ text, bad }),
    [],
  );

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), toast.bad ? 6000 : 2600);
    return () => clearTimeout(timer);
  }, [toast]);

  /** One place decides that a lost session means the login screen. */
  const guard = useCallback(
    (error: unknown, fallback: string) => {
      if (error instanceof Unauthorized) {
        setSignedIn(false);
        return;
      }
      say(error instanceof Error ? error.message : fallback, true);
    },
    [say],
  );

  const refreshPending = useCallback(async () => {
    try {
      setPending(await api.pending());
    } catch (error) {
      // The banner is information, not function. If it cannot be fetched the
      // app still works, and the next mutation asks again.
      if (error instanceof Unauthorized) setSignedIn(false);
    }
  }, []);

  useEffect(() => {
    void api
      .me()
      .then(() => setSignedIn(true))
      .catch(() => setSignedIn(false));
  }, []);

  // Load a tab the first time it is looked at, and never again unless
  // something explicitly drops it from the cache.
  useEffect(() => {
    if (!signedIn || lists[tab] !== undefined) return;
    let alive = true;
    setLoading(true);
    setFailed(null);
    void api
      .list(tab)
      .then((loaded) => {
        if (alive) setLists((all) => ({ ...all, [tab]: loaded }));
      })
      .catch((error) => {
        if (!alive) return;
        if (error instanceof Unauthorized) setSignedIn(false);
        else
          setFailed(
            error instanceof Error ? error.message : "Načtení se nepovedlo.",
          );
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [signedIn, tab, lists]);

  useEffect(() => {
    if (signedIn) void refreshPending();
  }, [signedIn, refreshPending]);

  function setItems(next: Item[]) {
    setLists((all) => ({ ...all, [tab]: next }));
  }

  /** Re-read a dated list after a save and scroll to the record saved. */
  async function settle(resource: Resource, id: number) {
    try {
      const fresh = await api.list(resource);
      setLists((all) => ({ ...all, [resource]: fresh }));
      requestAnimationFrame(() =>
        document
          .querySelector(`[data-id="${id}"]`)
          ?.scrollIntoView({ block: "center", behavior: "smooth" }),
      );
    } catch (error) {
      if (error instanceof Unauthorized) setSignedIn(false);
    }
  }

  async function move(resource: Resource, id: number, where: "start" | "end") {
    const before = lists[resource] ?? [];
    const next = moved(resource, before, id, where);
    setLists((all) => ({ ...all, [resource]: next }));
    try {
      await api.reorder(
        resource,
        next.map((item) => item.id),
      );
      void refreshPending();
      say(where === "start" ? "Přesunuto na začátek." : "Přesunuto na konec.");
    } catch (error) {
      setLists((all) => ({ ...all, [resource]: before }));
      guard(error, "Pořadí se nepodařilo uložit.");
    }
  }

  async function startPublish() {
    try {
      await api.publish();
      setPublishing(true);
    } catch (error) {
      guard(error, "Publikování se nepodařilo spustit.");
    }
  }

  const publishDone = useCallback(() => {
    void refreshPending();
  }, [refreshPending]);

  const publishFailed = useCallback(() => {
    void refreshPending();
  }, [refreshPending]);

  async function discard() {
    setAskDiscard(false);
    setBusy("Zahazuji změny…");
    try {
      await api.discard();
      // Everything on disk may have moved, including tabs that are not open.
      setLists({});
      await refreshPending();
      say("Změny zahozeny.");
    } catch (error) {
      guard(error, "Změny se nepodařilo zahodit.");
    } finally {
      setBusy(null);
    }
  }

  if (signedIn === null) {
    return (
      <div className="app">
        <div className="state">
          <p>Načítám…</p>
        </div>
      </div>
    );
  }

  if (!signedIn) {
    return (
      <div className="app">
        <Login
          onIn={() => {
            setLists({});
            setSignedIn(true);
          }}
        />
      </div>
    );
  }

  return (
    <div className="app">
      <div className="top">
        <header className="head">
          <h1 className="head__title">Maří Magdalena</h1>
          <button
            type="button"
            className="btn btn--quiet"
            onClick={() => {
              void api.logout().catch(() => undefined);
              setSignedIn(false);
            }}
          >
            Odhlásit
          </button>
        </header>

        {pending && pending.count > 0 ? (
          <div className="banner">
            <span className="banner__text">{bannerText(pending)}</span>
            <div className="banner__row">
              <button
                type="button"
                className="btn btn--quiet"
                onClick={() => setAskDiscard(true)}
              >
                Zahodit
              </button>
              <button
                type="button"
                className="btn btn--gold"
                onClick={() => void startPublish()}
              >
                Publikovat
              </button>
            </div>
          </div>
        ) : null}
      </div>

      <main className="main">
        {failed ? (
          <div className="state">
            <p className="error">{failed}</p>
            <button
              type="button"
              className="btn"
              onClick={() => setLists((all) => ({ ...all, [tab]: undefined }))}
            >
              Zkusit znovu
            </button>
          </div>
        ) : loading || items === undefined ? (
          <div className="state">
            <p>Načítám…</p>
          </div>
        ) : items.length === 0 && !IS_GRID[tab] ? (
          <>
            <Empty title={EMPTY[tab].title} note={EMPTY[tab].note} />
            <button
              type="button"
              className="fab"
              aria-label="Přidat"
              onClick={() => setSheet({ resource: tab, item: null })}
            >
              +
            </button>
          </>
        ) : IS_GRID[tab] ? (
          <>
            {items.length === 0 ? (
              <Empty title={EMPTY[tab].title} note={EMPTY[tab].note} />
            ) : null}
            <GridTab
              resource={tab}
              items={items}
              onItems={setItems}
              onOpen={(item) => setSheet({ resource: tab, item })}
              onBusy={setBusy}
              onError={(text) => say(text, true)}
              onChanged={() => void refreshPending()}
            />
          </>
        ) : (
          <FeedTab
            resource={tab}
            items={items}
            onOpen={(item) => setSheet({ resource: tab, item })}
            onNew={() => setSheet({ resource: tab, item: null })}
          />
        )}
      </main>

      <nav className="tabs">
        {RESOURCES.map((resource) => (
          <button
            key={resource}
            type="button"
            className={`tab ${resource === tab ? "tab--on" : ""}`}
            aria-current={resource === tab ? "page" : undefined}
            onClick={() => setTab(resource)}
          >
            {TAB_LABEL[resource]}
          </button>
        ))}
      </nav>

      {sheet ? (
        <EditSheet
          resource={sheet.resource}
          item={sheet.item}
          onClose={() => setSheet(null)}
          onSaved={(saved) => {
            const resource = sheet.resource;
            const current = lists[resource] ?? [];
            const known = current.some((item) => item.id === saved.id);
            setLists((all) => ({
              ...all,
              [resource]: known
                ? current.map((item) => (item.id === saved.id ? saved : item))
                : [...current, saved],
            }));
            setSheet(null);
            void refreshPending();
            say("Uloženo.");
            // Projects and exhibitions sit where their date puts them, which
            // only the server can work out from "Červen - Srpen 2024". Ask
            // again, then show her where it landed.
            if (!IS_GRID[resource]) void settle(resource, saved.id);
          }}
          onMove={
            sheet.item
              ? (where) => move(sheet.resource, sheet.item!.id, where)
              : undefined
          }
          onDeleted={(id) => {
            setLists((all) => ({
              ...all,
              [sheet.resource]: (all[sheet.resource] ?? []).filter(
                (item) => item.id !== id,
              ),
            }));
            setSheet(null);
            void refreshPending();
            say("Smazáno.");
          }}
        />
      ) : null}

      {publishing ? (
        <PublishOverlay
          onDone={publishDone}
          onFailed={publishFailed}
          onClose={() => setPublishing(false)}
        />
      ) : null}

      {askDiscard ? (
        <Confirm
          text="Zahodit všechny nezveřejněné změny? Vrátí se to do stavu, v jakém je web teď."
          confirmLabel="Zahodit"
          onConfirm={() => void discard()}
          onCancel={() => setAskDiscard(false)}
        />
      ) : null}

      {busy ? (
        <Toast text={busy} />
      ) : toast ? (
        <Toast text={toast.text} bad={toast.bad} />
      ) : null}
    </div>
  );
}

/**
 * The count in git is a count of changed *files*; the log counts the things
 * she actually did. Prefer the log, fall back to something true but vague.
 */
function bannerText(pending: Pending): string {
  const n = pending.items.length;
  if (n === 0) return "Máte nezveřejněné změny";
  return `${n} ${pluralCz(n, "nezveřejněná změna", "nezveřejněné změny", "nezveřejněných změn")}`;
}
