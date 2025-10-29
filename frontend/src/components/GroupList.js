import React from 'react';
import { FiUsers } from 'react-icons/fi';
import './GroupList.css';

function GroupList({ groups, selectedGroup, onSelectGroup, currentUserId }) {
  const handleGroupClick = (group, event) => {
    // If shift or ctrl key is held, open as popup
    const openAsPopup = event.shiftKey || event.ctrlKey;
    onSelectGroup(group, openAsPopup);
  };

  return (
    <div className="group-list">
      {groups.map(group => (
        <div
          key={group.groupId}
          className={`group-item ${selectedGroup?.groupId === group.groupId ? 'selected' : ''}`}
          onClick={(e) => handleGroupClick(group, e)}
          onDoubleClick={(e) => {
            e.preventDefault();
            onSelectGroup(group, true); // Double click always opens popup
          }}
          title="Click to open in main window, Double-click or Shift/Ctrl+Click to open popup"
        >
          <div className="group-item-avatar">
            <FiUsers />
          </div>
          <div className="group-item-info">
            <div className="group-item-name">{group.groupName}</div>
            <div className="group-item-members">
              {group.memberCount} members
            </div>
          </div>
        </div>
      ))}
      {groups.length === 0 && (
        <div className="no-groups">
          <p>No groups yet</p>
          <p className="no-groups-hint">Create a group to get started!</p>
        </div>
      )}
    </div>
  );
}

export default GroupList;

