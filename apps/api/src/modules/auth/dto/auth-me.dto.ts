export interface AuthMeDto {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'admin';
}
