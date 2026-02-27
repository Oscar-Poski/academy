import { getApiBaseUrl } from './constants';
import type { LoginApiResponse, LoginRequestBody } from './types';

export async function apiLogin(body: LoginRequestBody): Promise<Response> {
  return fetch(`${getApiBaseUrl()}/v1/auth/login`, {
    method: 'POST',
    cache: 'no-store',
    headers: {
      'content-type': 'application/json'
    },
    body: JSON.stringify(body)
  });
}

export async function apiLogout(refreshToken: string): Promise<Response> {
  return fetch(`${getApiBaseUrl()}/v1/auth/logout`, {
    method: 'POST',
    cache: 'no-store',
    headers: {
      'content-type': 'application/json'
    },
    body: JSON.stringify({ refresh_token: refreshToken })
  });
}

export async function apiRefresh(refreshToken: string): Promise<Response> {
  return fetch(`${getApiBaseUrl()}/v1/auth/refresh`, {
    method: 'POST',
    cache: 'no-store',
    headers: {
      'content-type': 'application/json'
    },
    body: JSON.stringify({ refresh_token: refreshToken })
  });
}

export async function apiMe(accessToken: string): Promise<Response> {
  return fetch(`${getApiBaseUrl()}/v1/auth/me`, {
    method: 'GET',
    cache: 'no-store',
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });
}

export async function parseLoginResponse(response: Response): Promise<LoginApiResponse> {
  return (await response.json()) as LoginApiResponse;
}
