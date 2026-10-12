/**
 * Obrazy and Galerie: one flat grid of photographs, dragged into the order the
 * website shows them in.
 *
 * There is no separate reorder screen. The old app had one, and in production
 * it rendered forty-one identical grey circles because its thumbnails pointed
 * at localhost — a reordering tool that shows you nothing to reorder.
 */

import { useRef, useState } from "react";
import {
  DndContext,
  MouseSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { api, thumb, type Item, type Resource } from "./api";

/** How many paintings the home page shows, from the top of the list. */
export const HOME_COUNT = 9;

/**
 * The groups a grid is dragged in. /obrazy prints the paintings for sale and
 * then the sold ones, each block in `order`, so one mixed grid promised an
 * order the page never showed: a sold painting dragged to the front landed
 * behind forty-one others. Galerie is one group.
 */
export function groupsOf(resource: Resource, items: Item[]): Item[][] {
  if (resource !== "paintings") return [items];
  return [
    items.filter((item) => !item.sold),
    items.filter((item) => item.sold),
  ];
}

/**
 * Put one group's new order back into the slots that group held.
 *
 * The home page takes the first nine of the whole list, sold or not, so the
 * two groups stay interleaved exactly as they were; only the paintings inside
 * the group that moved change places.
 */
export function refill(
  resource: Resource,
  items: Item[],
  groupIndex: number,
  nextGroup: Item[],
): Item[] {
  if (resource !== "paintings") return nextGroup;
  const sold = groupIndex === 1;
  let taken = 0;
  return items.map((item) =>
    Boolean(item.sold) === sold ? nextGroup[taken++] : item,
  );
}

/** One painting to the start or the end of its own group. */
export function moved(
  resource: Resource,
  items: Item[],
  id: number,
  where: "start" | "end",
): Item[] {
  const groups = groupsOf(resource, items);
  const groupIndex = groups.findIndex((group) =>
    group.some((item) => item.id === id),
  );
  if (groupIndex === -1) return items;
  const group = groups[groupIndex];
  const item = group.find((entry) => entry.id === id)!;
  const rest = group.filter((entry) => entry.id !== id);
  return refill(
    resource,
    items,
    groupIndex,
    where === "start" ? [item, ...rest] : [...rest, item],
  );
}

const GROUP_LABEL = ["Na prodej", "Prodáno"];

function Tile({
  item,
  lead,
  home,
  onOpen,
}: {
  item: Item;
  /** First in the grid, which for galerie is the plate at the top of the page. */
  lead: boolean;
  /** Among the paintings the home page picks up. */
  home: boolean;
  onOpen: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: item.id,
  });

  return (
    <button
      type="button"
      ref={setNodeRef}
      className={`tile ${isDragging ? "tile--dragging" : ""}`}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      onClick={onOpen}
      // A held finger is the start of a drag here, not a request for
      // Android's "download image" menu.
      onContextMenu={(event) => event.preventDefault()}
      aria-label={item.title || `Fotka ${item.id}`}
      {...attributes}
      {...listeners}
    >
      <img
        className="tile__img"
        src={thumb(item.image_path, 400, item.image_v)}
        alt=""
        loading="lazy"
        decoding="async"
        draggable={false}
      />
      {item.sold ? <span className="tile__badge">Prodáno</span> : null}
      {lead ? <span className="tile__lead">Titulní</span> : null}
      {home ? <span className="tile__lead">Úvod</span> : null}
    </button>
  );
}

export function GridTab({
  resource,
  items,
  onItems,
  onOpen,
  onBusy,
  onError,
  onChanged,
}: {
  resource: Resource;
  items: Item[];
  onItems: (next: Item[]) => void;
  onOpen: (item: Item) => void;
  onBusy: (text: string | null) => void;
  onError: (text: string) => void;
  onChanged: () => void;
}) {
  const picker = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  // A tap has to keep opening the sheet, so a drag only begins after the
  // finger has been held still for a moment. Mouse covers the desktop.
  //
  // MouseSensor, not PointerSensor: a finger fires pointer events too, ahead
  // of its touch events, so PointerSensor claimed every touch, waited for 8px
  // of movement, and lost it to the page scrolling (pointercancel). The
  // long-press below never got a turn and nothing could be dragged on a phone.
  const sensors = useSensors(
    useSensor(TouchSensor, {
      activationConstraint: { delay: 220, tolerance: 8 },
    }),
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
  );

  async function onDragEnd(groupIndex: number, event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const group = groupsOf(resource, items)[groupIndex];
    const from = group.findIndex((item) => item.id === active.id);
    const to = group.findIndex((item) => item.id === over.id);
    if (from === -1 || to === -1) return;

    const before = items;
    const next = refill(
      resource,
      items,
      groupIndex,
      arrayMove(group, from, to),
    );
    onItems(next); // Move it under her finger first; ask the server after.
    try {
      await api.reorder(
        resource,
        next.map((item) => item.id),
      );
      onChanged();
    } catch (error) {
      onItems(before);
      onError(
        error instanceof Error ? error.message : "Pořadí se nepodařilo uložit.",
      );
    }
  }

  async function onPicked(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    const chosen = Array.from(files);
    const added: Item[] = [];
    try {
      for (let index = 0; index < chosen.length; index += 1) {
        onBusy(
          chosen.length === 1
            ? "Nahrávám fotku…"
            : `Nahrávám ${index + 1} z ${chosen.length}…`,
        );
        // One at a time: a phone on cellular uploading eight 8 MB photographs
        // at once finishes none of them.
        added.push(await api.createWithPhoto(resource, chosen[index]));
      }
    } catch (error) {
      onError(
        error instanceof Error ? error.message : "Fotku se nepodařilo nahrát.",
      );
    } finally {
      setUploading(false);
      onBusy(null);
      if (added.length > 0) {
        // Where the server put them: each painting is inserted at the front,
        // so the last one picked ends up first.
        onItems(
          resource === "paintings"
            ? [...added.slice().reverse(), ...items]
            : [...items, ...added],
        );
        onChanged();
        // One painting is a painting to name, now, the way a post asks for
        // its caption. Several at once are named afterwards, one by one.
        if (resource === "paintings" && chosen.length === 1) onOpen(added[0]);
      }
      // Let her pick the same picture again after a failure.
      if (picker.current) picker.current.value = "";
    }
  }

  return (
    <>
      {resource === "paintings" && items.length > 0 ? (
        <p className="grid__hint">
          Pořadí změníte podržením a přetažením. Obrazy označené „Úvod“ jsou i
          na úvodní stránce.
        </p>
      ) : null}
      {groupsOf(resource, items).map((group, groupIndex) =>
        group.length === 0 && resource === "paintings" ? null : (
          <section key={groupIndex}>
            {resource === "paintings" ? (
              <h2 className="grid__head">
                {GROUP_LABEL[groupIndex]} <span>{group.length}</span>
              </h2>
            ) : null}
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={(event) => void onDragEnd(groupIndex, event)}
            >
              <SortableContext
                items={group.map((item) => item.id)}
                strategy={rectSortingStrategy}
              >
                <div className="grid">
                  {/* "Titulní" and "Úvod" are statements about position, so
                      they read off the position. Reading `item.order` instead
                      left the badge behind on the tile she had just dragged
                      away: the reorder is optimistic, and the server's
                      renumbering never comes back to the client. */}
                  {group.map((item) => (
                    <Tile
                      key={item.id}
                      item={item}
                      lead={resource === "galerie" && item === items[0]}
                      home={
                        resource === "paintings" &&
                        items.indexOf(item) < HOME_COUNT
                      }
                      onOpen={() => onOpen(item)}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </section>
        ),
      )}

      <input
        ref={picker}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(event) => void onPicked(event.target.files)}
      />
      <button
        type="button"
        className="fab"
        disabled={uploading}
        aria-label="Přidat fotky"
        onClick={() => picker.current?.click()}
      >
        +
      </button>
    </>
  );
}
