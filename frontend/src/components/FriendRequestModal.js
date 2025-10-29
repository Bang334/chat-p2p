import React from 'react';
import { FiX, FiCheck, FiUserX, FiBell } from 'react-icons/fi';
import './FriendRequestModal.css';

function FriendRequestModal({ 
  isOpen, 
  onClose, 
  requests = [], 
  users = [],
  groups = [],
  onAccept, 
  onReject 
}) {
  if (!isOpen) return null;
  
  // Helper function to get user name
  const getUserName = (userId) => {
    const user = users.find(u => u.userId === userId);
    return user ? user.username : `User #${userId}`;
  };
  
  // Helper function to get group name
  const getGroupName = (groupId) => {
    const group = groups.find(g => g.groupId === groupId);
    return group ? group.groupName : `Group #${groupId}`;
  };

  const handleAccept = async (requestId) => {
    await onAccept(requestId);
  };

  const handleReject = async (requestId) => {
    await onReject(requestId);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="friend-request-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">
            <FiBell className="modal-icon" />
            <h2>Pending Requests</h2>
            {requests.length > 0 && (
              <span className="count-badge">{requests.length}</span>
            )}
          </div>
          <button className="close-btn" onClick={onClose}>
            <FiX />
          </button>
        </div>

        <div className="modal-body">
          {requests.length === 0 ? (
            <div className="empty-state">
              <FiBell className="empty-icon" />
              <p>No pending requests</p>
            </div>
          ) : (
            <div className="friend-requests-list">
              {requests.map((request) => (
                <div key={request.requestId} className="friend-request-item">
                  <div className="request-user-info">
                    <div className="request-icon">
                      {request.requestType === 'FRIEND' ? '👤' : '👥'}
                    </div>
                    <div className="user-details">
                      <h4>
                        {request.requestType === 'FRIEND' ? 'Friend Request' : 'Group Invitation'}
                      </h4>
                      <p>From <strong>{getUserName(request.fromUserId)}</strong></p>
                      {request.requestType === 'GROUP' && request.targetId && (
                        <p className="group-info">
                          To join: <strong>{getGroupName(request.targetId)}</strong>
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="request-actions">
                    <button
                      className="btn-accept"
                      onClick={() => handleAccept(request.requestId)}
                      title="Accept"
                    >
                      <FiCheck />
                      <span>Accept</span>
                    </button>
                    <button
                      className="btn-reject"
                      onClick={() => handleReject(request.requestId)}
                      title="Reject"
                    >
                      <FiUserX />
                      <span>Reject</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default FriendRequestModal;

