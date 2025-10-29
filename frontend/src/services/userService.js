import axios from 'axios';
import { API_BASE_URL } from '../config/api';
import authService from './authService';

class UserService {
  async getAllUsers() {
    try {
      const response = await axios.get(`${API_BASE_URL}/users/all`, {
        headers: {
          Authorization: `Bearer ${authService.getToken()}`
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching users:', error);
      return [];
    }
  }

  async getOnlineUsers() {
    try {
      const response = await axios.get(`${API_BASE_URL}/users/online`, {
        headers: {
          Authorization: `Bearer ${authService.getToken()}`
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching online users:', error);
      return [];
    }
  }

  async updateStatus(userId, status) {
    try {
      await axios.put(
        `${API_BASE_URL}/users/${userId}/status?status=${status}`,
        {},
        {
          headers: {
            Authorization: `Bearer ${authService.getToken()}`
          }
        }
      );
    } catch (error) {
      console.error('Error updating status:', error);
    }
  }
}

const userService = new UserService();
export default userService;

