export interface GeocodingRequest {
  address: string;
}

export interface GeocodingResponse {
  lat: number;
  lng: number;
  formattedAddress: string;
}

export interface PlaceSearchRequest {
  query: string;
  location?: { lat: number; lng: number };
  radius?: number;
}

export interface PlaceResult {
  placeId: string;
  name: string;
  address: string;
  rating?: number;
  types: string[];
}

export const MAPS_PORT = Symbol('MAPS_PORT');

export interface MapsPort {
  geocode(request: GeocodingRequest): Promise<GeocodingResponse>;
  searchPlaces(request: PlaceSearchRequest): Promise<PlaceResult[]>;
}
