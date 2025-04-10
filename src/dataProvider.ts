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
// Use the current window's protocol and hostname, but fix the port to 8000
const API_PORT = "8000"; // Define the API port
// Construct the base URL for the API dynamically
const API_URL = `${window.location.protocol}//${window.location.hostname}:${API_PORT}`;
// Example: If accessed via http://example.com, API_URL becomes http://example.com:8000
// Example: If accessed via http://localhost:5173, API_URL becomes http://localhost:8000
console.log(`API URL set to: ${API_URL}`); // Optional: Log the URL for debugging

// Define the structure of a Painting record based on API response
export interface PaintingRecord extends RaRecord {
  id: number;
  title: string;
  sold: boolean;
  filename: string;
  url: string; // This will be the relative URL from API initially
}

// Define structure for ImageInput data
interface ImageInputValue {
  rawFile: File;
  src?: string;
  title?: string;
}

// Define structure for Create params specific to Painting
interface PaintingCreateParams extends CreateParams {
  data: {
    title: string;
    sold?: boolean;
    image: ImageInputValue; // ImageInput value structure
  };
}

// Define structure for Update params specific to Painting
interface PaintingUpdateParams extends UpdateParams {
  data: {
    id?: Identifier; // React Admin might add id here
    title?: string;
    sold?: boolean;
    // We don't update image, filename, url via PUT
  };
  previousData?: PaintingRecord; // React Admin provides previous data
}

/**
 * Custom fetch function using the dynamically constructed API_URL
 * Handles FormData for specific methods
 */
const httpClient = (url: string, options: fetchUtils.Options = {}) => {
  if (!options.headers) {
    options.headers = new Headers({ Accept: "application/json" });
  }
  // Handle FormData Content-Type
  if (!(options.body instanceof FormData)) {
    if (!(options.headers as Headers).has("Content-Type")) {
      (options.headers as Headers).set("Content-Type", "application/json");
    }
  } else {
    (options.headers as Headers).delete("Content-Type");
  }

  // Add authentication logic here if needed
  // const token = localStorage.getItem('token');
  // if (token) {
  //     (options.headers as Headers).set('Authorization', `Bearer ${token}`);
  // }

  // Use fetchUtils.fetchJson with the full URL passed in
  return fetchUtils.fetchJson(url, options);
};

// Helper to add the base API URL to relative image URLs returned from API
const addBaseUrlToRecord = (
  record: PaintingRecord | null,
): PaintingRecord | null => {
  if (record && record.url) {
    let fullUrl = record.url;
    // Assuming API returns relative path like "/images/obrazy/..." or "images/obrazy/..."
    if (!fullUrl.startsWith("http") && !fullUrl.startsWith("/")) {
      fullUrl = `/${fullUrl}`; // Ensure leading slash if missing
    }
    if (!fullUrl.startsWith("http")) {
      // Prepend the dynamically constructed API_URL
      fullUrl = `${API_URL}${fullUrl}`;
    }
    // Modify record.url directly for simplicity with ImageField
    record.url = fullUrl;
  }
  return record;
};

// Implement the DataProvider interface using the dynamic API_URL
const dataProvider: DataProvider = {
  getList: async (
    resource: string,
    params: GetListParams,
  ): Promise<GetListResult<PaintingRecord>> => {
    // Construct full URL using dynamic API_URL
    const url = `${API_URL}/${resource}`;
    const { json } = await httpClient(url);

    if (!Array.isArray(json)) {
      throw new Error("The response from the API is not a valid array");
    }
    // Add base URL to image URLs
    const dataWithUrls = json.map(
      (record) => addBaseUrlToRecord(record as PaintingRecord)!,
    );

    return {
      data: dataWithUrls,
      total: dataWithUrls.length,
    };
  },

  getOne: async (
    resource: string,
    params: GetOneParams,
  ): Promise<GetOneResult<PaintingRecord>> => {
    // Construct full URL
    const url = `${API_URL}/${resource}/${params.id}`;
    const { json } = await httpClient(url);
    const record = addBaseUrlToRecord(json as PaintingRecord);
    if (!record) {
      throw new Error("Record not found or failed to process");
    }
    return { data: record };
  },

  create: async (
    resource: string,
    params: CreateParams,
  ): Promise<CreateResult<PaintingRecord>> => {
    const paintingParams = params as PaintingCreateParams;
    const formData = new FormData();
    formData.append("title", paintingParams.data.title);
    formData.append("sold", String(paintingParams.data.sold || false));

    if (
      paintingParams.data.image &&
      paintingParams.data.image.rawFile instanceof File
    ) {
      formData.append("image", paintingParams.data.image.rawFile);
    } else {
      throw new Error("Image file is required for creation.");
    }

    // Construct full URL
    const url = `${API_URL}/${resource}`;
    const { json } = await httpClient(url, {
      method: "POST",
      body: formData,
    });
    const record = addBaseUrlToRecord(json as PaintingRecord);
    if (!record) {
      throw new Error("Failed to process created record");
    }
    return { data: record };
  },

  update: async (
    resource: string,
    params: UpdateParams,
  ): Promise<UpdateResult<PaintingRecord>> => {
    const paintingParams = params as PaintingUpdateParams;
    const formData = new FormData();
    let hasUpdates = false;

    if (
      paintingParams.data.title !== undefined &&
      paintingParams.data.title !== null
    ) {
      formData.append("title", paintingParams.data.title);
      hasUpdates = true;
    }
    if (
      paintingParams.data.sold !== undefined &&
      paintingParams.data.sold !== null
    ) {
      formData.append("sold", String(paintingParams.data.sold));
      hasUpdates = true;
    }

    if (!hasUpdates) {
      console.warn("Update called with no changed data for title or sold.");
      if (!paintingParams.previousData) {
        throw new Error(
          "No update data provided and no previous data available.",
        );
      }
      const previousRecord = addBaseUrlToRecord(paintingParams.previousData);
      if (!previousRecord) {
        throw new Error("Failed to process previous record");
      }
      return { data: previousRecord };
    }

    // Construct full URL
    const url = `${API_URL}/${resource}/${params.id}`;
    const { json } = await httpClient(url, {
      method: "PUT",
      body: formData,
    });
    const record = addBaseUrlToRecord(json as PaintingRecord);
    if (!record) {
      throw new Error("Failed to process updated record");
    }
    return { data: record };
  },

  delete: async (
    resource: string,
    params: DeleteParams,
  ): Promise<DeleteResult<PaintingRecord>> => {
    // Construct full URL
    const url = `${API_URL}/${resource}/${params.id}`;
    await httpClient(url, { method: "DELETE" });

    const previousRecord = addBaseUrlToRecord(
      (params.previousData as PaintingRecord) ?? { id: params.id },
    );
    if (!previousRecord) {
      return { data: { id: params.id } as PaintingRecord };
    }
    return { data: previousRecord };
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

  // Custom method to trigger the build using dynamic API_URL
  triggerBuild: async (): Promise<{ data: any }> => {
    // Construct full URL
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

export default dataProvider;
