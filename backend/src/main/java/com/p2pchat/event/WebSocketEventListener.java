package com.p2pchat.event;

import com.p2pchat.entity.User.UserStatus;
import com.p2pchat.service.PeerRegistry;
import com.p2pchat.service.UserService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionConnectedEvent;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

@Component
public class WebSocketEventListener {

    private static final Logger log = LoggerFactory.getLogger(WebSocketEventListener.class);
    
    private final SimpMessagingTemplate messagingTemplate;
    private final UserService userService;
    private final PeerRegistry peerRegistry;
    
    public WebSocketEventListener(SimpMessagingTemplate messagingTemplate, UserService userService, PeerRegistry peerRegistry) {
        this.messagingTemplate = messagingTemplate;
        this.userService = userService;
        this.peerRegistry = peerRegistry;
    }

    @EventListener
    public void handleWebSocketConnectListener(SessionConnectedEvent event) {
        log.info("🔌 New WebSocket connection established: {}", event.getMessage().getHeaders().get("simpSessionId"));
    }

    @EventListener
    public void handleWebSocketDisconnectListener(SessionDisconnectEvent event) {
        SimpMessageHeaderAccessor headerAccessor = SimpMessageHeaderAccessor.wrap(event.getMessage());
        String sessionId = headerAccessor.getSessionId();
        
        log.info("🔌 WebSocket session disconnected: {}", sessionId);
        
        // Find peerId associated with this session and clean up
        String peerId = peerRegistry.unregisterBySession(sessionId);
        
        if (peerId != null) {
            log.info("👋 Cleaning up peer {} from session {}", peerId, sessionId);
            
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
            
            // Broadcast peer offline to all connected peers
            var notification = new com.p2pchat.dto.SignalingMessage();
            notification.setType(com.p2pchat.dto.SignalingMessage.SignalType.PEER_OFFLINE);
            notification.setFrom(peerId);
            notification.setTimestamp(System.currentTimeMillis());
            
            messagingTemplate.convertAndSend("/topic/peers", notification);
            log.info("📤 Broadcasted PEER_OFFLINE for {}", peerId);
        } else {
            log.warn("⚠️ No peerId found for session {}", sessionId);
        }
    }
}

