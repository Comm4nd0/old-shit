import type { AuthResult } from '../types';
import { post } from './client';

export function register(username: string, email: string, password: string) {
  return post<AuthResult>('/api/auth/register/', { username, email, password });
}

export function login(username: string, password: string) {
  return post<AuthResult>('/api/auth/login/', { username, password });
}
