import React, { useState, useEffect } from 'react';
import { FiX, FiUsers, FiUser } from 'react-icons/fi';
import './BroadcastModal.css';

function BroadcastModal({ 
  isOpen, 
  onClose, 
  friends = [], 
  groups = [], 
  users = [], 
  currentUserId,
  onSelectRecipients 
}) {
  const [selectedFriends, setSelectedFriends] = useState(new Set());
  const [selectedGroups, setSelectedGroups] = useState(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('friends');

  useEffect(() => {
    if (isOpen) {
      setSelectedFriends(new Set());
      setSelectedGroups(new Set());
      setSearchTerm('');
      setActiveTab('friends');
    }
  }, [isOpen]);

  const handleFriendToggle = (friendId) => {
    const newSelected = new Set(selectedFriends);
    if (newSelected.has(friendId)) {
      newSelected.delete(friendId);
    } else {
      newSelected.add(friendId);
    }
    setSelectedFriends(newSelected);
  };

  const handleGroupToggle = (groupId) => {
    const newSelected = new Set(selectedGroups);
    if (newSelected.has(groupId)) {
      newSelected.delete(groupId);
    } else {
      newSelected.add(groupId);
    }
    setSelectedGroups(newSelected);
  };

  const handleConfirm = () => {
    const totalRecipients = selectedFriends.size + selectedGroups.size;
    if (totalRecipients === 0) {
      alert('Please select at least one recipient');
      return;
    }

    // Return selected recipients to parent
    onSelectRecipients({
      friends: Array.from(selectedFriends),
      groups: Array.from(selectedGroups)
    });
    onClose();
  };

  const getUserName = (userId) => {
    const user = users.find(u => u.userId === userId);
    return user ? user.username : `User ${userId}`;
  };

  const getGroupName = (groupId) => {
    const group = groups.find(g => g.groupId === groupId);
    return group ? group.groupName : `Group ${groupId}`;
  };

  const filteredFriends = friends.filter(friendId => {
    const userName = getUserName(friendId);
    return userName.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const filteredGroups = groups.filter(group => {
    const groupName = group.groupName.toLowerCase();
    return groupName.includes(searchTerm.toLowerCase());
  });

  const totalSelected = selectedFriends.size + selectedGroups.size;

  return (
    <div className={`broadcast-modal-overlay ${isOpen ? 'open' : ''}`}>
      <div className="broadcast-modal">
        <div className="broadcast-modal-header">
          <h2>Select Recipients</h2>
          <button className="close-btn" onClick={onClose}>
            <FiX />
          </button>
        </div>

        <div className="broadcast-modal-content">
          {/* Recipients Selection */}
          <div className="recipients-section">
            <div className="section-header">
              <h3>Choose who to send to (Online friends only)</h3>
              <span className="selected-count">
                {totalSelected} selected
              </span>
            </div>

            {/* Search */}
            <div className="search-box">
              <input
                type="text"
                placeholder="Search friends or groups..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Tabs */}
            <div className="recipient-tabs">
              <button
                className={`tab ${activeTab === 'friends' ? 'active' : ''}`}
                onClick={() => setActiveTab('friends')}
              >
                <FiUser /> Online Friends ({friends.length})
              </button>
              <button
                className={`tab ${activeTab === 'groups' ? 'active' : ''}`}
                onClick={() => setActiveTab('groups')}
              >
                <FiUsers /> Groups ({groups.length})
              </button>
            </div>

            {/* Recipients List */}
            <div className="recipients-list">
              {activeTab === 'friends' ? (
                <div className="friends-list">
                  {filteredFriends.length === 0 ? (
                    <div className="no-items">
                      {searchTerm ? 'No online friends found' : 'No online friends available'}
                    </div>
                  ) : (
                    filteredFriends.map(friendId => (
                      <div
                        key={friendId}
                        className={`recipient-item ${selectedFriends.has(friendId) ? 'selected' : ''}`}
                        onClick={() => handleFriendToggle(friendId)}
                      >
                        <div className="recipient-info">
                          <div className="recipient-avatar">
                            {getUserName(friendId).charAt(0).toUpperCase()}
                          </div>
                          <span className="recipient-name">
                            {getUserName(friendId)}
                          </span>
                        </div>
                        <div className="recipient-type">
                          <span className="status-indicator online">🟢 Online</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              ) : (
                <div className="groups-list">
                  {filteredGroups.length === 0 ? (
                    <div className="no-items">
                      {searchTerm ? 'No groups found' : 'No groups available'}
                    </div>
                  ) : (
                    filteredGroups.map(group => (
                      <div
                        key={group.groupId}
                        className={`recipient-item ${selectedGroups.has(group.groupId) ? 'selected' : ''}`}
                        onClick={() => handleGroupToggle(group.groupId)}
                      >
                        <div className="recipient-info">
                          <div className="recipient-avatar group-avatar">
                            <FiUsers />
                          </div>
                          <span className="recipient-name">
                            {group.groupName}
                          </span>
                        </div>
                        <div className="recipient-type">
                          <span className="status-indicator group">👥 {group.memberCount} members</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="broadcast-modal-actions">
          <button className="cancel-btn" onClick={onClose}>
            Cancel
          </button>
          <button 
            className="confirm-btn"
            onClick={handleConfirm}
            disabled={totalSelected === 0}
          >
            Select {totalSelected} recipient{totalSelected !== 1 ? 's' : ''}
          </button>
        </div>
      </div>
    </div>
  );
}

export default BroadcastModal;
