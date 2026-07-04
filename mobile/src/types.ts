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

export interface Comment {
  id: number;
  text: string;
  username: string;
  created_at: string;
  upvotes: number;
  upvoted_by_me: boolean;
}

export interface SiteDetail extends SiteSummary {
  description: string;
  ticket_url: string;
  ticket_url_kind: 'official' | 'search';
  wikipedia_url: string;
  photos: SitePhoto[];
  user_rating: number | null;
  visit_count: number;
  visited_by_me: boolean;
  top_take: Comment | null;
  share_url: string;
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

export interface VisitResult {
  visited: boolean;
  visit_count: number;
}

export interface VoteResult {
  upvoted: boolean;
  upvotes: number;
}

export interface ActivityEvent {
  type: 'visit' | 'comment' | 'photo';
  username: string;
  site_id: number;
  site_name: string;
  created_at: string;
  text?: string;
  caption?: string;
  image?: string;
}

export interface LeaderboardEntry {
  username: string;
  visit_count: number;
}

export interface UserProfile {
  username: string;
  joined: string;
  visit_count: number;
  comment_count: number;
  photo_count: number;
  rating_count: number;
  years_of_old_shit: number | null;
  recent_visits: { site_id: number; site_name: string; visited_at: string }[];
}
