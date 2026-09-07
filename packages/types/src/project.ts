export type ProjectType =
  | "mod"
  | "plugin"
  | "resource_pack"
  | "behavior_pack"
  | "world"
  | "skin_pack"
  | "shader"
  | "launcher";

export type ResourcePackResolution = "16x" | "32x" | "64x" | "128x";

export type ProjectEnvironment = "client" | "server" | "both";

export type ProjectLoader = "amethyst" | "levilamina" | "flarial" | "latite";

export type GameVersion =
  "26.40" | "26.30" | "26.20" | "26.10" | "1.21.90" | "1.21.80" | "1.21.70";

export type ProjectStatus = "pending" | "approved" | "rejected" | "hidden";

export interface Project {
  id: string;
  slug: string;

  name: string;
  description: string;
  readme?: string;

  type: ProjectType;

  iconUrl?: string | null;

  headerUrl?: string | null;

  tags?: string[] | null;

  author: {
    id: string;
    username: string;
    avatarUrl?: string | null;
    kind?: "user" | "org";
  };

  downloads: number;

  status?: ProjectStatus;

  moderationNote?: string | null;

  createdAt?: string;
  updatedAt?: string;

  gameVersions?: GameVersion[];

  environments?: ProjectEnvironment[];

  resolutions?: ResourcePackResolution[];

  loaders?: ProjectLoader[];
}
