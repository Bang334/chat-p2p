package com.p2pchat.controller;

import com.p2pchat.dto.SignalingMessage;
import com.p2pchat.entity.User.UserStatus;
import com.p2pchat.service.PeerRegistry;
import com.p2pchat.service.UserService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.CrossOrigin;

@Controller
@CrossOrigin(origins = "*")
public class SignalingController {

    private static final Logger log = LoggerFactory.getLogger(SignalingController.class);
    
    private final SimpMessagingTemplate messagingTemplate;
    private final UserService userService;
    private final PeerRegistry peerRegistry;
    
    public SignalingController(SimpMessagingTemplate messagingTemplate, UserService userService, PeerRegistry peerRegistry) {
        this.messagingTemplate = messagingTemplate;
        this.userService = userService;
        this.peerRegistry = peerRegistry;
    }

    /**
     * Handle WebRTC Offer
     */
    @MessageMapping("/signal/offer")
    public void handleOffer(@Payload SignalingMessage message, SimpMessageHeaderAccessor headerAccessor) {
        log.info("🔥 OFFER ENDPOINT CALLED!");
        log.info("📞 Received OFFER from {} to {}", message.getFrom(), message.getTo());
        log.info("📋 Message details: type={}, payload={}", message.getType(), message.getPayload());
        log.info("📋 Online peers: {}", peerRegistry.getAllPeerIds());
        
        message.setType(SignalingMessage.SignalType.OFFER);
        message.setTimestamp(System.currentTimeMillis());
        
        // Get target peer's session ID
        String targetSessionId = peerRegistry.getSessionId(message.getTo());
        log.info("🎯 Looking for peer: {}, found session: {}", message.getTo(), targetSessionId);
        
        if (targetSessionId != null) {
            // Send to specific peer's topic
            String destination = "/topic/peer/" + message.getTo();
            messagingTemplate.convertAndSend(destination, message);
            log.info("📤 Sent OFFER to peer {} via topic {}", message.getTo(), destination);
        } else {
            log.warn("⚠️ Target peer {} not found in online peers", message.getTo());
        }
    }

    /**
     * Handle WebRTC Answer
     */
    @MessageMapping("/signal/answer")
    public void handleAnswer(@Payload SignalingMessage message) {
        log.info("✅ Received ANSWER from {} to {}", message.getFrom(), message.getTo());
        
        message.setType(SignalingMessage.SignalType.ANSWER);
        message.setTimestamp(System.currentTimeMillis());
        
        // Get target peer's session ID
        String targetSessionId = peerRegistry.getSessionId(message.getTo());
        
        if (targetSessionId != null) {
            // Send to specific peer's topic
            String destination = "/topic/peer/" + message.getTo();
            messagingTemplate.convertAndSend(destination, message);
            log.info("📤 Sent ANSWER to peer {} via topic {}", message.getTo(), destination);
        } else {
            log.warn("⚠️ Target peer {} not found in online peers", message.getTo());
        }
    }

    /**
     * Handle ICE Candidate
     */
    @MessageMapping("/signal/ice-candidate")
    public void handleIceCandidate(@Payload SignalingMessage message) {
        log.debug("🧊 Received ICE candidate from {} to {}", message.getFrom(), message.getTo());
        
        message.setType(SignalingMessage.SignalType.ICE_CANDIDATE);
        message.setTimestamp(System.currentTimeMillis());
        
        // Get target peer's session ID
        String targetSessionId = peerRegistry.getSessionId(message.getTo());
        
        if (targetSessionId != null) {
            // Send to specific peer's topic
            String destination = "/topic/peer/" + message.getTo();
            messagingTemplate.convertAndSend(destination, message);
            log.debug("📤 Sent ICE candidate to peer {} via topic {}", message.getTo(), destination);
        } else {
            log.warn("⚠️ Target peer {} not found for ICE candidate", message.getTo());
        }
    }

    /**
     * Handle peer coming online
     */
    @MessageMapping("/signal/peer-online")
    public void handlePeerOnline(@Payload SignalingMessage message, SimpMessageHeaderAccessor headerAccessor) {
        String sessionId = headerAccessor != null ? headerAccessor.getSessionId() : null;
        String peerId = message.getFrom();
        
        log.info("👤 Peer {} came online (session: {})", peerId, sessionId);
        
        // Register peer in central registry
        if (sessionId != null) {
            peerRegistry.registerPeer(peerId, sessionId);
        }
        
        // Update user status in database
        try {
            // Extract userId from peerId format: "peer-{userId}-{suffix}"
            String[] parts = peerId.replace("peer-", "").split("-");
            if (parts.length >= 1) {
                Long userId = Long.parseLong(parts[0]);
                userService.updateUserStatus(userId, UserStatus.ONLINE);
            }
        } catch (Exception e) {
            log.warn("Could not update user status for peer {}: {}", peerId, e.getMessage());
        }
        
        // Broadcast to all peers
        SignalingMessage notification = new SignalingMessage();
        notification.setType(SignalingMessage.SignalType.PEER_ONLINE);
        notification.setFrom(peerId);
        notification.setTimestamp(System.currentTimeMillis());
        
        messagingTemplate.convertAndSend("/topic/peers", notification);
    }

    /**
     * Handle peer going offline
     */
    @MessageMapping("/signal/peer-offline")
    public void handlePeerOffline(@Payload SignalingMessage message, SimpMessageHeaderAccessor headerAccessor) {
        String peerId = message.getFrom();
        String sessionId = headerAccessor != null ? headerAccessor.getSessionId() : null;
        
        log.info("👋 Peer {} went offline (session: {})", peerId, sessionId);
        
        // Unregister peer from central registry
        peerRegistry.unregisterPeer(peerId);
        
        // Update user status in database
        try {
            // Extract userId from peerId format: "peer-{userId}-{suffix}"
            String[] parts = peerId.replace("peer-", "").split("-");
            if (parts.length >= 1) {
                Long userId = Long.parseLong(parts[0]);
                userService.updateUserStatus(userId, UserStatus.OFFLINE);
            }
        } catch (Exception e) {
            log.warn("Could not update user status for peer {}: {}", peerId, e.getMessage());
        }
        
        // Broadcast to all peers
        SignalingMessage notification = new SignalingMessage();
        notification.setType(SignalingMessage.SignalType.PEER_OFFLINE);
        notification.setFrom(peerId);
        notification.setTimestamp(System.currentTimeMillis());
        
        messagingTemplate.convertAndSend("/topic/peers", notification);
    }

    /**
     * Handle call request
     */
    @MessageMapping("/signal/call-request")
    public void handleCallRequest(@Payload SignalingMessage message) {
        log.info("📲 Call request from {} to {}", message.getFrom(), message.getTo());
        
        message.setType(SignalingMessage.SignalType.CALL_REQUEST);
        message.setTimestamp(System.currentTimeMillis());
        
        // Get target peer's session ID
        String targetSessionId = peerRegistry.getSessionId(message.getTo());
        
        if (targetSessionId != null) {
            // Send to specific peer's topic
            String destination = "/topic/peer/" + message.getTo();
            messagingTemplate.convertAndSend(destination, message);
            log.info("📤 Sent CALL_REQUEST to peer {} via topic {}", message.getTo(), destination);
        } else {
            log.warn("⚠️ Target peer {} not found for call request", message.getTo());
        }
    }

    /**
     * Handle call accept
     */
    @MessageMapping("/signal/call-accept")
    public void handleCallAccept(@Payload SignalingMessage message) {
        log.info("✅ Call accepted from {} to {}", message.getFrom(), message.getTo());
        
        message.setType(SignalingMessage.SignalType.CALL_ACCEPT);
        message.setTimestamp(System.currentTimeMillis());
        
        // message.getFrom() = người accept (Bob)
        // message.getTo() = người nhận accept (Alice)
        // Send to the initiator (getTo)
        String destination = "/topic/peer/" + message.getTo();
        messagingTemplate.convertAndSend(destination, message);
        log.info("📤 Sent CALL_ACCEPT from {} to {} via topic {}", message.getFrom(), message.getTo(), destination);
    }

    /**
     * Handle call reject
     */
    @MessageMapping("/signal/call-reject")
    public void handleCallReject(@Payload SignalingMessage message) {
        log.info("❌ Call rejected from {} to {}", message.getFrom(), message.getTo());
        
        message.setType(SignalingMessage.SignalType.CALL_REJECT);
        message.setTimestamp(System.currentTimeMillis());
        
        messagingTemplate.convertAndSendToUser(
            message.getTo(),
            "/queue/signal",
            message
        );
    }

    /**
     * Handle typing indicator
     */
    @MessageMapping("/signal/typing")
    public void handleTyping(@Payload SignalingMessage message) {
        message.setType(SignalingMessage.SignalType.TYPING);
        message.setTimestamp(System.currentTimeMillis());
        
        messagingTemplate.convertAndSendToUser(
            message.getTo(),
            "/queue/signal",
            message
        );
    }
}

