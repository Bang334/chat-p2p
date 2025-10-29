package com.p2pchat.controller;

import com.p2pchat.dto.UserDTO;
import com.p2pchat.entity.User.UserStatus;
import com.p2pchat.service.UserService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/users")
@CrossOrigin(origins = "*")
public class UserController {

    private final UserService userService;
    
    public UserController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping("/online")
    public ResponseEntity<List<UserDTO>> getOnlineUsers() {
        return ResponseEntity.ok(userService.getOnlineUsers());
    }

    @GetMapping("/all")
    public ResponseEntity<List<UserDTO>> getAllUsers() {
        return ResponseEntity.ok(userService.getAllUsers());
    }

    @PutMapping("/{userId}/status")
    public ResponseEntity<?> updateStatus(
            @PathVariable Long userId, 
            @RequestParam String status) {
        try {
            UserStatus userStatus = UserStatus.valueOf(status.toUpperCase());
            userService.updateUserStatus(userId, userStatus);
            return ResponseEntity.ok("Status updated");
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
}

