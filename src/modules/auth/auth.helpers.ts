import { AuthProvider } from '@prisma/client';

/**
 * Constants for fallback email domains per provider.
 * Used when a third-party OAuth provider doesn't return an email.
 */
export const FALLBACK_EMAIL_DOMAINS: Record<AuthProvider, string> = {
  [AuthProvider.MEZON]: 'mezon.provider',
  [AuthProvider.GOOGLE]: 'google.provider',
  [AuthProvider.LOCAL]: 'local.provider',
};

/**
 * Generates a unique fallback email for a user based on their provider ID.
 * @param provider The authentication provider (e.g., MEZON, GOOGLE)
 * @param providerId The unique subject ID from the provider
 * @returns A guaranteed unique fallback email string
 */
export function generateFallbackEmail(provider: AuthProvider, providerId: string): string {
  const domain = FALLBACK_EMAIL_DOMAINS[provider] || `${provider.toLowerCase()}.provider`;
  return `${providerId}@${domain}`;
}

/**
 * Returns the provided email if valid, otherwise generates a fallback email.
 * @param email The email returned from the provider (can be null/undefined)
 * @param provider The authentication provider
 * @param providerId The unique subject ID from the provider
 */
export function getEmailOrDefault(
  email: string | null | undefined,
  provider: AuthProvider,
  providerId: string,
): string {
  if (email && email.trim() !== '') {
    return email;
  }
  return generateFallbackEmail(provider, providerId);
}
