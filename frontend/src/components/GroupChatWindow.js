import React, { useState, useEffect, useRef } from 'react';
import { FiSend, FiPaperclip, FiDownload, FiUsers, FiSmile, FiLogOut, FiUserPlus } from 'react-icons/fi';
import { convertEmoticons } from '../utils/emoticonConverter';
import './GroupChatWindow.css';
import InviteToGroupModal from './InviteToGroupModal';

function GroupChatWindow({ 
  group, 
  messages, 
  currentPeerId,
  currentUserId, 
  allUsers,
  friends,
  connectionStatus,
  connectedPeersCount,
  onSendMessage, 
  onSendFile,
  onLeaveGroup,
  onInviteMembers,
  onBroadcast = null,
  onSendToRecipients = null,
  selectedRecipients = null,
  hasConnectedRecipients = false
}) {
  const [newMessage, setNewMessage] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Close emoji picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showEmojiPicker && !event.target.closest('.emoji-picker-container')) {
        setShowEmojiPicker(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showEmojiPicker]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleInputChange = (e) => {
    const inputValue = e.target.value;
    const currentValue = newMessage;
    
    // Check if user just typed a space or is at the end
    if (inputValue.length > currentValue.length) {
      const lastChar = inputValue[inputValue.length - 1];
      
      // If space was typed or Enter, try to convert emoticons
      if (lastChar === ' ' || lastChar === '\n') {
        const convertedText = convertEmoticons(inputValue);
        setNewMessage(convertedText);
        return;
      }
    }
    
    setNewMessage(inputValue);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    // Convert any remaining emoticons before sending
    const finalMessage = convertEmoticons(newMessage);

    // Check if we have selected recipients for broadcast
    if (selectedRecipients && onSendToRecipients) {
      onSendToRecipients(finalMessage);
    } else {
      onSendMessage(finalMessage);
    }
    setNewMessage('');
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        alert('File too large! Maximum size is 10MB for P2P transfer.');
        return;
      }
      // Check if we have selected recipients for broadcast
      if (selectedRecipients && onSendToRecipients) {
        onSendToRecipients(null, file);
      } else {
        onSendFile(file);
      }
    }
    e.target.value = '';
  };

  const handleDownload = (fileData, fileName) => {
    const link = document.createElement('a');
    link.href = fileData;
    link.download = fileName;
    link.click();
  };

  const isImageFile = (fileName) => {
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg'];
    const extension = fileName.toLowerCase().substring(fileName.lastIndexOf('.'));
    return imageExtensions.includes(extension);
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const getUsernameByPeerId = (peerId) => {
    const user = allUsers.find(u => u.peerId === peerId);
    return user?.username || 'Unknown';
  };

  const handleEmojiClick = (emoji) => {
    setNewMessage(prev => prev + emoji);
    setShowEmojiPicker(false);
  };

  const renderMessageContent = (content) => {
    // Convert emoticons to emoji
    return convertEmoticons(content);
  };

  // Common emojis
  const commonEmojis = ['😀', '😂', '😍', '🥰', '😘', '😊', '😎', '🤔', '😢', '😭', '😡', '🤯', '👍', '👎', '❤️', '💕', '🔥', '💯', '🎉', '👏'];

  const isConnected = connectedPeersCount === (group.memberCount - 1);

  const handleLeaveClick = () => {
    if (onLeaveGroup) {
      onLeaveGroup(group.groupId);
    }
  };

  return (
    <div className="group-chat-window">
      {/* Header */}
      <div className="group-chat-header">
        <div className="group-chat-info">
          <div className="group-chat-avatar">
            <FiUsers />
          </div>
          <div>
            <h3>{group.groupName}</h3>
            <p className={`group-connection-status ${isConnected ? 'connected' : 'connecting'}`}>
              {isConnected 
                ? `🟢 ${connectedPeersCount}/${group.memberCount - 1} peers connected (P2P Mesh)` 
                : `🔴 Connecting... ${connectedPeersCount}/${group.memberCount - 1} peers`
              }
            </p>
          </div>
        </div>
        <div className="group-actions">
          <button 
            className="invite-btn" 
            onClick={() => setShowInviteModal(true)}
            title="Invite Friends"
          >
            <FiUserPlus />
            <span>Invite</span>
          </button>
          <button 
            className="leave-group-btn" 
            onClick={handleLeaveClick}
            title="Leave Group"
          >
            <FiLogOut />
            <span>Leave</span>
          </button>
        </div>
      </div>

      {/* Invite Modal */}
      <InviteToGroupModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        group={group}
        users={allUsers}
        friends={friends}
        currentUserId={currentUserId}
        onInvite={onInviteMembers}
      />

      {/* Messages */}
      <div className="group-chat-messages">
        {messages.length === 0 ? (
          <div className="no-messages">
            <p>No messages yet. Start the conversation! 💬</p>
            {!isConnected && (
              <p className="connecting-message">
                Establishing P2P mesh connections...
              </p>
            )}
          </div>
        ) : (
          messages.map((msg, index) => {
            const isOwn = msg.from === currentPeerId;
            const senderName = getUsernameByPeerId(msg.from);
            
            return (
              <div
                key={index}
                className={`group-message ${isOwn ? 'sent' : 'received'}`}
              >
                {!isOwn && (
                  <div className="group-message-sender">{senderName}</div>
                )}
                <div className="group-message-bubble">
                  {msg.fileData ? (
                    <div className="file-message">
                      {isImageFile(msg.fileName) ? (
                        <div className="image-message">
                          <img 
                            src={msg.fileData} 
                            alt={msg.fileName}
                            className="image-preview"
                            onClick={() => window.open(msg.fileData, '_blank')}
                          />
                          <div className="file-info">
                            <div className="file-name">{msg.fileName}</div>
                            <button
                              className="download-btn"
                              onClick={() => handleDownload(msg.fileData, msg.fileName)}
                            >
                              <FiDownload /> Download
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="file-content">
                          <div className="file-icon">📎</div>
                          <div className="file-info">
                            <div className="file-name">{msg.fileName}</div>
                            <button
                              className="download-btn"
                              onClick={() => handleDownload(msg.fileData, msg.fileName)}
                            >
                              <FiDownload /> Download
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="group-message-content">{renderMessageContent(msg.content)}</div>
                  )}
                  <div className="group-message-time">{formatTime(msg.timestamp)}</div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form className="group-chat-input" onSubmit={handleSubmit}>
        <input
          type="file"
          ref={fileInputRef}
          style={{ display: 'none' }}
          onChange={handleFileSelect}
        />
        <button
          type="button"
          className="attach-btn"
          onClick={() => fileInputRef.current?.click()}
          disabled={!isConnected}
          title="Send file"
        >
          <FiPaperclip />
        </button>
        <input
          type="text"
          className="message-input"
          placeholder={isConnected ? "Type a message..." : "Waiting for connections..."}
          value={newMessage}
          onChange={handleInputChange}
          disabled={!isConnected}
        />
        
        {/* Emoji Picker */}
        <div className="emoji-picker-container">
          <button
            type="button"
            className="emoji-btn"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            disabled={!isConnected}
            title="Add emoji"
          >
            <FiSmile />
          </button>
          
          {showEmojiPicker && (
            <div className="emoji-picker">
              {commonEmojis.map((emoji, index) => (
                <button
                  key={index}
                  type="button"
                  className="emoji-item"
                  onClick={() => handleEmojiClick(emoji)}
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>
        
        {/* Broadcast Button */}
        {onBroadcast && hasConnectedRecipients && (
          <button
            type="button"
            className="broadcast-btn"
            onClick={() => onBroadcast()}
            disabled={!isConnected}
            title="Broadcast message"
          >
            <FiUsers />
          </button>
        )}
        
        {/* Recipients Indicator */}
        {selectedRecipients && (
          <div className="recipients-indicator">
            <span className="recipients-count">
              {selectedRecipients.friends.length + selectedRecipients.groups.length} recipients
            </span>
          </div>
        )}
        
        <button
          type="submit"
          className="send-btn"
          disabled={!newMessage.trim() || !isConnected}
        >
          <FiSend />
        </button>
      </form>
    </div>
  );
}

export default GroupChatWindow;

