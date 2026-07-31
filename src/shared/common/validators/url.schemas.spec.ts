import { GoogleMapsUrlSchema, HttpsUrlSchema } from './url.schemas';

describe('URL schemas', () => {
  it('rejects malformed URLs without throwing', () => {
    expect(() => HttpsUrlSchema.safeParse('not-a-url')).not.toThrow();
    expect(() => GoogleMapsUrlSchema.safeParse('not-a-url')).not.toThrow();
    expect(HttpsUrlSchema.safeParse('not-a-url').success).toBe(false);
    expect(GoogleMapsUrlSchema.safeParse('not-a-url').success).toBe(false);
  });

  it.each([
    'javascript:alert(1)',
    'data:text/html,<script>alert(1)</script>',
    'file:///etc/passwd',
    'ftp://example.com/file',
    'http://example.com/image.jpg',
  ])('rejects unsafe or non-HTTPS URL %s', (value) => {
    expect(HttpsUrlSchema.safeParse(value).success).toBe(false);
  });

  it('accepts HTTPS URLs', () => {
    expect(HttpsUrlSchema.safeParse('https://images.example.com/image.jpg').success).toBe(true);
  });

  it.each([
    'https://www.google.com/maps/search/?api=1&query=Hanoi',
    'https://maps.google.com/maps?q=Hanoi',
    'https://maps.app.goo.gl/example',
  ])('accepts supported Google Maps URL %s', (value) => {
    expect(GoogleMapsUrlSchema.safeParse(value).success).toBe(true);
  });

  it.each([
    'javascript:alert(1)',
    'https://google.com.attacker.example/maps',
    'https://evil.example/?next=google.com',
  ])('rejects invalid Google Maps URL %s', (value) => {
    expect(GoogleMapsUrlSchema.safeParse(value).success).toBe(false);
  });
});
