import React, { useState, useMemo } from 'react';
import { FiUserPlus, FiUserCheck, FiSearch, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import './UserList.css';

function UserList({ users, onlinePeers, selectedPeer, onSelectPeer, currentPeerId, friends, onAddFriend }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const isOnline = (peerId) => onlinePeers.has(peerId);
  const isFriend = (userId) => friends && friends.includes(userId);

  const handleUserClick = (user, event) => {
    // If shift or ctrl key is held, open as popup
    const openAsPopup = event.shiftKey || event.ctrlKey;
    onSelectPeer(user, openAsPopup);
  };

  const handleFriendClick = (e, user) => {
    e.stopPropagation(); // Prevent opening chat
    if (onAddFriend) {
      onAddFriend(user.userId);
    }
  };

  // Filter and sort users
  const filteredAndSortedUsers = useMemo(() => {
    // Filter by search term
    const filtered = users.filter(user => 
      user.username.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Sort users: online + friend first, then friend, then online, then others
    const sorted = filtered.sort((a, b) => {
      const aOnline = isOnline(a.peerId);
      const bOnline = isOnline(b.peerId);
      const aFriend = isFriend(a.userId);
      const bFriend = isFriend(b.userId);

      // Both online and friend = highest priority (weight: 4)
      const aWeight = (aOnline ? 2 : 0) + (aFriend ? 2 : 0);
      const bWeight = (bOnline ? 2 : 0) + (bFriend ? 2 : 0);

      // Sort by weight (descending)
      if (aWeight !== bWeight) {
        return bWeight - aWeight;
      }

      // If same weight, sort alphabetically
      return a.username.localeCompare(b.username);
    });

    return sorted;
  }, [users, searchTerm, onlinePeers, friends]);

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedUsers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedUsers = filteredAndSortedUsers.slice(startIndex, endIndex);

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  // Reset to page 1 when search term changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  return (
    <div className="user-list-container">
      {/* Search Bar */}
      <div className="user-search-bar">
        <div className="search-input-wrapper">
          <FiSearch className="search-icon" />
          <input
            type="text"
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          {searchTerm && (
            <button 
              className="search-clear-btn"
              onClick={() => setSearchTerm('')}
            >
              ✕
            </button>
          )}
        </div>
        {searchTerm && (
          <div className="search-results-count">
            {filteredAndSortedUsers.length} result(s)
          </div>
        )}
      </div>

      {/* User List */}
      <div className="user-list">
        {paginatedUsers.length > 0 ? (
          paginatedUsers.map(user => (
        <div
          key={user.userId}
          className={`user-item ${selectedPeer?.userId === user.userId ? 'selected' : ''}`}
          onClick={(e) => handleUserClick(user, e)}
          onDoubleClick={(e) => {
            e.preventDefault();
            onSelectPeer(user, true); // Double click always opens popup
          }}
          title="Click to open in main window, Double-click or Shift/Ctrl+Click to open popup"
        >
          <div className="user-item-avatar">
            {user.username.charAt(0).toUpperCase()}
            <span
              className={`user-status-indicator ${isOnline(user.peerId) ? 'online' : 'offline'}`}
            />
          </div>
          <div className="user-item-info">
            <div className="user-item-name">{user.username}</div>
            <div className="user-item-status">
              {isOnline(user.peerId) ? '🟢 Online' : '⚪ Offline'}
            </div>
          </div>
          <div className="user-item-actions">
            {isFriend(user.userId) ? (
              <FiUserCheck className="friend-icon friend-active" title="Friends" />
            ) : (
              <FiUserPlus 
                className="friend-icon friend-add" 
                title="Add Friend"
                onClick={(e) => handleFriendClick(e, user)}
              />
            )}
          </div>
        </div>
      ))
        ) : (
          <div className="no-users">
            <p>{searchTerm ? 'No users found' : 'No other users available'}</p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="pagination">
          <button
            className="pagination-btn"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            <FiChevronLeft />
          </button>
          <span className="pagination-info">
            Page {currentPage} of {totalPages}
          </span>
          <button
            className="pagination-btn"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            <FiChevronRight />
          </button>
        </div>
      )}
    </div>
  );
}

export default UserList;

