const AVATAR_BY_ALIAS: Record<string, string> = {
  "el rustico": "/dt-avatars/mariano-el-rustico.png",
  "mariano el rustico": "/dt-avatars/mariano-el-rustico.png",
  "charly novoa": "/dt-avatars/charly-novoa.png",
  "charly novoa dt": "/dt-avatars/charly-novoa.png",
};

export function getDTAvatarUrl(alias: string): string | null {
  const normalizedAlias = alias
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();

  return AVATAR_BY_ALIAS[normalizedAlias] ?? null;
}
