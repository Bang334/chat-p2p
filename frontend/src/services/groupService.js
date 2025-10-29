import axios from 'axios';
import { API_BASE_URL } from '../config/api';
import authService from './authService';

class GroupService {
  async createGroup(groupName, memberIds) {
    try {
      const currentUser = authService.getUser();
      const response = await axios.post(
        `${API_BASE_URL}/groups`,
        {
          groupName,
          creatorId: currentUser.userId,
          memberIds: [currentUser.userId, ...memberIds] // Include creator - backend will skip invitation for them
        },
        {
          headers: {
            Authorization: `Bearer ${authService.getToken()}`
          }
        }
      );
      return response.data;
    } catch (error) {
      console.error('Error creating group:', error);
      throw error;
    }
  }

  async getUserGroups() {
    try {
      const currentUser = authService.getUser();
      const response = await axios.get(
        `${API_BASE_URL}/groups/user/${currentUser.userId}`,
        {
          headers: {
            Authorization: `Bearer ${authService.getToken()}`
          }
        }
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching groups:', error);
      return [];
    }
  }

  async getGroup(groupId) {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/groups/${groupId}`,
        {
          headers: {
            Authorization: `Bearer ${authService.getToken()}`
          }
        }
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching group:', error);
      throw error;
    }
  }

  async addMember(groupId, userId) {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/groups/${groupId}/members`,
        { userId },
        {
          headers: {
            Authorization: `Bearer ${authService.getToken()}`
          }
        }
      );
      return response.data;
    } catch (error) {
      console.error('Error adding member:', error);
      throw error;
    }
  }

  async removeMember(groupId, userId) {
    try {
      const response = await axios.delete(
        `${API_BASE_URL}/groups/${groupId}/members/${userId}`,
        {
          headers: {
            Authorization: `Bearer ${authService.getToken()}`
          }
        }
      );
      return response.data;
    } catch (error) {
      console.error('Error removing member:', error);
      throw error;
    }
  }
}

const groupService = new GroupService();
export default groupService;

