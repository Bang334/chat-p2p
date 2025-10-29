import { ICE_SERVERS } from '../config/api';

class WebRTCService {
  constructor() {
    this.peerConnections = new Map(); // Map of peerId -> RTCPeerConnection
    this.dataChannels = new Map();    // Map of peerId -> RTCDataChannel
    this.groupConnections = new Map(); // Map of groupId -> Set of peerIds
    this.onMessageCallback = null;
    this.onTypingCallback = null;
    this.onFileCallback = null;
    this.onGroupMessageCallback = null;
    this.connectionStateCallback = null; // Callback for connection state changes
  }

  /**
   * Create peer connection for a remote peer
   */
  createPeerConnection(peerId, signalingService, isInitiator = false) {
    const pc = new RTCPeerConnection(ICE_SERVERS);
    this.peerConnections.set(peerId, pc);

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        signalingService.sendIceCandidate(peerId, event.candidate);
      }
    };

    // Handle connection state changes
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'connected') {
        console.log(`✅ Connected to ${peerId}`);
        if (this.connectionStateCallback) {
          this.connectionStateCallback(peerId, true);
        }
      } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        console.log(`❌ Disconnected from ${peerId}`);
        if (this.connectionStateCallback) {
          this.connectionStateCallback(peerId, false);
        }
        this.closePeerConnection(peerId);
      }
    };

    // Handle data channel from remote peer
    pc.ondatachannel = (event) => {
      this.setupDataChannel(peerId, event.channel);
    };

    // If initiator, create data channel
    if (isInitiator) {
      const dataChannel = pc.createDataChannel('chat', {
        ordered: true
      });
      this.setupDataChannel(peerId, dataChannel);
    }

    return pc;
  }

  /**
   * Setup data channel event handlers
   */
  setupDataChannel(peerId, dataChannel) {
    // Check if already have a data channel for this peer
    const existingChannel = this.dataChannels.get(peerId);
    if (existingChannel && existingChannel.readyState === 'open') {
      console.log(`⚠️ Data channel already exists for ${peerId}, skipping setup`);
      return;
    }
    
    this.dataChannels.set(peerId, dataChannel);
    console.log(`📡 Setting up data channel for ${peerId}`);

    dataChannel.onopen = () => {
      console.log(`✅ Data channel opened for ${peerId}`);
    };

    dataChannel.onclose = () => {
      console.log(`❌ Data channel closed for ${peerId}`);
      this.dataChannels.delete(peerId);
    };

    dataChannel.onerror = (error) => {
      console.error(`Data channel error:`, error);
    };

    dataChannel.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        switch (data.type) {
          case 'text':
            if (this.onMessageCallback) {
              this.onMessageCallback(peerId, data);
            }
            break;
          case 'typing':
            if (this.onTypingCallback) {
              this.onTypingCallback(peerId, data.isTyping);
            }
            break;
          case 'file':
            if (this.onFileCallback) {
              this.onFileCallback(peerId, data);
            }
            break;
          case 'file-start':
          case 'file-chunk':
          case 'file-end':
            // File chunking handled by onMessage callback in Chat.js
            if (this.onMessageCallback) {
              this.onMessageCallback(peerId, data);
            }
            break;
          default:
            console.warn('Unknown message type:', data.type);
        }
      } catch (error) {
        console.error('Error parsing P2P message:', error);
      }
    };
  }

  /**
   * Create and send offer to remote peer
   */
  async createOffer(peerId, signalingService) {
    const pc = this.peerConnections.get(peerId);
    if (!pc) {
      throw new Error('Peer connection not found');
    }

    console.log(`📤 Creating offer for ${peerId}, current state: ${pc.signalingState}`);
    
    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      console.log(`✅ Offer created and set as local for ${peerId}, new state: ${pc.signalingState}`);
      signalingService.sendOffer(peerId, offer);
    } catch (error) {
      console.error('Error creating offer:', error);
      throw error;
    }
  }

  /**
   * Handle received offer from remote peer
   */
  async handleOffer(peerId, offer, signalingService, currentPeerId = null) {
    let pc = this.peerConnections.get(peerId);
    
    console.log(`📥 Received offer from ${peerId}, current connection state:`, pc ? pc.signalingState : 'no connection');
    
    // If connection already stable/connected, decide whether to reconnect
    if (pc && pc.signalingState === 'stable') {
      const iceState = pc.iceConnectionState;
      console.log(`⚠️ Already have stable connection with ${peerId}, ICE state: ${iceState}`);
      
      // If connection is healthy, ignore the offer
      if (iceState === 'connected' || iceState === 'completed') {
        console.log(`✅ Connection is healthy, ignoring offer from ${peerId}`);
        return;
      }
      
      // If connection is failed/disconnected, restart
      console.log(`🔄 Connection unhealthy, restarting with ${peerId}`);
      this.closePeerConnection(peerId);
      pc = null;
    }
    
    // Handle glare: both sides sent offer at the same time
    if (pc && pc.signalingState === 'have-local-offer') {
      const myPeerId = currentPeerId || signalingService.peerId;
      console.log(`⚠️ Glare detected! My peerId: ${myPeerId}, remote: ${peerId}`);
      if (myPeerId && myPeerId < peerId) {
        console.log(`Ignoring incoming offer (I win)`);
        return; // Ignore the incoming offer
      } else {
        console.log(`Closing my connection and accepting incoming offer (they win)`);
        this.closePeerConnection(peerId);
        pc = null;
      }
    }
    
    if (!pc) {
      console.log(`Creating new peer connection for ${peerId} as answerer`);
      pc = this.createPeerConnection(peerId, signalingService, false);
    }

    try {
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      console.log(`✅ Set remote offer from ${peerId}`);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      console.log(`✅ Created and set local answer for ${peerId}, sending back...`);
      signalingService.sendAnswer(peerId, answer);
    } catch (error) {
      console.error(`❌ Error handling offer from ${peerId}:`, error);
      console.error(`Connection state was: signaling=${pc?.signalingState}, ice=${pc?.iceConnectionState}`);
      return;
    }
  }

  /**
   * Handle received answer from remote peer
   * Prevents duplicate answer handling
   */
  async handleAnswer(peerId, answer) {
    const pc = this.peerConnections.get(peerId);
    if (!pc) {
      console.warn(`handleAnswer: No peer connection found for ${peerId}`);
      return;
    }

    console.log(`📨 handleAnswer from ${peerId}: signaling state = ${pc.signalingState}, ice state = ${pc.iceConnectionState}`);
    
    // Always check if already stable or closed - these are final states
    if (pc.signalingState === 'stable' || pc.signalingState === 'closed') {
      console.log(`ℹ️ Connection already ${pc.signalingState}, ignoring duplicate answer from ${peerId}`);
      return;
    }
    
    // Only handle answer if we have a local offer
    if (pc.signalingState !== 'have-local-offer') {
      console.warn(`⚠️ handleAnswer: Wrong state ${pc.signalingState} for ${peerId}, expected 'have-local-offer'. Ignoring.`);
      return;
    }

    try {
      // Set remote description
      await pc.setRemoteDescription(new RTCSessionDescription(answer));
      console.log(`✅ Successfully processed answer from ${peerId}`);
    } catch (error) {
      // Check if it's because we're in wrong state now
      if (error.name === 'InvalidStateError') {
        console.log(`ℹ️ Ignored answer from ${peerId} - connection state changed during processing`);
      } else {
        console.warn(`⚠️ Unexpected error handling answer from ${peerId}:`, error.message);
      }
      // Don't throw - this is safe to ignore as connection may be already established
    }
  }

  /**
   * Handle received ICE candidate
   */
  async handleIceCandidate(peerId, candidate) {
    const pc = this.peerConnections.get(peerId);
    if (!pc) {
      return;
    }

    try {
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (error) {
      console.error('Error adding ICE candidate:', error);
    }
  }

  /**
   * Send text message via P2P data channel
   * Auto-creates connection if not exists
   */
  async sendMessage(peerId, message, groupId = null, signalingService = null) {
    // Check if data channel exists and is open
    let dataChannel = this.dataChannels.get(peerId);
    
    if (!dataChannel || dataChannel.readyState !== 'open') {
      console.log(`📡 Data channel not open for ${peerId}, creating connection...`);
      
      // Check if connection already exists but data channel not ready
      const existingConnection = this.peerConnections.get(peerId);
      if (existingConnection && existingConnection.iceConnectionState === 'connected') {
        console.log(`⚠️ Connection exists but data channel not ready, waiting...`);
        // Wait for data channel to open
        await new Promise(resolve => setTimeout(resolve, 2000));
        dataChannel = this.dataChannels.get(peerId);
        if (dataChannel && dataChannel.readyState === 'open') {
          console.log(`✅ Data channel opened!`);
        } else {
          throw new Error('Data channel failed to open');
        }
      } else if (!signalingService) {
        throw new Error('Signaling service required to create connection');
      } else {
        // Auto-create peer connection
        await this.createPeerConnection(peerId, signalingService, true);
        await this.createOffer(peerId, signalingService);
        
        // Poll for data channel to open (max 5 seconds, check every 100ms)
        let attempts = 0;
        const maxAttempts = 50; // 50 * 100ms = 5 seconds
        while (attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 100));
          dataChannel = this.dataChannels.get(peerId);
          if (dataChannel && dataChannel.readyState === 'open') {
            console.log(`✅ Data channel opened after ${attempts} attempts`);
            break;
          }
          attempts++;
        }
        
        if (!dataChannel || dataChannel.readyState !== 'open') {
          throw new Error('Failed to establish data channel');
        }
      }
    }

    const data = {
      type: 'text',
      content: message,
      timestamp: Date.now(),
      groupId: groupId  // Add groupId to distinguish group messages
    };

    try {
      dataChannel.send(JSON.stringify(data));
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }

  /**
   * Send typing indicator
   */
  sendTyping(peerId, isTyping) {
    const dataChannel = this.dataChannels.get(peerId);
    
    if (!dataChannel || dataChannel.readyState !== 'open') {
      return;
    }

    const data = {
      type: 'typing',
      isTyping,
      timestamp: Date.now()
    };

    try {
      dataChannel.send(JSON.stringify(data));
    } catch (error) {
      console.error('Error sending typing indicator:', error);
    }
  }

  /**
   * Send file via P2P data channel
   * Auto-creates connection if not exists
   */
  async sendFile(peerId, file, groupId = null, signalingService = null) {
    // Check if data channel exists and is open
    let dataChannel = this.dataChannels.get(peerId);
    
    if (!dataChannel || dataChannel.readyState !== 'open') {
      console.log(`📡 Data channel not open for ${peerId}, creating connection...`);
      
      // Check if connection already exists but data channel not ready
      const existingConnection = this.peerConnections.get(peerId);
      if (existingConnection && existingConnection.iceConnectionState === 'connected') {
        console.log(`⚠️ Connection exists but data channel not ready, waiting...`);
        // Wait for data channel to open
        await new Promise(resolve => setTimeout(resolve, 2000));
        dataChannel = this.dataChannels.get(peerId);
        if (dataChannel && dataChannel.readyState === 'open') {
          console.log(`✅ Data channel opened!`);
        } else {
          throw new Error('Data channel failed to open');
        }
      } else if (!signalingService) {
        throw new Error('Signaling service required to create connection');
      } else {
        // Auto-create peer connection
        await this.createPeerConnection(peerId, signalingService, true);
        await this.createOffer(peerId, signalingService);
        
        // Poll for data channel to open (max 5 seconds, check every 100ms)
        let attempts = 0;
        const maxAttempts = 50; // 50 * 100ms = 5 seconds
        while (attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 100));
          dataChannel = this.dataChannels.get(peerId);
          if (dataChannel && dataChannel.readyState === 'open') {
            console.log(`✅ Data channel opened after ${attempts} attempts`);
            break;
          }
          attempts++;
        }
        
        if (!dataChannel || dataChannel.readyState !== 'open') {
          throw new Error('Failed to establish data channel');
        }
      }
    }

    // Convert file to base64 and send in chunks
    const reader = new FileReader();
    
    return new Promise((resolve, reject) => {
      reader.onload = async () => {
        const base64Data = reader.result;
        const chunkSize = 256000; // 256KB chunks (maximum safe size for WebRTC)
        
        try {
          // Extract actual data (without header)
          const dataStart = base64Data.indexOf(',') + 1;
          const actualData = base64Data.substring(dataStart);
          
          // Send file metadata first
          const metadata = {
            type: 'file-start',
            fileName: file.name,
            fileType: file.type,
            fileSize: file.size,
            totalChunks: Math.ceil(actualData.length / chunkSize),
            timestamp: Date.now(),
            groupId: groupId
          };
          
          console.log(`📤 Sending file ${file.name} (${file.size} bytes) in ${metadata.totalChunks} chunks...`);
          
          // Send metadata
          dataChannel.send(JSON.stringify(metadata));
          
          // Set buffer threshold for flow control
          const bufferThreshold = 65536; // 64KB
          dataChannel.bufferedAmountLowThreshold = bufferThreshold;
          
          // Send chunks with adaptive delay based on buffer
          for (let i = 0; i < actualData.length; i += chunkSize) {
            // Check if data channel is still open
            if (dataChannel.readyState !== 'open') {
              throw new Error('Data channel closed while sending chunks');
            }
            
            // Wait if buffer is too full
            while (dataChannel.bufferedAmount > bufferThreshold) {
              await new Promise(resolve => setTimeout(resolve, 10));
            }
            
            const chunk = actualData.substring(i, i + chunkSize);
            const chunkData = {
              type: 'file-chunk',
              chunkIndex: Math.floor(i / chunkSize),
              data: chunk,
              groupId: groupId
            };
            
            dataChannel.send(JSON.stringify(chunkData));
          }
          
          // Send file end marker
          const endMarker = {
            type: 'file-end',
            fileName: file.name,
            groupId: groupId
          };
          dataChannel.send(JSON.stringify(endMarker));
          
          console.log(`✅ Sent file ${file.name} successfully`);
          resolve();
        } catch (error) {
          console.error('❌ Error sending file:', error);
          reject(error);
        }
      };

      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  /**
   * Check if connected to peer
   */
  isConnected(peerId) {
    const pc = this.peerConnections.get(peerId);
    return pc && pc.connectionState === 'connected';
  }

  /**
   * Close connection with peer
   */
  closePeerConnection(peerId) {
    const dataChannel = this.dataChannels.get(peerId);
    if (dataChannel) {
      dataChannel.close();
      this.dataChannels.delete(peerId);
    }

    const pc = this.peerConnections.get(peerId);
    if (pc) {
      pc.close();
      this.peerConnections.delete(peerId);
    }
  }

  /**
   * Close all connections
   */
  closeAllConnections() {
    for (const peerId of this.peerConnections.keys()) {
      this.closePeerConnection(peerId);
    }
  }

  /**
   * Set callback for received messages
   */
  onMessage(callback) {
    this.onMessageCallback = callback;
  }

  /**
   * Set callback for typing indicators
   */
  onTyping(callback) {
    this.onTypingCallback = callback;
  }

  /**
   * Set callback for received files
   */
  onFile(callback) {
    this.onFileCallback = callback;
  }

  /**
   * Set callback for group messages
   */
  onGroupMessage(callback) {
    this.onGroupMessageCallback = callback;
  }

  /**
   * Connect to all peers in a group (Mesh network)
   */
  async connectToGroup(groupId, peerIds, signalingService) {
    console.log(`🔗 Connecting to group ${groupId} with ${peerIds.length} peers`);
    
    if (!this.groupConnections.has(groupId)) {
      this.groupConnections.set(groupId, new Set());
    }

    const connectedPeers = this.groupConnections.get(groupId);

    for (const peerId of peerIds) {
      // Skip if already in this group
      if (connectedPeers.has(peerId)) {
        console.log(`  ✅ ${peerId} already in group ${groupId}`);
        continue;
      }

      // Check if we have a working connection with this peer
      const pc = this.peerConnections.get(peerId);
      if (pc && this.isConnected(peerId)) {
        console.log(`  ✅ Using existing connection with ${peerId} for group ${groupId}`);
        connectedPeers.add(peerId);
        continue;
      }

      // Create connection if not exists or not connected
      if (!pc) {
        console.log(`  📤 Creating new connection to ${peerId} for group ${groupId}`);
        this.createPeerConnection(peerId, signalingService, true);
        await this.createOffer(peerId, signalingService);
      } else {
        console.log(`  ⏳ Connection to ${peerId} already exists (state: ${pc.signalingState}), reusing for group`);
      }

      connectedPeers.add(peerId);
    }

    console.log(`✅ Group ${groupId} mesh network established with ${connectedPeers.size} peers`);
  }

  /**
   * Send message to all peers in group (broadcast)
   * Auto-creates connections if needed
   */
  async sendGroupMessage(groupId, message, signalingService = null) {
    const peerIds = this.groupConnections.get(groupId);
    
    if (!peerIds || peerIds.size === 0) {
      console.error('No peers connected in group', groupId);
      throw new Error('No peers in group');
    }

    let sentCount = 0;
    const failedPeers = [];

    for (const peerId of peerIds) {
      try {
        await this.sendMessage(peerId, message, groupId, signalingService);  // Pass groupId to distinguish group messages
        sentCount++;
      } catch (error) {
        console.error(`Failed to send to ${peerId}:`, error);
        failedPeers.push(peerId);
      }
    }

    console.log(`📤 Sent group message to ${sentCount}/${peerIds.size} peers in group ${groupId}`);
    
    if (failedPeers.length > 0) {
      console.warn('Failed to send to peers:', failedPeers);
    }

    return { sent: sentCount, failed: failedPeers.length };
  }

  /**
   * Send file to all peers in group (broadcast)
   * Auto-creates connections if needed
   */
  async sendGroupFile(groupId, file, signalingService = null) {
    const peerIds = this.groupConnections.get(groupId);
    
    if (!peerIds || peerIds.size === 0) {
      console.error('No peers connected in group', groupId);
      throw new Error('No peers in group');
    }

    let sentCount = 0;
    const failedPeers = [];

    for (const peerId of peerIds) {
      try {
        await this.sendFile(peerId, file, groupId, signalingService);  // Pass groupId to distinguish group files
        sentCount++;
      } catch (error) {
        console.error(`Failed to send file to ${peerId}:`, error);
        failedPeers.push(peerId);
      }
    }

    console.log(`📤 Sent group file to ${sentCount}/${peerIds.size} peers in group ${groupId}`);
    
    if (failedPeers.length > 0) {
      console.warn('Failed to send file to peers:', failedPeers);
    }

    return { sent: sentCount, failed: failedPeers.length };
  }

  /**
   * Disconnect from a group
   */
  disconnectFromGroup(groupId) {
    const peerIds = this.groupConnections.get(groupId);
    
    if (!peerIds) return;

    console.log(`🔌 Disconnecting from group ${groupId}`);

    // Note: Don't close connections as peer might be in multiple groups
    // Just remove from group tracking
    this.groupConnections.delete(groupId);
  }

  /**
   * Get connected peers in a group
   */
  getGroupPeers(groupId) {
    return this.groupConnections.get(groupId) || new Set();
  }

  /**
   * Check if connected to all peers in group
   */
  isGroupConnected(groupId) {
    const peerIds = this.groupConnections.get(groupId);
    if (!peerIds || peerIds.size === 0) return false;

    // Check if all peers are actually connected
    for (const peerId of peerIds) {
      if (!this.isConnected(peerId)) {
        return false;
      }
    }

    return true;
  }
}

const webrtcService = new WebRTCService();
export default webrtcService;

