import type {
  Comment,
  Paginated,
  RatingResult,
  SiteDetail,
  SitePhoto,
  SiteSummary,
} from '../types';
import { get, post, postMultipart } from './client';

export function fetchNearby(lat: number, lng: number, radius = 25, page = 1) {
  return get<Paginated<SiteSummary>>(
    `/api/sites/nearby/?lat=${lat}&lng=${lng}&radius=${radius}&page=${page}`
  );
}

export function fetchAll(page = 1) {
  return get<Paginated<SiteSummary>>(`/api/sites/?page=${page}`);
}

export function searchSites(query: string, page = 1) {
  return get<Paginated<SiteSummary>>(
    `/api/sites/search/?q=${encodeURIComponent(query)}&page=${page}`
  );
}

export function fetchSite(id: number) {
  return get<SiteDetail>(`/api/sites/${id}/`);
}

export function fetchComments(id: number, page = 1) {
  return get<Paginated<Comment>>(`/api/sites/${id}/comments/?page=${page}`);
}

export function postComment(id: number, text: string) {
  return post<Comment>(`/api/sites/${id}/comments/`, { text });
}

export function postRating(id: number, value: number) {
  return post<RatingResult>(`/api/sites/${id}/ratings/`, { value });
}

export function postPhoto(id: number, form: FormData) {
  return postMultipart<SitePhoto>(`/api/sites/${id}/photos/`, form);
}
