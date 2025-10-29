package com.p2pchat.controller;

import com.p2pchat.entity.Request;
import com.p2pchat.service.RequestService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/requests")
@CrossOrigin(origins = "*")
public class RequestController {
    private final RequestService requestService;

    public RequestController(RequestService requestService) {
        this.requestService = requestService;
    }

    // Send friend request
    @PostMapping("/friend")
    public ResponseEntity<?> sendFriendRequest(@RequestParam Long friendId, @RequestParam Long userId) {
        boolean success = requestService.sendFriendRequest(userId, friendId);
        if (success) {
            return ResponseEntity.ok(Map.of("message", "Friend request sent"));
        }
        return ResponseEntity.badRequest().body(Map.of("error", "Friend request already exists or already friends"));
    }

    // Send group invitation
    @PostMapping("/group")
    public ResponseEntity<?> sendGroupInvitation(
            @RequestParam Long toUserId, 
            @RequestParam Long groupId, 
            @RequestParam Long userId) {
        boolean success = requestService.sendGroupInvitation(userId, toUserId, groupId);
        if (success) {
            return ResponseEntity.ok(Map.of("message", "Group invitation sent"));
        }
        return ResponseEntity.badRequest().body(Map.of("error", "Invitation already exists"));
    }

    // Get all pending requests
    @GetMapping("/pending")
    public ResponseEntity<List<Request>> getPendingRequests(@RequestParam Long userId) {
        return ResponseEntity.ok(requestService.getPendingRequests(userId));
    }

    // Get pending friend requests
    @GetMapping("/pending/friends")
    public ResponseEntity<List<Request>> getPendingFriendRequests(@RequestParam Long userId) {
        return ResponseEntity.ok(requestService.getPendingFriendRequests(userId));
    }

    // Get pending group invitations
    @GetMapping("/pending/groups")
    public ResponseEntity<List<Request>> getPendingGroupInvitations(@RequestParam Long userId) {
        return ResponseEntity.ok(requestService.getPendingGroupInvitations(userId));
    }

    // Accept request
    @PostMapping("/{requestId}/accept")
    public ResponseEntity<?> acceptRequest(@PathVariable Long requestId, @RequestParam Long userId) {
        boolean success = requestService.acceptRequest(requestId, userId);
        if (success) {
            return ResponseEntity.ok(Map.of("message", "Request accepted"));
        }
        return ResponseEntity.badRequest().body(Map.of("error", "Failed to accept request"));
    }

    // Reject request
    @PostMapping("/{requestId}/reject")
    public ResponseEntity<?> rejectRequest(@PathVariable Long requestId, @RequestParam Long userId) {
        boolean success = requestService.rejectRequest(requestId, userId);
        if (success) {
            return ResponseEntity.ok(Map.of("message", "Request rejected"));
        }
        return ResponseEntity.badRequest().body(Map.of("error", "Failed to reject request"));
    }
}

