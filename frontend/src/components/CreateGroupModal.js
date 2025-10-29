import React, { useState } from 'react';
import { FiX, FiUsers } from 'react-icons/fi';
import './CreateGroupModal.css';

function CreateGroupModal({ isOpen, onClose, users, currentUserId, friends, onCreateGroup }) {
  const [groupName, setGroupName] = useState('');
  const [selectedUsers, setSelectedUsers] = useState(new Set());

  const handleToggleUser = (userId) => {
    const newSelected = new Set(selectedUsers);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    setSelectedUsers(newSelected);
  };

  const handleCreate = () => {
    if (!groupName.trim()) {
      return;
    }

    if (selectedUsers.size === 0) {
      return;
    }

    onCreateGroup(groupName, Array.from(selectedUsers));
    setGroupName('');
    setSelectedUsers(new Set());
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">
            <FiUsers />
            <h3>Create Group</h3>
          </div>
          <button className="close-modal-btn" onClick={onClose}>
            <FiX />
          </button>
        </div>

        <div className="modal-body">
          <div className="form-group">
            <label>Group Name</label>
            <input
              type="text"
              placeholder="Enter group name"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              className="group-name-input"
            />
          </div>

          <div className="form-group">
            <label>Select Members ({selectedUsers.size} selected)</label>
            <div className="user-select-list">
              {users
                .filter(u => u.userId !== currentUserId && friends.includes(u.userId))
                .length > 0 ? (
                users
                  .filter(u => u.userId !== currentUserId && friends.includes(u.userId))
                  .map(user => (
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
                  <p>Bạn chưa có bạn bè nào để thêm vào nhóm.</p>
                  <p>Hãy kết bạn trước khi tạo nhóm!</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-primary" onClick={handleCreate}>
            Create Group
          </button>
        </div>
      </div>
    </div>
  );
}

export default CreateGroupModal;

