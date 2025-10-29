import React, { useState, useEffect } from 'react';
import { FiX, FiUsers, FiUserPlus } from 'react-icons/fi';
import './InviteToGroupModal.css';

function InviteToGroupModal({ isOpen, onClose, group, users, friends, currentUserId, onInvite }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUsers, setSelectedUsers] = useState(new Set());

  // Filter available friends (not already in group)
  const availableFriends = users.filter(u => 
    u.userId !== currentUserId && 
    friends.includes(u.userId) &&
    !group.memberIds.includes(u.userId)
  );

  // Filter based on search term
  const filteredFriends = availableFriends.filter(user =>
    user.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleToggleUser = (userId) => {
    const newSelected = new Set(selectedUsers);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    setSelectedUsers(newSelected);
  };

  const handleInvite = () => {
    if (selectedUsers.size === 0) {
      return;
    }

    onInvite(Array.from(selectedUsers));
    setSelectedUsers(new Set());
    setSearchTerm('');
  };

  const handleSelectAll = () => {
    if (selectedUsers.size === filteredFriends.length) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(filteredFriends.map(u => u.userId)));
    }
  };

  useEffect(() => {
    if (!isOpen) {
      setSearchTerm('');
      setSelectedUsers(new Set());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content invite-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">
            <FiUserPlus />
            <h3>Invite Friends to Group</h3>
          </div>
          <button className="close-modal-btn" onClick={onClose}>
            <FiX />
          </button>
        </div>

        <div className="modal-body">
          <div className="group-info">
            <div className="group-info-icon">
              <FiUsers />
            </div>
            <div className="group-info-details">
              <div className="group-info-name">{group.groupName}</div>
              <div className="group-info-members">{group.memberCount} member(s)</div>
            </div>
          </div>

          <div className="form-group">
            <input
              type="text"
              placeholder="Search friends..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>

          {filteredFriends.length > 0 && (
            <div className="select-all-section">
              <button
                type="button"
                className="select-all-btn"
                onClick={handleSelectAll}
              >
                {selectedUsers.size === filteredFriends.length ? 'Deselect All' : 'Select All'}
              </button>
              <span className="selected-count">{selectedUsers.size} selected</span>
            </div>
          )}

          <div className="user-select-list invite-list">
            {filteredFriends.length > 0 ? (
              filteredFriends.map(user => (
                <div
                  key={user.userId}
                  className={`user-select-item ${selectedUsers.has(user.userId) ? 'selected' : ''}`}
                  onClick={() => handleToggleUser(user.userId)}
                >
                  <div className="user-select-avatar">
                    {user.username.charAt(0).toUpperCase()}
                  </div>
                  <div className="user-select-info">
                    <div className="user-select-name">{user.username}</div>
                  </div>
                  <div className="user-select-checkbox">
                    {selectedUsers.has(user.userId) && '✓'}
                  </div>
                </div>
              ))
            ) : (
              <div className="no-friends-message">
                <p>
                  {searchTerm 
                    ? 'No friends match your search' 
                    : availableFriends.length === 0 
                      ? 'All your friends are already in this group'
                      : 'No available friends to invite'
                  }
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button 
            className="btn-primary" 
            onClick={handleInvite}
            disabled={selectedUsers.size === 0}
          >
            Invite {selectedUsers.size > 0 ? `(${selectedUsers.size})` : ''}
          </button>
        </div>
      </div>
    </div>
  );
}

export default InviteToGroupModal;

