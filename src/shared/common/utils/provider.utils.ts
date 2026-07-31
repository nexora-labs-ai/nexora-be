import { AuthProvider } from '@prisma/client';

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
export function generateProviderEmail(provider: AuthProvider, providerId: string): string {
  const domain = FALLBACK_EMAIL_DOMAINS[provider] || `${provider.toLowerCase()}.provider`;
  return `${providerId}@${domain}`;
}
