pub const PROJECT_TYPES: &[(&str, &str)] = &[
    ("mod", "Mod"),
    ("plugin", "Plugin"),
    ("resource_pack", "Resource Pack"),
    ("behavior_pack", "Behavior Pack"),
    ("world", "World"),
    ("skin_pack", "Skin Pack"),
    ("shader", "Shader"),
    ("launcher", "Launcher"),
];

pub const GAME_VERSIONS: &[&str] = &[
    "26.40", "26.30", "26.20", "26.10", "1.21.90", "1.21.80", "1.21.70",
];

pub const PROJECT_LOADERS: &[(&str, &str)] = &[
    ("amethyst", "Amethyst"),
    ("levilamina", "LeviLamina"),
    ("flarial", "Flarial"),
    ("latite", "Latite"),
];

pub const PROJECT_ENVIRONMENTS: &[(&str, &str)] = &[
    ("client", "Client"),
    ("server", "Server"),
    ("both", "Client & Server"),
];

pub const RESOURCE_PACK_RESOLUTIONS: &[&str] = &["16x", "32x", "64x", "128x"];

pub fn is_valid_project_type(value: &str) -> bool {
    PROJECT_TYPES.iter().any(|(v, _)| *v == value)
}

pub fn parse_enum_csv(value: Option<&str>, allowed: &[&str]) -> Vec<String> {
    match value {
        None => Vec::new(),
        Some(raw) => raw
            .split(',')
            .map(|s| s.trim())
            .filter(|s| allowed.contains(s))
            .map(|s| s.to_string())
            .collect(),
    }
}
