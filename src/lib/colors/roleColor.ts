/** Color of a role by id in the current palette roles list, with a fallback while it does not exist. */
export const roleColor = (roles: { id: string; color: string }[], id: string, fallback = "#9CA3AF") =>
  roles.find((r) => r.id === id)?.color ?? fallback;
