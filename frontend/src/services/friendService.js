import axios from 'axios';
import { API_BASE_URL } from '../config/api';
import authService from './authService';

class FriendService {
  async getFriends(userId) {
    try {
      const response = await axios.get(`${API_BASE_URL}/friends`, {
        params: { userId },
        headers: {
          Authorization: `Bearer ${authService.getToken()}`
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching friends:', error);
      return [];
    }
  }

  async addFriend(friendId, userId) {
    try {
      await axios.post(`${API_BASE_URL}/requests/friend`, null, {
        params: { friendId, userId },
        headers: {
          Authorization: `Bearer ${authService.getToken()}`
        }
      });
      return true;
    } catch (error) {
      console.error('Error adding friend:', error);
      return false;
    }
  }

  async getRequests(userId) {
    try {
      console.log('🔔 Fetching pending requests for userId:', userId);
      const response = await axios.get(`${API_BASE_URL}/requests/pending`, {
        params: { userId },
        headers: {
          Authorization: `Bearer ${authService.getToken()}`
        }
      });
      console.log('🔔 Pending requests response:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching requests:', error);
      console.error('Error details:', error.response?.data);
      return [];
    }
  }

  async acceptRequest(requestId, userId) {
    try {
      await axios.post(`${API_BASE_URL}/requests/${requestId}/accept`, null, {
        params: { userId },
        headers: {
          Authorization: `Bearer ${authService.getToken()}`
        }
      });
      return true;
    } catch (error) {
      console.error('Error accepting request:', error);
      return false;
    }
  }

  async rejectRequest(requestId, userId) {
    try {
      await axios.post(`${API_BASE_URL}/requests/${requestId}/reject`, null, {
        params: { userId },
        headers: {
          Authorization: `Bearer ${authService.getToken()}`
        }
      });
      return true;
    } catch (error) {
      console.error('Error rejecting request:', error);
      return false;
    }
  }

  async removeFriend(friendId, userId) {
    try {
      await axios.delete(`${API_BASE_URL}/friends/${friendId}`, {
        params: { userId },
        headers: {
          Authorization: `Bearer ${authService.getToken()}`
        }
      });
      return true;
    } catch (error) {
      console.error('Error removing friend:', error);
      return false;
    }
  }
}

const friendService = new FriendService();
export default friendService;

