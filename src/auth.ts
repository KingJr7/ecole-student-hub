import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export interface LoginResponse {
  message: string;
  token: string;
  role: string;
  user: {
    id: number;
    email: string;
    school_id: string;
    name: string;
    first_name: string;
    phone: string;
  };
}

export async function login(email: string, password: string): Promise<LoginResponse> {
  const { data } = await axios.post<LoginResponse>(`${API_URL}/auth/login`, { email, password });
  return data;
}
