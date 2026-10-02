export function profileHref(author: {
  username: string;
  kind?: "user" | "org";
}): string {
  return author.kind === "org"
    ? `/org/${author.username}`
    : `/u/${author.username}`;
}
