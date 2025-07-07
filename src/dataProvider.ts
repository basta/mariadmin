// src/dataProvider.ts (Dynamic API_URL)
// src/dataProvider.ts
import {
  fetchUtils,
  DataProvider,
  GetListParams,
  GetOneParams,
  CreateParams,
  UpdateParams,
  DeleteParams,
  DeleteManyParams,
  GetListResult,
  GetOneResult,
  CreateResult,
  UpdateResult,
  DeleteResult,
  DeleteManyResult,
  Identifier,
  RaRecord,
} from "react-admin";

const API_PORT = "8000";
const API_URL = `${window.location.protocol}//${window.location.hostname}:${window.location.port}`;
console.log(`API URL set to: ${API_URL}`);

// --- Record Type Definitions (with 'order' field) ---
interface Link {
  url: string;
  text: string;
}

export interface PaintingRecord extends RaRecord {
  id: number;
  order: number;
  title: string;
  sold: boolean;
  filename: string;
  url: string;
}

export interface ProjectRecord extends RaRecord {
  id: number;
  order: number;
  date?: string;
  title: string;
  image?: string;
  description?: string;
  links: Link[];
  video_url?: string;
}

export interface ExhibitionRecord extends RaRecord {
  id: number;
  order: number;
  date?: string;
  title: string;
  image?: string;
  links: Link[];
}

type ApiRecord = PaintingRecord | ProjectRecord | ExhibitionRecord;

// --- Helper for HTTP requests ---
const httpClient = (url: string, options: fetchUtils.Options = {}) => {
  if (!options.headers) {
    options.headers = new Headers({ Accept: "application/json" });
  }
  if (!(options.body instanceof FormData)) {
    if (!(options.headers as Headers).has("Content-Type")) {
      (options.headers as Headers).set("Content-Type", "application/json");
    }
  } else {
    (options.headers as Headers).delete("Content-Type");
  }
  return fetchUtils.fetchJson(url, options);
};

// Helper to add the base API URL to painting image URLs
const addBaseUrlToPainting = (record: ApiRecord | null): ApiRecord | null => {
  if (
    record &&
    "url" in record &&
    record.url &&
    !record.url.startsWith("http")
  ) {
    record.url = `${API_URL}${record.url}`;
  }
  return record;
};

const dataProvider: DataProvider = {
  // The backend now sorts by order, so this just fetches
  getList: async (resource, params) => {
    const url = `${API_URL}/${resource}`;
    const { json } = await httpClient(url);
    // We still process painting URLs for display
    const data =
      resource === "paintings"
        ? json.map((p: any) => addBaseUrlToPainting(p))
        : json;
    return { data, total: data.length };
  },

  getOne: async (resource, params) => {
    const url = `${API_URL}/${resource}/${params.id}`;
    const { json } = await httpClient(url);
    const record = resource === "paintings" ? addBaseUrlToPainting(json) : json;
    return { data: record as ApiRecord };
  },

  // Create handles painting (FormData) vs others (JSON)
  create: async (resource, params) => {
    const url = `${API_URL}/${resource}`;

    if (resource === "paintings") {
      const formData = new FormData();
      formData.append("title", params.data.title);
      formData.append("sold", String(params.data.sold || false));
      if (params.data.image?.rawFile) {
        formData.append("image", params.data.image.rawFile);
      } else {
        throw new Error("Image file is required for creating a painting.");
      }
      const { json } = await httpClient(url, {
        method: "POST",
        body: formData,
      });
      return { data: addBaseUrlToPainting(json) as ApiRecord };
    }

    // Default JSON handling for projects and exhibitions
    const { json } = await httpClient(url, {
      method: "POST",
      body: JSON.stringify(params.data),
    });
    return { data: json as ApiRecord };
  },

  // UPDATE is now always JSON
  update: async (resource, params) => {
    const url = `${API_URL}/${resource}/${params.id}`;
    const { json } = await httpClient(url, {
      method: "PUT",
      body: JSON.stringify(params.data),
    });
    const record = resource === "paintings" ? addBaseUrlToPainting(json) : json;
    return { data: record as ApiRecord };
  },

  delete: async (resource, params) => {
    const url = `${API_URL}/${resource}/${params.id}`;
    await httpClient(url, { method: "DELETE" });
    return { data: (params.previousData || { id: params.id }) as ApiRecord };
  },

  // --- NEW Reorder Method ---
  reorder: async (resource: string, params: { ids: Identifier[] }) => {
    const url = `${API_URL}/${resource}/reorder`;
    const { json } = await httpClient(url, {
      method: "POST",
      body: JSON.stringify({ ids: params.ids }),
    });
    return { data: json };
  },

  uploadImage: async (resource: string, params: any) => {
    // We now expect the File object directly in params.file
    const file = params.file as File;

    if (!(file instanceof File)) {
      // This is a more accurate check
      throw new Error("A valid File object was not provided to uploadImage.");
    }

    const formData = new FormData();
    formData.append("image", file); // Append the file directly

    const url = `${API_URL}/upload/${resource}`;

    const { json } = await httpClient(url, {
      method: "POST",
      body: formData,
    });

    // The API returns { "path": "images/projekty/..." }
    return { data: json };
  },

  deleteMany: async (
    resource: string,
    params: DeleteManyParams,
  ): Promise<DeleteManyResult> => {
    const results = await Promise.all(
      params.ids.map((id) =>
        dataProvider.delete(resource, { id, previousData: { id } }),
      ),
    );
    return { data: results.map((r) => r.data.id) };
  },

  triggerBuild: async (): Promise<{ data: any }> => {
    const url = `${API_URL}/build`;
    try {
      const { json } = await httpClient(url, { method: "POST" });
      return { data: json };
    } catch (error: any) {
      console.error("Error triggering build:", error);
      throw new Error(error.message || "Failed to trigger build");
    }
  },
};

export interface AppDataProvider extends DataProvider {
  reorder: (resource: string, params: { ids: Identifier[] }) => Promise<any>;
  uploadImage: (
    resource: string,
    params: { file: File },
  ) => Promise<{ data: { path: string } }>;
  triggerBuild: () => Promise<any>;
}

export default dataProvider;
