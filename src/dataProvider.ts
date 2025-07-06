// src/dataProvider.ts (Dynamic API_URL)
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

// --- Dynamically construct the API URL ---
const API_PORT = "8000";
const API_URL = `${window.location.protocol}//${window.location.hostname}:${API_PORT}`;
console.log(`API URL set to: ${API_URL}`);

// --- Record Type Definitions ---
// A generic link structure used in projects and exhibitions
interface Link {
  url: string;
  text: string;
}

// Painting record
export interface PaintingRecord extends RaRecord {
  id: number;
  title: string;
  sold: boolean;
  filename: string;
  url: string;
}

// Project record based on API model
export interface ProjectRecord extends RaRecord {
  id: number;
  date?: string;
  title: string;
  image?: string;
  description?: string;
  links: Link[];
  video_url?: string;
}

// Exhibition record based on API model
export interface ExhibitionRecord extends RaRecord {
  id: number;
  date?: string;
  title: string;
  image?: string;
  links: Link[];
}

// A union type for all possible records
type ApiRecord = PaintingRecord | ProjectRecord | ExhibitionRecord;

// --- Specific Param Types ---
interface ImageInputValue {
  rawFile: File;
  src?: string;
  title?: string;
}

interface PaintingCreateParams extends CreateParams {
  data: {
    title: string;
    order: number;
    sold?: boolean;
    image: ImageInputValue;
  };
}

interface PaintingUpdateParams extends UpdateParams {
  data: {
    id?: Identifier;
    title?: string;
    order?: number;
    sold?: boolean;
  };
  previousData?: PaintingRecord;
}

const httpClient = (url: string, options: fetchUtils.Options = {}) => {
  if (!options.headers) {
    options.headers = new Headers({ Accept: "application/json" });
  }
  // Handle FormData Content-Type: if body is FormData, fetch will set it correctly.
  // Otherwise, ensure it's application/json.
  if (!(options.body instanceof FormData)) {
    if (!(options.headers as Headers).has("Content-Type")) {
      (options.headers as Headers).set("Content-Type", "application/json");
    }
  } else {
    // Let the browser set the Content-Type header with the correct boundary for FormData
    (options.headers as Headers).delete("Content-Type");
  }

  return fetchUtils.fetchJson(url, options);
};

// Helper to add the base API URL to relative image URLs for paintings
const addBaseUrlToPainting = (record: ApiRecord | null): ApiRecord | null => {
  if (record && "url" in record && record.url) {
    let fullUrl = record.url;
    if (!fullUrl.startsWith("http") && !fullUrl.startsWith("/")) {
      fullUrl = `/${fullUrl}`;
    }
    if (!fullUrl.startsWith("http")) {
      fullUrl = `${API_URL}${fullUrl}`;
    }
    record.url = fullUrl;
  }
  return record;
};

const dataProvider: DataProvider = {
  getList: async (
    resource: string,
    params: GetListParams,
  ): Promise<GetListResult<ApiRecord>> => {
    const url = `${API_URL}/${resource}`;
    const { json } = await httpClient(url);

    if (!Array.isArray(json)) {
      throw new Error("The response from the API is not a valid array");
    }

    const dataWithUrls = json.map((record) =>
      // Only paintings have a direct 'url' to modify
      resource === "paintings"
        ? addBaseUrlToPainting(record as ApiRecord)!
        : (record as ApiRecord),
    );

    return {
      data: dataWithUrls,
      total: dataWithUrls.length,
    };
  },

  getOne: async (
    resource: string,
    params: GetOneParams,
  ): Promise<GetOneResult<ApiRecord>> => {
    const url = `${API_URL}/${resource}/${params.id}`;
    const { json } = await httpClient(url);

    const record =
      resource === "paintings"
        ? addBaseUrlToPainting(json as ApiRecord)
        : (json as ApiRecord);

    if (!record) {
      throw new Error("Record not found or failed to process");
    }
    return { data: record };
  },

  // --- MODIFIED create ---
  create: async (
    resource: string,
    params: CreateParams,
  ): Promise<CreateResult<ApiRecord>> => {
    const url = `${API_URL}/${resource}`;

    // Special handling for paintings (multipart/form-data)
    if (resource === "paintings") {
      const paintingParams = params as PaintingCreateParams;
      const formData = new FormData();
      formData.append("title", paintingParams.data.title);
      formData.append("order", String(paintingParams.data.order));
      formData.append("sold", String(paintingParams.data.sold || false));

      if (
        paintingParams.data.image &&
        paintingParams.data.image.rawFile instanceof File
      ) {
        formData.append("image", paintingParams.data.image.rawFile);
      } else {
        throw new Error("Image file is required for creation.");
      }

      const { json } = await httpClient(url, {
        method: "POST",
        body: formData,
      });

      const record = addBaseUrlToPainting(json as ApiRecord);
      if (!record) throw new Error("Failed to process created record");
      return { data: record };
    }

    // Default handling for other resources (JSON)
    const { json } = await httpClient(url, {
      method: "POST",
      body: JSON.stringify(params.data),
    });

    return { data: json as ApiRecord };
  },

  // --- MODIFIED update ---
  update: async (
    resource: string,
    params: UpdateParams,
  ): Promise<UpdateResult<ApiRecord>> => {
    const url = `${API_URL}/${resource}/${params.id}`;

    // Special handling for paintings (multipart/form-data)
    if (resource === "paintings") {
      const paintingParams = params as PaintingUpdateParams;
      const formData = new FormData();
      let hasUpdates = false;

      // React Admin only includes changed fields in params.data
      if (paintingParams.data.title !== undefined) {
        formData.append("title", paintingParams.data.title);
        hasUpdates = true;
      }
      if (paintingParams.data.sold !== undefined) {
        formData.append("sold", String(paintingParams.data.sold));
        hasUpdates = true;
      }
      if (paintingParams.data.order !== undefined) {
        formData.append("order", String(paintingParams.data.order));
        hasUpdates = true;
      }

      if (!hasUpdates) {
        // If no relevant fields changed, return the previous data to avoid an empty request
        return { data: params.previousData as ApiRecord };
      }

      const { json } = await httpClient(url, {
        method: "PUT",
        body: formData,
      });
      const record = addBaseUrlToPainting(json as ApiRecord);
      if (!record) throw new Error("Failed to process updated record");
      return { data: record };
    }

    // Default handling for other resources (JSON)
    const { json } = await httpClient(url, {
      method: "PUT",
      body: JSON.stringify(params.data),
    });

    return { data: json as ApiRecord };
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

  delete: async (
    resource: string,
    params: DeleteParams,
  ): Promise<DeleteResult<ApiRecord>> => {
    const url = `${API_URL}/${resource}/${params.id}`;
    await httpClient(url, { method: "DELETE" });

    // Return previousData to allow undo
    return { data: params.previousData as ApiRecord };
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
  uploadImage: (
    resource: string,
    params: { file: File },
  ) => Promise<{ data: { path: string } }>;
}

export default dataProvider;
