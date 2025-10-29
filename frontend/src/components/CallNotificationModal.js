import React from 'react';
import { FiPhone, FiX } from 'react-icons/fi';
import './CallNotificationModal.css';

function CallNotificationModal({ caller, isOpen, onAccept, onReject }) {
  if (!isOpen) return null;

  return (
    <div className="call-notification-overlay">
      <div className="call-notification-modal">
        <div className="call-notification-icon">
          <FiPhone size={48} />
        </div>
        <h2>Incoming Call</h2>
        <p className="caller-name">{caller?.username || 'Unknown'}</p>
        <p className="call-message">wants to start a chat</p>
        
        <div className="call-notification-actions">
          <button 
            className="btn-accept" 
            onClick={onAccept}
            title="Accept call"
          >
            <FiPhone size={20} />
            Accept
          </button>
          <button 
            className="btn-reject" 
            onClick={onReject}
            title="Reject call"
          >
            <FiX size={20} />
            Reject
          </button>
        </div>
      </div>
    </div>
  );
}

export default CallNotificationModal;

