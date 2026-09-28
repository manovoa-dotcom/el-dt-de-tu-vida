// Transforma un PIN de 4 dígitos en una clave que Supabase acepte
// (mínimo 6 caracteres). El usuario siempre escribe 4 dígitos.
export function pinToPassword(pin: string): string {
  return `dtvida_${pin}_x`;
}