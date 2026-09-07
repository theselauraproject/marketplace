import type {
  GameVersion,
  ProjectEnvironment,
  ProjectLoader,
  ProjectType,
  ResourcePackResolution,
} from "@selaura/types";

import { apiFetch } from "@/lib/api-client";

interface LabeledOption<T> {
  value: T;
  label: string;
}

export interface Metadata {
  types: LabeledOption<ProjectType>[];
  gameVersions: GameVersion[];
  loaders: LabeledOption<ProjectLoader>[];
  environments: LabeledOption<ProjectEnvironment>[];
  resolutions: ResourcePackResolution[];
}

export async function getMetadata(): Promise<Metadata> {
  const response = await apiFetch("/api/v1/metadata");

  if (!response.ok) {
    throw new Error("Failed to load metadata");
  }

  return response.json();
}
