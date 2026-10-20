const PLATFORM_ADMIN_EMAIL = "manovoa@gmail.com";

export function isPlatformAdmin(email: string | undefined | null): boolean {
  return email?.trim().toLowerCase() === PLATFORM_ADMIN_EMAIL;
}
