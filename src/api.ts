/**
 * Everything this app knows how to ask the server.
 *
 * Same origin throughout, so the session cookie rides along on its own and
 * there is no token to store, refresh or leak. `credentials: "same-origin"` is
 * the default for fetch, but it is written out because the whole auth story
 * depends on it.
 */

export type Resource = "paintings" | "galerie" | "projekty" | "vystavy";

export const RESOURCES: Resource[] = [
  "paintings",
  "galerie",
  "projekty",
  "vystavy",
];

/** What each tab is called in the one language this app speaks. */
export const TAB_LABEL: Record<Resource, string> = {
  paintings: "Obrazy",
  galerie: "Galerie",
  projekty: "Projekty",
  vystavy: "Výstavy",
};

/** The two tabs that are a grid of photographs and can be dragged into order. */
export const IS_GRID: Record<Resource, boolean> = {
  paintings: true,
  galerie: true,
  // Projects and exhibitions are re-sorted by date at build time, so a drag
  // here would move the tile and leave the website exactly as it was.
  projekty: false,
  vystavy: false,
};

export interface Link {
  url: string;
  text: string;
}

export interface Item {
  id: number;
  order: number;
  /** Repo-relative path to the record's photograph, computed by the server. */
  image_path?: string | null;
  /** Changes when the photograph's contents do. See `thumb`. */
  image_v?: string | null;
  title?: string;
  sold?: boolean;
  /** Year the painting was made. Absent on paintings added before the field. */
  year?: number | null;
  filename?: string;
  date?: string | null;
  image?: string | null;
  description?: string | null;
  links?: Link[];
  video_url?: string | null;
}

export interface PendingItem {
  ts: number;
  text_cs: string;
}

export interface Pending {
  count: number;
  files: number;
  items: PendingItem[];
}

export type PublishState = "idle" | "running" | "done" | "error";

export interface PublishStatus {
  state: PublishState;
  step: string;
  message: string;
  commit_url: string | null;
}

/** Thrown when the session has gone; the app falls back to the login screen. */
export class Unauthorized extends Error {}

/** Any other refusal, carrying the server's Czech sentence. */
export class ApiError extends Error {}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api${path}`, {
      credentials: "same-origin",
      ...init,
    });
  } catch {
    // A dropped connection is the failure she will actually meet, standing in
    // a salon with one bar of signal.
    throw new ApiError("Není připojení k internetu.");
  }

  // A 401 from the login itself is a wrong password, not a lost session: it
  // falls through to the server's own sentence. Turning it into "Nejste
  // přihlášena" told her she was not logged in while she was trying to.
  if (response.status === 401 && path !== "/login")
    throw new Unauthorized("Nejste přihlášena.");
  if (response.status === 204) return undefined as T;

  const body = await response.text();
  let parsed: unknown = null;
  try {
    parsed = body ? JSON.parse(body) : null;
  } catch {
    parsed = null;
  }

  if (!response.ok) {
    const detail =
      parsed && typeof parsed === "object" && "detail" in parsed
        ? (parsed as { detail: unknown }).detail
        : null;
    throw new ApiError(
      typeof detail === "string" ? detail : "Něco se nepovedlo.",
    );
  }
  return parsed as T;
}

function json(method: string, body: unknown): RequestInit {
  return {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}

export const api = {
  me: () => request<{ ok: true }>("/me"),
  login: (password: string) =>
    request<{ ok: true }>("/login", json("POST", { password })),
  logout: () => request<{ ok: true }>("/logout", { method: "POST" }),

  list: (resource: Resource) => request<Item[]>(`/${resource}`),
  create: (resource: Resource, body: Partial<Item>) =>
    request<Item>(`/${resource}`, json("POST", body)),
  update: (resource: Resource, id: number, body: Partial<Item>) =>
    request<Item>(`/${resource}/${id}`, json("PUT", body)),
  remove: (resource: Resource, id: number) =>
    request<void>(`/${resource}/${id}`, { method: "DELETE" }),
  reorder: (resource: Resource, ids: number[]) =>
    request<{ ok: true }>(`/${resource}/reorder`, json("POST", { ids })),

  createWithPhoto: (resource: Resource, file: File) => {
    const form = new FormData();
    form.append("image", file);
    return request<Item>(`/${resource}/photo`, { method: "POST", body: form });
  },
  replacePhoto: (resource: Resource, id: number, file: File) => {
    const form = new FormData();
    form.append("image", file);
    return request<Item>(`/${resource}/${id}/image`, {
      method: "PUT",
      body: form,
    });
  },

  pending: () => request<Pending>("/pending"),
  discard: () => request<{ ok: true }>("/pending/discard", { method: "POST" }),
  publish: () => request<PublishStatus>("/publish", { method: "POST" }),
  publishStatus: () => request<PublishStatus>("/publish/status"),
};

/**
 * URL of a thumbnail for a repo-relative image path.
 *
 * The sources are up to 8 MB each and there are eighty-seven of them; asking
 * for the originals would make the grid unusable on a phone's data.
 *
 * `version` is what makes replacing a photograph visible. The server keeps the
 * filename across a swap, so the path alone never changes, and the response
 * carries a day of `max-age`: without this the browser would draw the old
 * picture from its own cache long after the new one was saved. The server
 * ignores the parameter; it exists only to be different.
 */
export function thumb(
  path: string | null | undefined,
  width: 200 | 400 | 800,
  version?: string | null,
): string {
  if (!path) return "";
  const v = version ? `&v=${encodeURIComponent(version)}` : "";
  return `/api/thumb?path=${encodeURIComponent(path)}&w=${width}${v}`;
}

/** Czech has three plural forms and the banner is read every day. */
export function pluralCz(
  n: number,
  one: string,
  few: string,
  many: string,
): string {
  if (n === 1) return one;
  return n >= 2 && n <= 4 ? few : many;
}
