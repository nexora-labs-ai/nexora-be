import { z } from 'zod';

function parseUrl(value: string): URL | null {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

export const HttpsUrlSchema = z
  .string()
  .url()
  .refine((value) => parseUrl(value)?.protocol === 'https:', 'URL must use HTTPS');

const GOOGLE_MAPS_HOSTS = new Set([
  'google.com',
  'www.google.com',
  'maps.google.com',
  'maps.app.goo.gl',
]);

export const GoogleMapsUrlSchema = HttpsUrlSchema.refine((value) => {
  const hostname = parseUrl(value)?.hostname.toLowerCase();
  if (!hostname) return false;
  return GOOGLE_MAPS_HOSTS.has(hostname) || hostname.endsWith('.google.com');
}, 'Invalid Google Maps URL');
