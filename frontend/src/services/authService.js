import axios from 'axios';
import { API_BASE_URL } from '../config/api';

class AuthService {
  constructor() {
    this.token = localStorage.getItem('token');
    this.user = JSON.parse(localStorage.getItem('user') || 'null');
  }

  async register(username, password) {
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/register`, {
        username,
        password
      });

      const { token, userId, peerId } = response.data;
      
      this.token = token;
      this.user = { userId, username, peerId };
      
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(this.user));

      return response.data;
    } catch (error) {
      throw new Error(error.response?.data || 'Registration failed');
    }
  }

  async login(username, password) {
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/login`, {
        username,
        password
      });

      console.log('Login response:', response.data);
      
      const { token, userId, peerId } = response.data;
      
      this.token = token;
      this.user = { userId, username, peerId };
      
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(this.user));

      console.log('User saved to localStorage:', this.user);

      return response.data;
    } catch (error) {
      throw new Error(error.response?.data || 'Login failed');
    }
  }

  logout() {
    console.log('🔐 Clearing authentication...');
    this.token = null;
    this.user = null;
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    console.log('✅ Authentication cleared');
  }

  isAuthenticated() {
    return !!this.token && !!this.user;
  }

  getToken() {
    return this.token;
  }

  getUser() {
    return this.user;
  }

  getPeerId() {
    return this.user?.peerId;
  }
}

const authService = new AuthService();
export default authService;

