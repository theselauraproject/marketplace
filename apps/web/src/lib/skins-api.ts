import { apiFetch, apiUrl } from "@/lib/api-client";

export type SkinKind = "full" | "piece";

export type SkinVariant = "classic" | "slim";

export type SkinSlot =
  | "hair"
  | "face"
  | "headwear"
  | "top"
  | "jacket"
  | "sleeve_left"
  | "sleeve_right"
  | "legs"
  | "shoes"
  | "accessory"
  | "other";

export const SKIN_SLOTS: { value: SkinSlot; label: string }[] = [
  { value: "hair", label: "Hair" },
  { value: "face", label: "Face" },
  { value: "headwear", label: "Headwear" },
  { value: "top", label: "Top" },
  { value: "jacket", label: "Jacket" },
  { value: "sleeve_left", label: "Left sleeve" },
  { value: "sleeve_right", label: "Right sleeve" },
  { value: "legs", label: "Legs" },
  { value: "shoes", label: "Shoes" },
  { value: "accessory", label: "Accessory" },
  { value: "other", label: "Other" },
];

export interface SkinAuthor {
  id: string;
  username: string;
  avatarUrl: string | null;
  kind?: "user" | "org";
}

export interface Skin {
  id: string;
  slug: string;
  name: string;
  description: string;
  kind: SkinKind;
  pieceSlot: SkinSlot | null;
  variant: SkinVariant;
  imageUrl: string;
  tags: string[] | null;
  downloads: number;
  createdAt: string;
  author: SkinAuthor;
  uploader?: { id: string; username: string };
}

export interface SkinCredit {
  id: string;
  slug: string;
  name: string;
  kind: SkinKind;
  pieceSlot: SkinSlot | null;
  imageUrl: string;
  author: { username: string; kind?: "user" | "org" };
}

export interface SkinDetail extends Skin {
  remixedFrom: SkinCredit[];
  canManage?: boolean;
  canFeature?: boolean;
}

export interface SkinFilter {
  kind?: SkinKind;
  slot?: SkinSlot;
  q?: string;
}

export async function getSkins(filter?: SkinFilter): Promise<Skin[]> {
  const params = new URLSearchParams();

  if (filter?.kind) params.set("kind", filter.kind);
  if (filter?.slot) params.set("slot", filter.slot);
  if (filter?.q) params.set("q", filter.q);

  const query = params.toString();

  const response = await fetch(
    apiUrl(`/api/v1/skins${query ? `?${query}` : ""}`),
    { cache: "no-store" },
  );

  if (!response.ok) {
    throw new Error("Failed to load skins");
  }

  const data = (await response.json()) as { skins: Skin[] };
  return data.skins;
}

export async function getSkinBySlug(
  slug: string,
  cookieHeader?: string,
): Promise<SkinDetail | null> {
  const response = await fetch(apiUrl(`/api/v1/skins/${slug}`), {
    headers: cookieHeader ? { cookie: cookieHeader } : undefined,
    cache: "no-store",
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error("Failed to load skin");
  }

  const data = (await response.json()) as { skin: SkinDetail };
  return data.skin;
}

export interface UploadSkinInput {
  name: string;
  description?: string;
  kind: SkinKind;
  pieceSlot?: SkinSlot;
  variant?: SkinVariant;
  tags?: string[];
  remixedFrom?: string[];
  file: File | Blob;
  fileName?: string;
}

export async function uploadSkin(input: UploadSkinInput): Promise<Skin> {
  const formData = new FormData();

  formData.append("name", input.name);
  formData.append("description", input.description ?? "");
  formData.append("kind", input.kind);
  formData.append("variant", input.variant ?? "classic");

  if (input.pieceSlot) {
    formData.append("pieceSlot", input.pieceSlot);
  }

  if (input.tags && input.tags.length > 0) {
    formData.append("tags", JSON.stringify(input.tags));
  }

  if (input.remixedFrom && input.remixedFrom.length > 0) {
    formData.append("remixedFrom", JSON.stringify(input.remixedFrom));
  }

  formData.append("file", input.file, input.fileName ?? "skin.png");

  const response = await apiFetch("/api/v1/skins", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.error ?? "Failed to upload skin");
  }

  const data = (await response.json()) as { skin: Skin };
  return data.skin;
}

export async function deleteSkin(slug: string): Promise<void> {
  const response = await apiFetch(`/api/v1/skins/${slug}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.error ?? "Failed to delete skin");
  }
}

export async function setFeaturedSkin(
  skinId: string | null,
  username?: string,
): Promise<void> {
  const path = username
    ? `/api/v1/users/${encodeURIComponent(username)}/featured-skin`
    : "/api/v1/users/me/featured-skin";

  const response = await apiFetch(path, {
    method: "PATCH",
    body: JSON.stringify({ skinId }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.error ?? "Failed to set featured skin");
  }
}
