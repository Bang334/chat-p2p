import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiLogOut, FiSend, FiUsers, FiPaperclip, FiPlus, FiBell } from 'react-icons/fi';
import authService from '../services/authService';
import userService from '../services/userService';
import groupService from '../services/groupService';
import friendService from '../services/friendService';
import signalingService from '../services/signaling';
import webrtcService from '../services/webrtc';
import UserList from '../components/UserList';
import ChatWindow from '../components/ChatWindow';
import GroupList from '../components/GroupList';
import GroupChatWindow from '../components/GroupChatWindow';
import CreateGroupModal from '../components/CreateGroupModal';
import ChatPopup from '../components/ChatPopup';
import GroupChatPopup from '../components/GroupChatPopup';
import FriendRequestModal from '../components/FriendRequestModal';
import FriendListModal from '../components/FriendListModal';
import BroadcastModal from '../components/BroadcastModal';
import ConfirmModal from '../components/ConfirmModal';
import Notification from '../components/Notification';
import './Chat.css';

function Chat() {
  const [users, setUsers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [onlinePeers, setOnlinePeers] = useState(new Set());
  const [selectedPeer, setSelectedPeer] = useState(null);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [activeTab, setActiveTab] = useState('users'); // 'users' or 'groups'
  const [conversations, setConversations] = useState(new Map()); // peerId -> messages[]
  const [groupConversations, setGroupConversations] = useState(new Map()); // groupId -> messages[]
  const [connectionStatus, setConnectionStatus] = useState('offline');
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [selectedRecipients, setSelectedRecipients] = useState(null);
  const [showBroadcastModalForPopup, setShowBroadcastModalForPopup] = useState(false);
  const [selectedRecipientsForPopup, setSelectedRecipientsForPopup] = useState(null);
  const [popups, setPopups] = useState([]); // Array of popup chat windows
  const [groupPopups, setGroupPopups] = useState([]); // Array of group popup chat windows
  const [connectionStates, setConnectionStates] = useState(new Map()); // Track individual peer connections
  const [friends, setFriends] = useState([]); // List of friend user IDs
  const [pendingRequests, setPendingRequests] = useState([]); // List of pending requests
  const [showRequestModal, setShowRequestModal] = useState(false); // Control friend request modal
  const [showFriendListModal, setShowFriendListModal] = useState(false); // Control friend list modal
  const [leaveGroupConfirm, setLeaveGroupConfirm] = useState(null); // Control leave group confirmation
  const [notification, setNotification] = useState(null); // { message, type }
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(authService.getUser());
  const fileInputRef = useRef(null);
  const [fileChunks, setFileChunks] = useState(new Map()); // Track incoming file chunks
  
  // Use refs to avoid closure issues in callbacks
  const usersRef = useRef([]);
  const groupsRef = useRef([]);
  const friendsRef = useRef([]);
  const isInitializedRef = useRef(false);

  // Redirect to login if not authenticated
  useEffect(() => {
    // Re-check authentication on every render
    const user = authService.getUser();
    if (!user || !authService.isAuthenticated()) {
      console.log('🚫 Not authenticated, redirecting to login');
      navigate('/login', { replace: true });
      return;
    }
    
    // Update currentUser if changed
    if (user && JSON.stringify(user) !== JSON.stringify(currentUser)) {
      setCurrentUser(user);
    }
    
    // Prevent double initialization (e.g., from React StrictMode)
    if (!isInitializedRef.current) {
      console.log('🚀 Initializing chat...');
      isInitializedRef.current = true;
      initializeChat();
    }
  }, []);

  const initializeChat = async () => {
    // Fetch users and groups
    const allUsers = await userService.getAllUsers();
    const filteredUsers = allUsers.filter(u => u.userId !== currentUser.userId);
    setUsers(filteredUsers);
    usersRef.current = filteredUsers;
    
    const userGroups = await groupService.getUserGroups();
    setGroups(userGroups);
    groupsRef.current = userGroups;
    
    // Fetch friends
    const friendsList = await friendService.getFriends(currentUser.userId);
    setFriends(friendsList);
    friendsRef.current = friendsList;
    
    // Fetch pending requests
    console.log('📊 Current user info:', currentUser);
    const requests = await friendService.getRequests(currentUser.userId);
    console.log('📊 Received requests:', requests);
    setPendingRequests(requests);

    // Connect to signaling server
    signalingService.connect(
      currentUser.peerId,
      async () => {
        setConnectionStatus('online');
        await loadOnlinePeers();
      },
      (error) => {
        console.error('Signaling error:', error);
        setConnectionStatus('error');
      }
    );

    // Setup signaling callbacks
    setupSignalingCallbacks();

    // Setup WebRTC callbacks
    setupWebRTCCallbacks();
    
    // Setup connection state listener
    const originalSetConnectionState = (peerId, connected) => {
      setConnectionStates(prev => {
        const newMap = new Map(prev);
        newMap.set(peerId, connected);
        return newMap;
      });
    };
    
    // Store callback in webrtcService for connection state updates
    webrtcService.connectionStateCallback = originalSetConnectionState;

    // Update user status
    userService.updateStatus(currentUser.userId, 'ONLINE');
  };

  const setupSignalingCallbacks = () => {
    signalingService.onCallRequest((fromPeerId, payload) => {
      console.log('Received CALL_REQUEST from:', fromPeerId);
      // No need to handle call requests anymore - just open chat directly
    });

    signalingService.onCallAccept((fromPeerId, payload) => {
      console.log('Received CALL_ACCEPT from:', fromPeerId);
      // No need to handle call accept anymore - just open chat directly
    });

    signalingService.onOffer((fromPeerId, offer) => {
      webrtcService.handleOffer(fromPeerId, offer, signalingService, currentUser.peerId);
    });

    signalingService.onAnswer((fromPeerId, answer) => {
      webrtcService.handleAnswer(fromPeerId, answer);
    });

    signalingService.onIceCandidate((fromPeerId, candidate) => {
      webrtcService.handleIceCandidate(fromPeerId, candidate);
    });

    signalingService.onPeerOnline(async (peerId) => {
      console.log('👤 Peer came online:', peerId);
      setOnlinePeers(prev => new Set([...prev, peerId]));
      
      // Auto-connect if this peer is a friend or in same group
      try {
        // Find the user by peerId
        const user = usersRef.current.find(u => u.peerId === peerId);
        if (!user) {
          console.log('⚠️ User not found for peerId:', peerId);
          return;
        }
        
        // Check if this user is a friend
        const currentFriends = friendsRef.current;
        const isFriend = currentFriends.includes(user.userId);
        
        if (isFriend) {
          console.log(`🤝 Auto-connecting to new online friend: ${user.username}`);
          await autoEstablishConnection(peerId);
        }
        
        // Check if this user is in any of my groups
        const currentGroups = groupsRef.current;
        const sharedGroups = currentGroups.filter(group => 
          group.memberIds.includes(user.userId) && 
          group.memberIds.includes(currentUser.userId)
        );
        
        if (sharedGroups.length > 0) {
          console.log(`👥 User ${user.username} is in ${sharedGroups.length} shared group(s)`);
          // Reconnect to shared groups to include the new member
          for (const group of sharedGroups) {
            try {
              const groupMemberPeerIds = usersRef.current
                .filter(u => group.memberIds.includes(u.userId) && u.userId !== currentUser.userId)
                .map(u => u.peerId)
                .filter(pid => pid); // Filter out empty peerIds
              
              console.log(`🔄 Reconnecting to group "${group.groupName}" with new member`);
              await webrtcService.connectToGroup(group.groupId, groupMemberPeerIds, signalingService);
            } catch (error) {
              console.log(`⚠️ Could not reconnect to group ${group.groupName}:`, error.message);
            }
          }
        }
      } catch (error) {
        console.error('Error in auto-connect on peer online:', error);
      }
    });

    signalingService.onPeerOffline((peerId) => {
      setOnlinePeers(prev => {
        const newSet = new Set(prev);
        newSet.delete(peerId);
        return newSet;
      });
      webrtcService.closePeerConnection(peerId);
    });

    signalingService.onGroupMemberJoined(async (payload) => {
      console.log('🎉 Group member joined:', payload);
      const { groupId, newMemberPeerId, newMemberUsername, totalMembers } = payload;
      
      // Reload groups to get updated member list
      const userGroups = await groupService.getUserGroups();
      setGroups(userGroups);
      groupsRef.current = userGroups;
      
      // If this is the currently open group, reconnect mesh
      if (selectedGroup?.groupId === groupId) {
        console.log(`🔄 Reconnecting to group ${groupId} with new member`);
        const updatedGroup = userGroups.find(g => g.groupId === groupId);
        if (updatedGroup) {
          setSelectedGroup(updatedGroup);
          await handleReconnectGroup(updatedGroup);
        }
      }
      
      // Show notification
      console.log(`✅ ${newMemberUsername} joined group (now ${totalMembers} members)`);
    });

    signalingService.onGroupMemberLeft(async (payload) => {
      console.log('👋 Group member left:', payload);
      const { groupId, leftMemberId, leftMemberPeerId, leftMemberUsername, totalMembers } = payload;
      
      // Reload groups to get updated member list
      const userGroups = await groupService.getUserGroups();
      setGroups(userGroups);
      groupsRef.current = userGroups;
      
      // If I'm the one who left, close the group chat
      if (leftMemberId === currentUser.userId) {
        console.log('👋 You left the group');
        if (selectedGroup?.groupId === groupId) {
          setSelectedGroup(null);
        }
        // Close group popup if open
        setGroupPopups(prev => prev.filter(p => p.groupId !== groupId));
      } else {
        // Someone else left, reconnect mesh if group is open
        if (selectedGroup?.groupId === groupId) {
          console.log(`🔄 Reconnecting to group ${groupId} after ${leftMemberUsername} left`);
          const updatedGroup = userGroups.find(g => g.groupId === groupId);
          if (updatedGroup) {
            setSelectedGroup(updatedGroup);
            await handleReconnectGroup(updatedGroup);
          }
        }
        
        // Disconnect from the leaving member
        webrtcService.closePeerConnection(leftMemberPeerId);
        
        // Show notification
        console.log(`👋 ${leftMemberUsername} left group (now ${totalMembers} members)`);
      }
    });
  };

  const setupWebRTCCallbacks = () => {
    console.log('⚙️ Setting up WebRTC callbacks');

    webrtcService.onMessage((fromPeerId, data) => {
      // Handle file chunks
      if (data.type === 'file-start') {
        // Initialize file chunk tracking
        const fileKey = `${fromPeerId}-${data.fileName}-${data.timestamp}`;
        console.log(`📥 Receiving file: ${data.fileName} (${data.fileSize} bytes)`);
        setFileChunks(prev => {
          const newMap = new Map(prev);
          newMap.set(fileKey, {
            fileName: data.fileName,
            fileType: data.fileType,
            fileSize: data.fileSize,
            totalChunks: data.totalChunks,
            chunks: [],
            timestamp: data.timestamp,
            groupId: data.groupId
          });
          return newMap;
        });
        return;
      }
      
      if (data.type === 'file-chunk') {
        // Add chunk to file - use setState callback to access latest state
        setFileChunks(prev => {
          const newMap = new Map(prev);
          
          // Find the matching file
          const fileKey = Array.from(newMap.keys()).find(key => {
            if (!key.includes(fromPeerId)) return false;
            const fileInfo = newMap.get(key);
            // Match based on groupId (both null or both equal)
            if (data.groupId) {
              return fileInfo?.groupId === data.groupId;
            } else {
              return !fileInfo?.groupId;
            }
          });
          
          if (fileKey) {
            const file = newMap.get(fileKey);
            if (file) {
              file.chunks.push({ index: data.chunkIndex, data: data.data });
              // Log progress for large files
              if (file.totalChunks > 10 && (data.chunkIndex + 1) % 5 === 0) {
                console.log(`📦 Progress: ${data.chunkIndex + 1}/${file.totalChunks} chunks`);
              }
            }
          } else {
            console.warn('⚠️ Chunk received but no metadata found');
          }
          
          return newMap;
        });
        return;
      }
      
      if (data.type === 'file-end') {
        // Reconstruct file from chunks - use setState callback to access latest state
        setFileChunks(prev => {
          const newMap = new Map(prev);
          
          // Find the matching file
          const fileKey = Array.from(newMap.keys()).find(key => {
            if (!key.includes(fromPeerId)) return false;
            const fileInfo = newMap.get(key);
            // Match based on groupId (both null or both equal)
            if (data.groupId) {
              return fileInfo?.groupId === data.groupId;
            } else {
              return !fileInfo?.groupId;
            }
          });
          
          if (fileKey) {
            const file = newMap.get(fileKey);
            console.log(`📊 File-end received: ${file?.chunks.length}/${file?.totalChunks} chunks collected`);
            
            if (file && file.chunks.length === file.totalChunks) {
              console.log(`✅ Complete! Reconstructing file: ${file.fileName}`);
              
              try {
                // Sort chunks by index
                file.chunks.sort((a, b) => a.index - b.index);
                
                // Reconstruct base64
                const base64Data = 'data:' + file.fileType + ';base64,' + file.chunks.map(c => c.data).join('');
                
                console.log(`✅ File reconstructed, size: ${base64Data.length} chars`);
                
                // Add to conversation
                if (file.groupId) {
                  addGroupMessage(file.groupId, {
                    from: fromPeerId,
                    content: file.fileName,
                    timestamp: file.timestamp,
                    type: 'received',
                    fileData: base64Data,
                    fileName: file.fileName,
                    fileType: file.fileType,
                    fileSize: file.fileSize
                  });
                } else {
                  addMessage(fromPeerId, {
                    from: fromPeerId,
                    content: file.fileName,
                    timestamp: file.timestamp,
                    type: 'received',
                    fileData: base64Data,
                    fileName: file.fileName,
                    fileType: file.fileType,
                    fileSize: file.fileSize
                  });
                }
                
                console.log(`✅ File added to conversation`);
                
                // Remove file from chunks map
                newMap.delete(fileKey);
              } catch (error) {
                console.error('❌ Error reconstructing file:', error);
              }
            } else if (file) {
              console.warn(`⚠️ File incomplete: missing ${file.totalChunks - file.chunks.length} chunks`);
            }
          } else {
            console.warn('⚠️ File-end received but no metadata found');
          }
          
          return newMap;
        });
        return;
      }
      
      // Regular messages
      if (data.type === 'text') {
        // Check if this is a group message
        if (data.groupId) {
          addGroupMessage(data.groupId, {
            from: fromPeerId,
            content: data.content,
            timestamp: data.timestamp,
            type: 'received'
          });
        } else {
          addMessage(fromPeerId, {
            from: fromPeerId,
            content: data.content,
            timestamp: data.timestamp,
            type: 'received'
          });
        }
      }
    });

    webrtcService.onTyping((fromPeerId, isTyping) => {
      // Typing indicator - can be implemented later
    });
  };

  const loadOnlinePeers = async () => {
    try {
      const onlineUsers = await userService.getOnlineUsers();
      const onlinePeerIds = onlineUsers
        .filter(u => u.userId !== currentUser.userId)
        .map(u => u.peerId)
        .filter(peerId => peerId);
      
      setOnlinePeers(new Set(onlinePeerIds));
      
      // Auto-connect to online friends and groups after loading
      console.log('🔄 Auto-connecting to online friends and groups...');
      await autoConnectToOnlineFriendsAndGroups(onlinePeerIds);
    } catch (error) {
      console.error('Error loading online peers:', error);
    }
  };

  // Auto-connect to all online friends and groups with online members
  const autoConnectToOnlineFriendsAndGroups = async (onlinePeerIds) => {
    try {
      console.log('🤝 Starting auto-connection process...');
      
      // Get current friends list from ref
      const currentFriends = friendsRef.current;
      
      if (currentFriends.length === 0) {
        console.log('⚠️ No friends found, skipping friend auto-connection');
      }
      
      // Find online friends
      const onlineFriends = usersRef.current.filter(user => 
        currentFriends.includes(user.userId) && 
        onlinePeerIds.includes(user.peerId)
      );
      
      console.log(`👥 Found ${onlineFriends.length} online friends to connect:`, 
        onlineFriends.map(f => f.username));
      
      // Auto-connect to each online friend
      for (const friend of onlineFriends) {
        try {
          console.log(`🔗 Auto-connecting to friend: ${friend.username}`);
          await autoEstablishConnection(friend.peerId);
        } catch (error) {
          console.log(`⚠️ Could not auto-connect to ${friend.username}:`, error.message);
        }
      }
      
      // Auto-connect to groups with online members
      const currentGroups = groupsRef.current;
      for (const group of currentGroups) {
        try {
          const groupMemberPeerIds = usersRef.current
            .filter(u => group.memberIds.includes(u.userId) && u.userId !== currentUser.userId)
            .map(u => u.peerId)
            .filter(peerId => onlinePeerIds.includes(peerId));
          
          if (groupMemberPeerIds.length > 0) {
            console.log(`🔗 Auto-connecting to group "${group.groupName}" with ${groupMemberPeerIds.length} online members`);
            await webrtcService.connectToGroup(group.groupId, groupMemberPeerIds, signalingService);
          }
        } catch (error) {
          console.log(`⚠️ Could not auto-connect to group ${group.groupName}:`, error.message);
        }
      }
      
      console.log('✅ Auto-connection process completed');
    } catch (error) {
      console.error('Error in auto-connection process:', error);
    }
  };

  // Establish P2P connection without opening chat window
  const autoEstablishConnection = async (peerId) => {
    try {
      const existingChannel = webrtcService.dataChannels.get(peerId);
      if (!existingChannel || existingChannel.readyState !== 'open') {
        await webrtcService.createPeerConnection(peerId, signalingService, true);
        await webrtcService.createOffer(peerId, signalingService);
        console.log(`✅ Auto-connected to peer: ${peerId}`);
      } else {
        console.log(`ℹ️ Already connected to peer: ${peerId}`);
      }
    } catch (error) {
      throw error;
    }
  };

  // Removed handleIncomingCall, handleAcceptCall, handleRejectCall - no longer needed

  // Removed handleAcceptCall and handleRejectCall - no longer needed

  const initiateConnection = async (peer, openAsPopup = false) => {
    // Check if friend (only friends can chat)
    if (!friends.includes(peer.userId)) {
      showNotification('Bạn cần kết bạn trước khi chat!', 'warning');
      return;
    }

    // Check if peer is online
    if (!onlinePeers.has(peer.peerId)) {
      showNotification(`${peer.username} is offline!`, 'warning');
      return;
    }

    // Open chat window immediately - no need for offer/accept
    console.log(`✅ Opening chat with ${peer.username} (online)`);
    if (openAsPopup) {
      openChatPopup(peer);
    } else {
      setSelectedPeer(peer);
    }

    // Pre-establish connection in the background for faster messaging
    try {
      const existingChannel = webrtcService.dataChannels.get(peer.peerId);
      if (!existingChannel || existingChannel.readyState !== 'open') {
        console.log(`🔗 Pre-establishing connection to ${peer.username}...`);
        // Don't await - let it happen in background
        webrtcService.createPeerConnection(peer.peerId, signalingService, true)
          .then(() => webrtcService.createOffer(peer.peerId, signalingService))
          .catch(err => console.log('Background connection setup:', err));
      }
    } catch (error) {
      console.log('Could not pre-establish connection:', error);
    }
  };

  // Helper function to show notification
  const showNotification = (message, type = 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleAddFriend = async (friendId) => {
    const success = await friendService.addFriend(friendId, currentUser.userId);
    if (success) {
      showNotification('Friend request sent!', 'success');
    } else {
      showNotification('Failed to add friend (may already be friends or request exists)', 'warning');
    }
  };

  const handleAcceptRequest = async (requestId) => {
    // Find the request to check its type
    const request = pendingRequests.find(r => r.requestId === requestId);
    
    const success = await friendService.acceptRequest(requestId, currentUser.userId);
    if (success) {
      // Remove from pending requests
      setPendingRequests(prev => prev.filter(r => r.requestId !== requestId));
      
      // Reload friends list or groups list based on request type
      if (request?.requestType === 'FRIEND') {
        const friendsList = await friendService.getFriends(currentUser.userId);
        setFriends(friendsList);
        friendsRef.current = friendsList;
        showNotification('Friend request accepted!', 'success');
      } else if (request?.requestType === 'GROUP') {
        const userGroups = await groupService.getUserGroups();
        setGroups(userGroups);
        groupsRef.current = userGroups;
        showNotification('Group invitation accepted!', 'success');
      } else {
        showNotification('Request accepted!', 'success');
      }
    } else {
      showNotification('Failed to accept request', 'error');
    }
  };

  const handleRejectRequest = async (requestId) => {
    const success = await friendService.rejectRequest(requestId, currentUser.userId);
    if (success) {
      // Remove from pending requests
      setPendingRequests(prev => prev.filter(r => r.requestId !== requestId));
      showNotification('Request rejected', 'info');
    } else {
      showNotification('Failed to reject request', 'error');
    }
  };

  const refreshRequests = async () => {
    try {
      const requests = await friendService.getRequests(currentUser.userId);
      setPendingRequests(requests);
    } catch (error) {
      console.error('Error refreshing requests:', error);
    }
  };
  
  // Auto-refresh pending requests every 5 seconds
  useEffect(() => {
    if (!currentUser) return;
    
    // Initial fetch
    refreshRequests();
    
    // Set up interval for auto-refresh
    const interval = setInterval(() => {
      refreshRequests();
    }, 5000); // Refresh every 5 seconds
    
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.userId]); // Only re-run if userId changes

  const handleRemoveFriend = async (friendId) => {
    try {
      const success = await friendService.removeFriend(friendId, currentUser.userId);
      if (success) {
        // Update friends list
        const updatedFriendsList = await friendService.getFriends(currentUser.userId);
        setFriends(updatedFriendsList);
        friendsRef.current = updatedFriendsList;
        showNotification('Friend removed successfully', 'success');
      } else {
        showNotification('Failed to remove friend', 'error');
      }
    } catch (error) {
      console.error('Error removing friend:', error);
      showNotification('Failed to remove friend: ' + error.message, 'error');
    }
  };

  const openChatPopup = (peer) => {
    // Check if popup already exists
    const existingPopup = popups.find(p => p.peerId === peer.peerId);
    
    if (existingPopup) {
      // Restore if minimized
      setPopups(prev => prev.map(p => 
        p.peerId === peer.peerId ? { ...p, isMinimized: false } : p
      ));
    } else {
      // Add new popup
      setPopups(prev => [...prev, {
        peerId: peer.peerId,
        peer: peer,
        isMinimized: false
      }]);
    }
  };

  const closePopup = (peerId) => {
    setPopups(prev => prev.filter(p => p.peerId !== peerId));
  };

  const minimizePopup = (peerId) => {
    setPopups(prev => prev.map(p => 
      p.peerId === peerId ? { ...p, isMinimized: !p.isMinimized } : p
    ));
  };

  const maximizePopup = (peerId) => {
    // Find the peer and set it as selected in main window
    const popup = popups.find(p => p.peerId === peerId);
    if (popup) {
      setSelectedPeer(popup.peer);
      closePopup(peerId);
    }
  };

  const sendMessage = async (message, peerId = null) => {
    const targetPeerId = peerId || selectedPeer?.peerId;
    if (!targetPeerId) return;

    try {
      await webrtcService.sendMessage(targetPeerId, message, null, signalingService);
      
      // Add to local conversation
      addMessage(targetPeerId, {
        from: currentUser.peerId,
        content: message,
        timestamp: Date.now(),
        type: 'sent'
      });
    } catch (error) {
      console.error('Error sending message:', error);
      showNotification('Failed to send message. Please ensure you are connected to the peer.', 'error');
    }
  };

  const sendFile = async (file, peerId = null) => {
    const targetPeerId = peerId || selectedPeer?.peerId;
    if (!targetPeerId) return;

    try {
      // Add to local conversation immediately (as sent)
      const reader = new FileReader();
      reader.onload = () => {
        addMessage(targetPeerId, {
          from: currentUser.peerId,
          content: file.name,
          timestamp: Date.now(),
          type: 'sent',
          fileData: reader.result,
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size
        });
      };
      reader.readAsDataURL(file);
      
      // Send via WebRTC
      await webrtcService.sendFile(targetPeerId, file, null, signalingService);
    } catch (error) {
      console.error('Error sending file:', error);
      showNotification('Failed to send file. Please ensure you are connected to the peer.', 'error');
    }
  };

  const addMessage = (peerId, message) => {
    setConversations(prev => {
      const newConversations = new Map(prev);
      const messages = newConversations.get(peerId) || [];
      newConversations.set(peerId, [...messages, message]);
      return newConversations;
    });
  };

  const addGroupMessage = (groupId, message) => {
    setGroupConversations(prev => {
      const newConversations = new Map(prev);
      const messages = newConversations.get(groupId) || [];
      newConversations.set(groupId, [...messages, message]);
      return newConversations;
    });
  };

  const handleSelectGroup = async (group, openAsPopup = false) => {
    console.log(`📂 Opening group: ${group.groupName}`);
    
    if (openAsPopup) {
      openGroupChatPopup(group);
    } else {
      setSelectedGroup(group);
      setSelectedPeer(null);
    }

    const memberPeerIds = usersRef.current
      .filter(u => group.memberIds.includes(u.userId) && u.userId !== currentUser.userId)
      .map(u => u.peerId);

    console.log(`👥 Group members to connect: ${memberPeerIds.length}`, memberPeerIds);

    try {
      await webrtcService.connectToGroup(group.groupId, memberPeerIds, signalingService);
    } catch (error) {
      console.error('Failed to connect to group:', error);
    }
  };

  const handleReconnectGroup = async (group) => {
    console.log(`🔄 Reconnecting to group: ${group.groupName}`);
    
    // Refresh users first to get latest peer IDs
    const allUsers = await userService.getAllUsers();
    const filteredUsers = allUsers.filter(u => u.userId !== currentUser.userId);
    setUsers(filteredUsers);
    usersRef.current = filteredUsers;
    
    const memberPeerIds = filteredUsers
      .filter(u => group.memberIds.includes(u.userId) && u.userId !== currentUser.userId)
      .map(u => u.peerId);

    console.log(`👥 Reconnecting to ${memberPeerIds.length} members:`, memberPeerIds);

    try {
      await webrtcService.connectToGroup(group.groupId, memberPeerIds, signalingService);
    } catch (error) {
      console.error('Failed to reconnect to group:', error);
    }
  };

  const openGroupChatPopup = (group) => {
    // Check if popup already exists
    const existingPopup = groupPopups.find(p => p.groupId === group.groupId);
    
    if (existingPopup) {
      // Restore if minimized
      setGroupPopups(prev => prev.map(p => 
        p.groupId === group.groupId ? { ...p, isMinimized: false } : p
      ));
    } else {
      // Add new popup
      setGroupPopups(prev => [...prev, {
        groupId: group.groupId,
        group: group,
        isMinimized: false
      }]);
    }
  };

  const closeGroupPopup = (groupId) => {
    setGroupPopups(prev => prev.filter(p => p.groupId !== groupId));
  };

  const minimizeGroupPopup = (groupId) => {
    setGroupPopups(prev => prev.map(p => 
      p.groupId === groupId ? { ...p, isMinimized: !p.isMinimized } : p
    ));
  };

  const maximizeGroupPopup = (groupId) => {
    // Find the group and set it as selected in main window
    const popup = groupPopups.find(p => p.groupId === groupId);
    if (popup) {
      setSelectedGroup(popup.group);
      setSelectedPeer(null);
      closeGroupPopup(groupId);
    }
  };

  const handleCreateGroup = async (groupName, memberIds) => {
    if (!groupName.trim()) {
      showNotification('Please enter a group name', 'warning');
      return;
    }

    if (!memberIds || memberIds.length === 0) {
      showNotification('Please select at least one member', 'warning');
      return;
    }

    try {
      const newGroup = await groupService.createGroup(groupName, memberIds);
      setGroups(prev => {
        const updated = [...prev, newGroup];
        groupsRef.current = updated;
        return updated;
      });
      await handleSelectGroup(newGroup);
      setActiveTab('groups');
      showNotification(`Group "${groupName}" created successfully!`, 'success');
    } catch (error) {
      console.error('Error creating group:', error);
      showNotification('Failed to create group: ' + error.message, 'error');
    }
  };

  const handleLeaveGroup = async (groupId) => {
    const group = groupsRef.current.find(g => g.groupId === groupId);
    if (!group) return;
    
    setLeaveGroupConfirm({ groupId, groupName: group.groupName });
  };

  const handleConfirmLeaveGroup = async () => {
    if (!leaveGroupConfirm) return;
    
    const { groupId } = leaveGroupConfirm;
    
    try {
      console.log(`👋 Leaving group ${groupId}...`);
      await groupService.removeMember(groupId, currentUser.userId);
      
      // Backend will broadcast GROUP_MEMBER_LEFT signal
      // The signal handler will update UI
      showNotification(`You left "${leaveGroupConfirm.groupName}"`, 'success');
      setLeaveGroupConfirm(null);
    } catch (error) {
      console.error('Error leaving group:', error);
      showNotification('Failed to leave group: ' + error.message, 'error');
      setLeaveGroupConfirm(null);
    }
  };

  const handleInviteMembers = async (memberIds) => {
    if (!selectedGroup) return;
    
    try {
      console.log(`📨 Inviting ${memberIds.length} members to group ${selectedGroup.groupId}...`);
      
      // Send friend requests for group invitation
      for (const memberId of memberIds) {
        try {
          await friendService.addFriend(memberId, currentUser.userId);
        } catch (error) {
          console.error(`Failed to invite ${memberId}:`, error);
        }
      }
      
      showNotification(`Sent invitations to ${memberIds.length} friend(s)!`, 'success');
    } catch (error) {
      console.error('Error inviting members:', error);
      showNotification('Failed to invite members: ' + error.message, 'error');
    }
  };

  const handleSelectRecipients = (recipients) => {
    setSelectedRecipients(recipients);
    console.log('📢 Selected recipients:', recipients);
  };

  const handleSelectRecipientsForPopup = (recipients) => {
    setSelectedRecipientsForPopup(recipients);
    console.log('📢 Selected recipients for popup:', recipients);
  };

  const sendToSelectedRecipientsForPopup = async (message, file = null) => {
    if (!selectedRecipientsForPopup) {
      console.warn('No recipients selected for popup');
      return;
    }

    try {
      console.log('📢 Broadcasting from popup to selected recipients:', selectedRecipientsForPopup);
      
      let successCount = 0;
      let errorCount = 0;
      
      // Add message to each conversation BEFORE sending (so sender sees it immediately)
      if (file) {
        // For files, add to each conversation
        const reader = new FileReader();
        reader.onload = () => {
          selectedRecipientsForPopup.friends.forEach(friendId => {
            const friend = usersRef.current.find(u => u.userId === friendId);
            if (friend && friend.peerId) {
              addMessage(friend.peerId, {
                from: currentUser.peerId,
                content: file.name,
                timestamp: Date.now(),
                type: 'sent',
                fileData: reader.result,
                fileName: file.name,
                fileType: file.type,
                fileSize: file.size
              });
            }
          });
          
          selectedRecipientsForPopup.groups.forEach(groupId => {
            addGroupMessage(groupId, {
              from: currentUser.peerId,
              content: file.name,
              timestamp: Date.now(),
              type: 'sent',
              fileData: reader.result,
              fileName: file.name,
              fileType: file.type,
              fileSize: file.size
            });
          });
        };
        reader.readAsDataURL(file);
      } else {
        // For text messages, add to each conversation
        selectedRecipientsForPopup.friends.forEach(friendId => {
          const friend = usersRef.current.find(u => u.userId === friendId);
          if (friend && friend.peerId) {
            addMessage(friend.peerId, {
              from: currentUser.peerId,
              content: message,
              timestamp: Date.now(),
              type: 'sent'
            });
          }
        });
        
        selectedRecipientsForPopup.groups.forEach(groupId => {
          addGroupMessage(groupId, {
            from: currentUser.peerId,
            content: message,
            timestamp: Date.now(),
            type: 'sent'
          });
        });
      }
      
      // Send to individual friends in PARALLEL (not sequential)
      const friendPromises = selectedRecipientsForPopup.friends.map(async (friendId) => {
        try {
          const friend = usersRef.current.find(u => u.userId === friendId);
          
          if (friend && friend.peerId) {
            if (file) {
              await webrtcService.sendFile(friend.peerId, file, null, signalingService);
            } else {
              await webrtcService.sendMessage(friend.peerId, message, null, signalingService);
            }
            console.log(`✅ Sent to friend: ${friend.username}`);
            return { success: true, id: friendId };
          } else {
            console.warn(`⚠️ Friend not found or no peerId for userId: ${friendId}`);
            return { success: false, id: friendId };
          }
        } catch (error) {
          console.error(`❌ Failed to send to friend ${friendId}:`, error);
          return { success: false, id: friendId };
        }
      });
      
      // Send to groups in PARALLEL (not sequential)
      const groupPromises = selectedRecipientsForPopup.groups.map(async (groupId) => {
        try {
          if (file) {
            await webrtcService.sendGroupFile(groupId, file, signalingService);
          } else {
            await webrtcService.sendGroupMessage(groupId, message, signalingService);
          }
          console.log(`✅ Sent to group: ${groupId}`);
          return { success: true, id: groupId };
        } catch (error) {
          console.error(`❌ Failed to send to group ${groupId}:`, error);
          return { success: false, id: groupId };
        }
      });
      
      // Wait for all sends to complete in parallel
      const allPromises = [...friendPromises, ...groupPromises];
      const results = await Promise.allSettled(allPromises);
      
      // Count successes and errors
      successCount = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
      errorCount = results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.success)).length;
      
      // Show result - only log, no alert
      if (errorCount === 0) {
        console.log(`✅ ${file ? 'File' : 'Message'} sent successfully to ${successCount} recipient${successCount !== 1 ? 's' : ''}!`);
      } else {
        console.warn(`⚠️ Sent to ${successCount} recipients, ${errorCount} failed. Check console for details.`);
      }
      
    } catch (error) {
      console.error('Error broadcasting from popup:', error);
    }
  };

  const getConnectedFriends = () => {
    return friends.filter(friendId => {
      const friend = usersRef.current.find(u => u.userId === friendId);
      if (!friend || !friend.peerId) return false;
      
      // Check if friend is online (no need for P2P connection)
      return onlinePeers.has(friend.peerId);
    });
  };

  const getConnectedGroups = () => {
    return groups.filter(group => {
      // Check if group has online members (including current user)
      return group.memberCount > 1; // At least 2 members (including current user)
    });
  };

  const sendToSelectedRecipients = async (message, file = null) => {
    if (!selectedRecipients) {
      showNotification('Please select recipients first', 'warning');
      return;
    }

    try {
      console.log('📢 Broadcasting to selected recipients:', selectedRecipients);
      
      let successCount = 0;
      let errorCount = 0;
      
      // Add message to each conversation BEFORE sending (so sender sees it immediately)
      if (file) {
        // For files, add to each conversation
        const reader = new FileReader();
        reader.onload = () => {
          selectedRecipients.friends.forEach(friendId => {
            const friend = usersRef.current.find(u => u.userId === friendId);
            if (friend && friend.peerId) {
              addMessage(friend.peerId, {
                from: currentUser.peerId,
                content: file.name,
                timestamp: Date.now(),
                type: 'sent',
                fileData: reader.result,
                fileName: file.name,
                fileType: file.type,
                fileSize: file.size
              });
            }
          });
          
          selectedRecipients.groups.forEach(groupId => {
            addGroupMessage(groupId, {
              from: currentUser.peerId,
              content: file.name,
              timestamp: Date.now(),
              type: 'sent',
              fileData: reader.result,
              fileName: file.name,
              fileType: file.type,
              fileSize: file.size
            });
          });
        };
        reader.readAsDataURL(file);
      } else {
        // For text messages, add to each conversation
        selectedRecipients.friends.forEach(friendId => {
          const friend = usersRef.current.find(u => u.userId === friendId);
          if (friend && friend.peerId) {
            addMessage(friend.peerId, {
              from: currentUser.peerId,
              content: message,
              timestamp: Date.now(),
              type: 'sent'
            });
          }
        });
        
        selectedRecipients.groups.forEach(groupId => {
          addGroupMessage(groupId, {
            from: currentUser.peerId,
            content: message,
            timestamp: Date.now(),
            type: 'sent'
          });
        });
      }
      
      // Send to individual friends in PARALLEL (not sequential)
      const friendPromises = selectedRecipients.friends.map(async (friendId) => {
        try {
          const friend = usersRef.current.find(u => u.userId === friendId);
          
          if (friend && friend.peerId) {
            if (file) {
              await webrtcService.sendFile(friend.peerId, file, null, signalingService);
            } else {
              await webrtcService.sendMessage(friend.peerId, message, null, signalingService);
            }
            console.log(`✅ Sent to friend: ${friend.username}`);
            return { success: true, id: friendId };
          } else {
            console.warn(`⚠️ Friend not found or no peerId for userId: ${friendId}`);
            return { success: false, id: friendId };
          }
        } catch (error) {
          console.error(`❌ Failed to send to friend ${friendId}:`, error);
          return { success: false, id: friendId };
        }
      });
      
      // Send to groups in PARALLEL (not sequential)
      const groupPromises = selectedRecipients.groups.map(async (groupId) => {
        try {
          if (file) {
            await webrtcService.sendGroupFile(groupId, file, signalingService);
          } else {
            await webrtcService.sendGroupMessage(groupId, message, signalingService);
          }
          console.log(`✅ Sent to group: ${groupId}`);
          return { success: true, id: groupId };
        } catch (error) {
          console.error(`❌ Failed to send to group ${groupId}:`, error);
          return { success: false, id: groupId };
        }
      });
      
      // Wait for all sends to complete in parallel
      const allPromises = [...friendPromises, ...groupPromises];
      const results = await Promise.allSettled(allPromises);
      
      // Count successes and errors
      successCount = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
      errorCount = results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.success)).length;
      
      // Show result - only log, no alert
      if (errorCount === 0) {
        console.log(`✅ ${file ? 'File' : 'Message'} sent successfully to ${successCount} recipient${successCount !== 1 ? 's' : ''}!`);
      } else {
        console.warn(`⚠️ Sent to ${successCount} recipients, ${errorCount} failed. Check console for details.`);
      }
      
    } catch (error) {
      console.error('Error broadcasting:', error);
      showNotification(`Failed to broadcast ${file ? 'file' : 'message'}: ` + error.message, 'error');
    }
  };

  const sendGroupMessage = async (message, groupId = null) => {
    const targetGroupId = groupId || selectedGroup?.groupId;
    if (!targetGroupId) return;

    try {
      await webrtcService.sendGroupMessage(targetGroupId, message);
      
      addGroupMessage(targetGroupId, {
        from: currentUser.peerId,
        content: message,
        timestamp: Date.now(),
        type: 'sent'
      });
    } catch (error) {
      console.error('Error sending group message:', error);
      showNotification('Failed to send message. Please ensure you are connected to all group members.', 'error');
    }
  };

  const sendGroupFile = async (file, groupId = null) => {
    const targetGroupId = groupId || selectedGroup?.groupId;
    if (!targetGroupId) return;

    try {
      // Add to local conversation immediately (as sent)
      const reader = new FileReader();
      reader.onload = () => {
        addGroupMessage(targetGroupId, {
          from: currentUser.peerId,
          content: file.name,
          timestamp: Date.now(),
          type: 'sent',
          fileData: reader.result,
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size
        });
      };
      reader.readAsDataURL(file);
      
      // Send via WebRTC
      await webrtcService.sendGroupFile(targetGroupId, file, signalingService);
    } catch (error) {
      console.error('Error sending group file:', error);
      showNotification('Failed to send file. Please ensure you are connected to all group members.', 'error');
    }
  };

  const handleLogout = async () => {
    try {
      await cleanup();
      authService.logout();
      navigate('/login', { replace: true });
      
      setTimeout(() => {
        window.location.href = '/login';
      }, 100);
    } catch (error) {
      console.error('Error during logout:', error);
      authService.logout();
      navigate('/login', { replace: true });
      
      setTimeout(() => {
        window.location.href = '/login';
      }, 100);
    }
  };

  const cleanup = async () => {
    webrtcService.closeAllConnections();
    signalingService.disconnect();
    
    try {
      await userService.updateStatus(currentUser.userId, 'OFFLINE');
    } catch (error) {
      console.error('Error updating user status:', error);
    }
  };

  const getConnectionStatusColor = () => {
    switch (connectionStatus) {
      case 'online': return '#4caf50';
      case 'offline': return '#f44336';
      case 'error': return '#ff9800';
      default: return '#9e9e9e';
    }
  };

  // Don't render if not authenticated
  if (!currentUser) {
    return null;
  }

  return (
    <div className="chat-container">
      {/* Sidebar */}
      <div className="chat-sidebar">
        <div className="sidebar-header">
          <div className="user-info">
            <div className="user-avatar">
              {currentUser.username.charAt(0).toUpperCase()}
            </div>
            <div className="user-details">
              <h3>{currentUser.username}</h3>
              <div className="connection-status">
                <span 
                  className="status-dot" 
                  style={{ backgroundColor: getConnectionStatusColor() }}
                />
                <span className="status-text">
                  {connectionStatus === 'online' ? 'Connected' : 'Offline'}
                </span>
              </div>
            </div>
          </div>
          <div className="header-actions">
            <button 
              className="notification-btn" 
              onClick={async () => {
                await refreshRequests();
                setShowRequestModal(true);
              }}
              title={`${pendingRequests.length} pending requests - Click to refresh`}
            >
              <FiBell size={20} />
              {pendingRequests.length > 0 && (
                <span className="badge-count">{pendingRequests.length}</span>
              )}
            </button>
            <button 
              className="friends-btn" 
              onClick={() => setShowFriendListModal(true)}
              title={`${friends.length} friend(s)`}
            >
              <FiUsers size={20} />
            </button>
            <button className="logout-btn" onClick={handleLogout} title="Logout">
              <FiLogOut />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="sidebar-tabs">
          <button
            className={`tab-btn ${activeTab === 'users' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('users');
              setSelectedGroup(null);
            }}
          >
            Direct Chat
          </button>
          <button
            className={`tab-btn ${activeTab === 'groups' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('groups');
              setSelectedPeer(null);
            }}
          >
            Groups
          </button>
        </div>

        <div className="sidebar-section">
          {activeTab === 'users' ? (
            <>
              <div className="section-header">
                <FiUsers />
                <h4>Available Users</h4>
              </div>
              <UserList
                users={users}
                onlinePeers={onlinePeers}
                selectedPeer={selectedPeer}
                onSelectPeer={initiateConnection}
                currentPeerId={currentUser.peerId}
                friends={friends}
                onAddFriend={handleAddFriend}
              />
            </>
          ) : (
            <>
              <div className="section-header">
                <FiUsers />
                <h4>My Groups</h4>
                <button 
                  className="create-group-btn" 
                  onClick={() => setShowCreateGroup(true)}
                  title="Create new group"
                >
                  <FiPlus />
                </button>
              </div>
              <GroupList
                groups={groups}
                selectedGroup={selectedGroup}
                onSelectGroup={handleSelectGroup}
                currentUserId={currentUser.userId}
              />
            </>
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="chat-main">
        {selectedPeer ? (
          <ChatWindow
            peer={selectedPeer}
            messages={conversations.get(selectedPeer.peerId) || []}
            currentPeerId={currentUser.peerId}
            isConnected={(() => {
              const peerId = selectedPeer.peerId;
              // Just check if peer is online - no need for P2P connection
              return onlinePeers.has(peerId);
            })()}
            waitingForAcceptance={false}
            onSendMessage={sendMessage}
            onSendFile={sendFile}
            onBroadcast={() => setShowBroadcastModal(true)}
            onSendToRecipients={sendToSelectedRecipients}
            selectedRecipients={selectedRecipients}
            hasConnectedRecipients={getConnectedFriends().length > 0 || getConnectedGroups().length > 0}
          />
        ) : selectedGroup ? (
          <GroupChatWindow
            group={selectedGroup}
            messages={groupConversations.get(selectedGroup.groupId) || []}
            currentPeerId={currentUser.peerId}
            currentUserId={currentUser.userId}
            allUsers={users}
            friends={friends}
            connectionStatus={connectionStatus}
            connectedPeersCount={webrtcService.getGroupPeers(selectedGroup.groupId).size}
            onSendMessage={sendGroupMessage}
            onSendFile={sendGroupFile}
            onLeaveGroup={handleLeaveGroup}
            onInviteMembers={handleInviteMembers}
            onBroadcast={() => setShowBroadcastModal(true)}
            onSendToRecipients={sendToSelectedRecipients}
            selectedRecipients={selectedRecipients}
            hasConnectedRecipients={getConnectedFriends().length > 0 || getConnectedGroups().length > 0}
          />
        ) : (
          <div className="no-chat-selected">
            <div className="empty-state">
              <FiUsers size={64} color="#ccc" />
              <h2>Welcome to P2P Chat!</h2>
              <p>Select a user or group from the sidebar to start chatting</p>
              <div className="features">
                <p>🔒 End-to-end encrypted</p>
                <p>⚡ Real-time P2P messaging</p>
                <p>📎 File sharing support</p>
                <p>👥 P2P Mesh group chat</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Create Group Modal */}
      <CreateGroupModal
        isOpen={showCreateGroup}
        onClose={() => setShowCreateGroup(false)}
        users={users}
        currentUserId={currentUser.userId}
        friends={friends}
        onCreateGroup={handleCreateGroup}
      />

      {/* Friend Request Modal */}
      <FriendRequestModal
        isOpen={showRequestModal}
        onClose={() => setShowRequestModal(false)}
        requests={pendingRequests}
        users={users}
        groups={groups}
        onAccept={(requestId) => {
          handleAcceptRequest(requestId);
          if (pendingRequests.length === 1) {
            setShowRequestModal(false);
          }
        }}
        onReject={(requestId) => {
          handleRejectRequest(requestId);
          if (pendingRequests.length === 1) {
            setShowRequestModal(false);
          }
        }}
      />

      {/* Friend List Modal */}
      <FriendListModal
        isOpen={showFriendListModal}
        onClose={() => setShowFriendListModal(false)}
        users={users}
        friends={friends}
        currentUserId={currentUser.userId}
        onRemoveFriend={handleRemoveFriend}
      />

      {/* Broadcast Modal for main chat */}
      <BroadcastModal
        isOpen={showBroadcastModal}
        onClose={() => setShowBroadcastModal(false)}
        friends={getConnectedFriends()}
        groups={getConnectedGroups()}
        users={users}
        currentUserId={currentUser.userId}
        onSelectRecipients={handleSelectRecipients}
      />

      {/* Broadcast Modal for popups */}
      <BroadcastModal
        isOpen={showBroadcastModalForPopup}
        onClose={() => setShowBroadcastModalForPopup(false)}
        friends={getConnectedFriends()}
        groups={getConnectedGroups()}
        users={users}
        currentUserId={currentUser.userId}
        onSelectRecipients={handleSelectRecipientsForPopup}
      />

      {/* Call Notification Modal - Removed, no longer needed */}

      {/* Chat Popups */}
      <div className="popups-container">
        {popups.map((popup, index) => (
          <div
            key={popup.peerId}
            className="popup-wrapper"
            style={{
              zIndex: 1000 + index,
              pointerEvents: 'none'
            }}
          >
            <ChatPopup
              peer={popup.peer}
              messages={conversations.get(popup.peerId) || []}
              currentPeerId={currentUser.peerId}
              isConnected={(() => {
                const peerId = popup.peerId;
                // Just check if peer is online - no need for P2P connection
                return onlinePeers.has(peerId);
              })()}
              waitingForAcceptance={false}
              onClose={() => closePopup(popup.peerId)}
              onMinimize={() => minimizePopup(popup.peerId)}
              onMaximize={() => maximizePopup(popup.peerId)}
              onSendMessage={(msg) => sendMessage(msg, popup.peerId)}
              onSendFile={(file) => sendFile(file, popup.peerId)}
              onBroadcast={() => setShowBroadcastModalForPopup(true)}
              onSendToRecipients={sendToSelectedRecipientsForPopup}
              selectedRecipients={selectedRecipientsForPopup}
              hasConnectedRecipients={getConnectedFriends().length > 0 || getConnectedGroups().length > 0}
              isMinimized={popup.isMinimized}
            />
          </div>
        ))}

        {/* Group Chat Popups */}
        {groupPopups.map((popup, index) => (
          <div
            key={popup.groupId}
            className="popup-wrapper"
            style={{
              zIndex: 1000 + popups.length + index,
              pointerEvents: 'none'
            }}
          >
            <GroupChatPopup
              group={popup.group}
              messages={groupConversations.get(popup.groupId) || []}
              currentPeerId={currentUser.peerId}
              allUsers={users}
              connectedPeersCount={webrtcService.getGroupPeers(popup.groupId).size}
              onClose={() => closeGroupPopup(popup.groupId)}
              onMinimize={() => minimizeGroupPopup(popup.groupId)}
              onMaximize={() => maximizeGroupPopup(popup.groupId)}
              onSendMessage={(msg) => sendGroupMessage(msg, popup.groupId)}
              onSendFile={(file) => sendGroupFile(file, popup.groupId)}
              isMinimized={popup.isMinimized}
            />
          </div>
        ))}
      </div>

      {/* Leave Group Confirmation Modal */}
      <ConfirmModal
        isOpen={leaveGroupConfirm !== null}
        title="Leave Group"
        message={`Are you sure you want to leave "${leaveGroupConfirm?.groupName}"?`}
        confirmText="Leave Group"
        cancelText="Cancel"
        type="warning"
        onConfirm={handleConfirmLeaveGroup}
        onCancel={() => setLeaveGroupConfirm(null)}
      />

      {/* Notification */}
      <Notification 
        message={notification?.message} 
        type={notification?.type} 
        onClose={() => setNotification(null)} 
      />
    </div>
  );
}

export default Chat;

