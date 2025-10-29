import React, { useState, useEffect } from 'react';
import { FiX, FiUserX, FiUsers } from 'react-icons/fi';
import ConfirmModal from './ConfirmModal';
import './FriendListModal.css';

function FriendListModal({ isOpen, onClose, users, friends, currentUserId, onRemoveFriend }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredFriends, setFilteredFriends] = useState([]);
  const [confirmState, setConfirmState] = useState(null);

  useEffect(() => {
    if (!isOpen) {
      setSearchTerm('');
    }
  }, [isOpen]);

  useEffect(() => {
    if (users && friends) {
      const friendUsers = users.filter(u => 
        friends.includes(u.userId) && u.userId !== currentUserId
      );
      
      const filtered = friendUsers.filter(user =>
        user.username.toLowerCase().includes(searchTerm.toLowerCase())
      );
      
      setFilteredFriends(filtered);
    }
  }, [users, friends, searchTerm, currentUserId]);

  const handleRemoveFriend = async (friendId, friendName) => {
    setConfirmState({
      friendId,
      friendName
    });
  };

  const handleConfirmRemove = async () => {
    if (confirmState) {
      await onRemoveFriend(confirmState.friendId);
      setConfirmState(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content friend-list-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">
            <FiUsers />
            <h3>My Friends ({filteredFriends.length})</h3>
          </div>
          <button className="close-modal-btn" onClick={onClose}>
            <FiX />
          </button>
        </div>

        <div className="modal-body">
          <div className="form-group">
            <input
              type="text"
              placeholder="Search friends..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>

          <div className="friend-list">
            {filteredFriends.length > 0 ? (
              filteredFriends.map(friend => (
                <div key={friend.userId} className="friend-item">
                  <div className="friend-avatar">
                    {friend.username.charAt(0).toUpperCase()}
                  </div>
                  <div className="friend-info">
                    <div className="friend-name">{friend.username}</div>
                    <div className="friend-status">
                      <span className="status-dot online"></span>
                      Friend
                    </div>
                  </div>
                  <button
                    className="remove-friend-btn"
                    onClick={() => handleRemoveFriend(friend.userId, friend.username)}
                    title="Remove friend"
                  >
                    <FiUserX />
                    <span>Remove</span>
                  </button>
                </div>
              ))
            ) : (
              <div className="no-friends-message">
                <p>{searchTerm ? 'No friends match your search' : 'No friends yet'}</p>
              </div>
            )}
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-primary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>

      {/* Confirm Modal */}
      <ConfirmModal
        isOpen={confirmState !== null}
        title="Unfriend Confirmation"
        message={`Are you sure you want to unfriend "${confirmState?.friendName}"?`}
        confirmText="Unfriend"
        cancelText="Cancel"
        type="danger"
        onConfirm={handleConfirmRemove}
        onCancel={() => setConfirmState(null)}
      />
    </div>
  );
}

export default FriendListModal;

