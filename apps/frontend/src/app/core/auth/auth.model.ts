export type UserRole = 'ADMIN' | 'USER';

export interface AuthUser {
  id: number;
  fullName: string;
  email: string;
  role: UserRole;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  fullName: string;
  email: string;
  password: string;
}

export interface LoginResponse {
  user: AuthUser;
  token: string;
}

export type RegisterResponse = AuthUser;

export interface RefreshResponse {
  token: string;
}
