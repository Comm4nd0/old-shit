// Mirrors the Django serializers — if the API drifts, tsc should complain.

export interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface SiteSummary {
  id: number;
  name: string;
  slug: string;
  short_description: string;
  latitude: number;
  longitude: number;
  city: string;
  country: string;
  era: string;
  image_url: string;
  source: 'curated' | 'wikipedia';
  average_rating: number | null;
  rating_count: number;
  distance_km: number | null;
}

export interface SitePhoto {
  id: number;
  image: string;
  caption: string;
  username: string;
  created_at: string;
}

export interface SiteDetail extends SiteSummary {
  description: string;
  ticket_url: string;
  ticket_url_kind: 'official' | 'search';
  wikipedia_url: string;
  photos: SitePhoto[];
  user_rating: number | null;
}

export interface Comment {
  id: number;
  text: string;
  username: string;
  created_at: string;
}

export interface RatingResult {
  value: number;
  average_rating: number;
  rating_count: number;
}

export interface AuthResult {
  token: string;
  username: string;
}
