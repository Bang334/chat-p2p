package com.p2pchat.controller;

import com.p2pchat.service.FriendService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/friends")
@CrossOrigin(origins = "*")
public class FriendController {
    private final FriendService friendService;

    public FriendController(FriendService friendService) {
        this.friendService = friendService;
    }

    @GetMapping
    public ResponseEntity<List<Long>> getFriends(@RequestParam Long userId) {
        return ResponseEntity.ok(friendService.getFriends(userId));
    }

    @PostMapping("/add")
    public ResponseEntity<?> addFriend(@RequestParam Long friendId, @RequestParam Long userId) {
        boolean success = friendService.addFriend(userId, friendId);
        if (success) {
            return ResponseEntity.ok(Map.of("message", "Friend added"));
        }
        return ResponseEntity.badRequest().body(Map.of("error", "Already friends"));
    }

    @DeleteMapping("/{friendId}")
    public ResponseEntity<?> removeFriend(@PathVariable Long friendId, @RequestParam Long userId) {
        friendService.removeFriend(userId, friendId);
        return ResponseEntity.ok(Map.of("message", "Friend removed"));
    }
}

