import type {
  ActivityEvent,
  Comment,
  LeaderboardEntry,
  Paginated,
  RatingResult,
  SiteDetail,
  SitePhoto,
  SiteSummary,
  UserProfile,
  VisitResult,
  VoteResult,
} from '../types';
import { del, get, post, postMultipart } from './client';

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

export function checkIn(id: number) {
  return post<VisitResult>(`/api/sites/${id}/visits/`, {});
}

export function undoCheckIn(id: number) {
  return del<VisitResult>(`/api/sites/${id}/visits/`);
}

export function voteComment(commentId: number) {
  return post<VoteResult>(`/api/comments/${commentId}/vote/`, {});
}

export function fetchActivity() {
  return get<{ results: ActivityEvent[] }>('/api/activity/');
}

export function fetchLeaderboard() {
  return get<{ results: LeaderboardEntry[] }>('/api/leaderboard/');
}

export function fetchProfile(username: string) {
  return get<UserProfile>(`/api/users/${encodeURIComponent(username)}/`);
}
