const AVATAR_BY_ALIAS: Record<string, string> = {
  "charly novoa": "/player-avatars/charly-novoa.png",
  "el rustico": "/player-avatars/mariano-el-rustico.png",
  "mariano el rustico": "/player-avatars/mariano-el-rustico.png",
};

export function getPlayerAvatarUrl(alias: string): string | null {
  const normalizedAlias = alias
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();

  return AVATAR_BY_ALIAS[normalizedAlias] ?? null;
}
