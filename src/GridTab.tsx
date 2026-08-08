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
  PointerSensor,
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

function Tile({
  item,
  lead,
  onOpen,
}: {
  item: Item;
  /** First in the grid, which for galerie is the plate at the top of the page. */
  lead: boolean;
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
  // finger has been held still for a moment. Pointer covers the desktop.
  const sensors = useSensors(
    useSensor(TouchSensor, {
      activationConstraint: { delay: 220, tolerance: 8 },
    }),
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  async function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const from = items.findIndex((item) => item.id === active.id);
    const to = items.findIndex((item) => item.id === over.id);
    if (from === -1 || to === -1) return;

    const before = items;
    const next = arrayMove(items, from, to);
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
        onItems([...items, ...added]);
        onChanged();
      }
      // Let her pick the same picture again after a failure.
      if (picker.current) picker.current.value = "";
    }
  }

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={onDragEnd}
      >
        <SortableContext
          items={items.map((item) => item.id)}
          strategy={rectSortingStrategy}
        >
          <div className="grid">
            {/* "Titulní" is a statement about position, so it reads off the
                position. Reading `item.order` instead left the badge behind on
                the tile she had just dragged away: the reorder is optimistic,
                and the server's renumbering never comes back to the client. */}
            {items.map((item, index) => (
              <Tile
                key={item.id}
                item={item}
                lead={resource === "galerie" && index === 0}
                onOpen={() => onOpen(item)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

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
