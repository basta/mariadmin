/**
 * Projekty and Výstavy: a vertical feed of dated entries.
 *
 * No drag handle here on purpose. build.py re-sorts both of these by date
 * after loading, and `order` only breaks a tie between two entries sharing
 * one; all eleven exhibitions already have distinct dates. A drag would move
 * the card and leave the website exactly as it was, which is the worst thing
 * that can happen to someone still deciding whether to trust the tool. Their
 * position is a consequence of the date, and the date is what she edits.
 */

import { api, thumb, type Item, type Resource } from "./api";

/** Titles in projekty.json carry raw `<br />` from the old form. */
function plainTitle(title: string | undefined): string {
  return (title ?? "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function FeedTab({
  resource,
  items,
  onOpen,
  onNew,
}: {
  resource: Resource;
  items: Item[];
  onOpen: (item: Item) => void;
  onNew: () => void;
}) {
  return (
    <>
      <div className="feed">
        {items.map((item) => (
          <button
            type="button"
            className="card"
            key={item.id}
            onClick={() => onOpen(item)}
          >
            {item.image_path ? (
              <img
                className="card__thumb"
                src={thumb(item.image_path, 200, item.image_v)}
                alt=""
                loading="lazy"
                decoding="async"
              />
            ) : (
              <span className="card__thumb" aria-hidden="true" />
            )}
            <span className="card__body">
              {item.date ? (
                <span className="card__date">{item.date}</span>
              ) : null}
              <h3 className="card__title">
                {plainTitle(item.title) || "Bez názvu"}
              </h3>
              <span className="card__meta">{describe(resource, item)}</span>
            </span>
          </button>
        ))}
      </div>

      <button type="button" className="fab" aria-label="Přidat" onClick={onNew}>
        +
      </button>
    </>
  );
}

function describe(resource: Resource, item: Item): string {
  const parts: string[] = [];
  const links = item.links?.length ?? 0;
  if (links > 0)
    parts.push(
      `${links} ${links === 1 ? "odkaz" : links <= 4 ? "odkazy" : "odkazů"}`,
    );
  if (resource === "projekty" && item.video_url) parts.push("video");
  if (!item.image_path) parts.push("bez fotky");
  return parts.join(" · ");
}

/** Kept next to its only caller so the two field sets cannot drift apart. */
export const FEED_FIELDS: Record<string, { date: string }> = {
  projekty: { date: "např. Prosinec 2021, Dobřany" },
  vystavy: { date: "např. 3. Srpna, 2024" },
};

export async function createFeedItem(
  resource: Resource,
  body: Partial<Item>,
  photo: File | null,
): Promise<Item> {
  const created = await api.create(resource, body);
  if (!photo) return created;
  // Two calls, one save. The record has to exist before a photograph can be
  // attached to it, and doing it in this order means a failed upload leaves a
  // visible entry to retry rather than an orphaned file in images/.
  return api.replacePhoto(resource, created.id, photo);
}
