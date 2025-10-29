package com.p2pchat.controller;

import com.p2pchat.dto.AuthRequest;
import com.p2pchat.dto.AuthResponse;
import com.p2pchat.entity.User;
import com.p2pchat.security.JwtUtil;
import com.p2pchat.service.UserService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "*")
public class AuthController {

    private final UserService userService;
    private final JwtUtil jwtUtil;
    
    public AuthController(UserService userService, JwtUtil jwtUtil) {
        this.userService = userService;
        this.jwtUtil = jwtUtil;
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody AuthRequest request) {
        try {
            User user = userService.registerUser(
                request.getUsername(), 
                request.getPassword(),
                request.getUsername() + "@p2pchat.com"
            );

            String token = jwtUtil.generateToken(user.getUsername(), user.getUserId());

            AuthResponse response = new AuthResponse(
                token,
                user.getUserId(),
                user.getUsername(),
                user.getPeerId(),
                "User registered successfully"
            );

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody AuthRequest request) {
        try {
            User user = userService.findByUsername(request.getUsername());

            if (!userService.validatePassword(request.getPassword(), user.getPassword())) {
                return ResponseEntity.badRequest().body("Invalid credentials");
            }

            String token = jwtUtil.generateToken(user.getUsername(), user.getUserId());

            AuthResponse response = new AuthResponse(
                token,
                user.getUserId(),
                user.getUsername(),
                user.getPeerId(),
                "Login successful"
            );

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Invalid credentials");
        }
    }
}

