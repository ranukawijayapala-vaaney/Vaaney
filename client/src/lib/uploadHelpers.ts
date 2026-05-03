export type UploadVisibility = "public" | "private";

export type FinalizeKind = "default" | "private" | "banner" | "product";

export interface FinalizeConfig {
  kind: FinalizeKind;
  visibility?: UploadVisibility;
  fileName?: string;
}

export interface UploadFileResult {
  objectPath: string;
  url?: string;
  rawObjectPath: string;
  uploadUrl: string;
}

const FINALIZE_ENDPOINTS: Record<FinalizeKind, string> = {
  default: "/api/object-storage/finalize-upload",
  private: "/api/object-storage/finalize-private-upload",
  banner: "/api/object-storage/finalize-banner-upload",
  product: "/api/object-storage/finalize-product-upload",
};

export async function readErrorMessage(res: Response, fallback: string): Promise<string> {
  const ct = res.headers.get("content-type") || "";
  try {
    if (ct.includes("application/json")) {
      const body = await res.json();
      if (body && typeof body.message === "string" && body.message.trim()) {
        return body.message;
      }
    } else {
      const text = await res.text();
      if (text && text.trim()) return text.trim().slice(0, 300);
    }
  } catch {
    // fall through
  }
  return `${fallback} (HTTP ${res.status})`;
}

export interface UploadUrlResponse {
  uploadUrl: string;
  objectPath: string;
}

export async function requestUploadUrl(file: File): Promise<UploadUrlResponse> {
  const res = await fetch("/api/object-storage/upload-url", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fileName: file.name, contentType: file.type }),
  });

  if (!res.ok) {
    throw new Error(await readErrorMessage(res, "Could not get upload URL"));
  }

  const data = await res.json().catch(() => null);
  if (!data || typeof data.uploadUrl !== "string" || typeof data.objectPath !== "string") {
    throw new Error("Server returned an invalid upload URL response.");
  }
  return data as UploadUrlResponse;
}

export async function putFileToSignedUrl(uploadUrl: string, file: File): Promise<void> {
  const res = await fetch(uploadUrl, {
    method: "PUT",
    body: file,
    headers: { "Content-Type": file.type },
  });

  if (!res.ok) {
    const detail = await readErrorMessage(res, "Storage upload failed");
    throw new Error(`Could not upload "${file.name}" to storage: ${detail}`);
  }
}

export async function finalizeUpload(
  rawObjectPath: string,
  config: FinalizeConfig,
): Promise<{ objectPath: string; url?: string }> {
  const endpoint = FINALIZE_ENDPOINTS[config.kind];
  const body: Record<string, unknown> = { objectPath: rawObjectPath };
  if (config.kind === "default" && config.visibility) {
    body.visibility = config.visibility;
  }
  if (config.kind === "private" && config.fileName) {
    body.fileName = config.fileName;
  }

  const res = await fetch(endpoint, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(await readErrorMessage(res, "Finalizing upload failed"));
  }

  const data = await res.json().catch(() => null);
  if (!data || typeof data.objectPath !== "string") {
    throw new Error("Server returned an invalid finalize response.");
  }
  return { objectPath: data.objectPath, url: typeof data.url === "string" ? data.url : undefined };
}

export async function uploadFormData(
  url: string,
  formData: FormData,
  fallbackError = "Upload failed",
): Promise<any> {
  const res = await fetch(url, {
    method: "POST",
    body: formData,
    credentials: "include",
  });
  if (!res.ok) {
    throw new Error(await readErrorMessage(res, fallbackError));
  }
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) {
    return await res.json().catch(() => null);
  }
  return null;
}

export async function uploadFile(
  file: File,
  config: FinalizeConfig,
): Promise<UploadFileResult> {
  const { uploadUrl, objectPath: rawObjectPath } = await requestUploadUrl(file);
  await putFileToSignedUrl(uploadUrl, file);
  const finalized = await finalizeUpload(rawObjectPath, {
    ...config,
    fileName: config.fileName ?? file.name,
  });
  return {
    objectPath: finalized.objectPath,
    url: finalized.url,
    rawObjectPath,
    uploadUrl,
  };
}
