import React from 'react';
import { FiUser, FiUsers, FiCheck, FiX } from 'react-icons/fi';
import './RequestNotification.css';

function RequestNotification({ requests, onAccept, onReject }) {
  if (!requests || requests.length === 0) {
    return null;
  }

  return (
    <div className="request-notification-container">
      <div className="request-notification-header">
        <h4>Pending Requests ({requests.length})</h4>
      </div>
      <div className="request-list">
        {requests.map(request => (
          <div key={request.requestId} className="request-item">
            <div className="request-icon">
              {request.requestType === 'friend' ? (
                <FiUser size={24} />
              ) : (
                <FiUsers size={24} />
              )}
            </div>
            <div className="request-info">
              <div className="request-type">
                {request.requestType === 'friend' ? 'Friend Request' : 'Group Invitation'}
              </div>
              <div className="request-details">
                From: User #{request.fromUserId}
                {request.requestType === 'group' && ` - Group #${request.targetId}`}
              </div>
            </div>
            <div className="request-actions">
              <button
                className="btn-accept"
                onClick={() => onAccept(request.requestId)}
                title="Accept"
              >
                <FiCheck size={18} />
              </button>
              <button
                className="btn-reject"
                onClick={() => onReject(request.requestId)}
                title="Reject"
              >
                <FiX size={18} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default RequestNotification;

