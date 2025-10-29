package com.p2pchat.event;

import com.p2pchat.service.UserService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class ApplicationStartupListener {

    private static final Logger log = LoggerFactory.getLogger(ApplicationStartupListener.class);
    
    private final UserService userService;
    
    public ApplicationStartupListener(UserService userService) {
        this.userService = userService;
    }

    @EventListener(ApplicationReadyEvent.class)
    @Transactional
    public void onApplicationReady() {
        log.info("🚀 Application startup detected - cleaning up user statuses...");
        
        try {
            userService.setAllUsersOffline();
            
            log.info("✅ Successfully set all users to OFFLINE status");
            log.info("💡 Users will be marked ONLINE when they reconnect via WebSocket");
        } catch (Exception e) {
            log.error("❌ Failed to cleanup user statuses on startup: {}", e.getMessage(), e);
        }
    }
}

