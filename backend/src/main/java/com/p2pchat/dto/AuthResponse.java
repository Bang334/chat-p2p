package com.p2pchat.dto;

public class AuthResponse {
    private String token;
    private Long userId;
    private String username;
    private String peerId;
    private String message;
    
    public AuthResponse() {}
    
    public AuthResponse(String token, Long userId, String username, String peerId, String message) {
        this.token = token;
        this.userId = userId;
        this.username = username;
        this.peerId = peerId;
        this.message = message;
    }
    
    public String getToken() { return token; }
    public void setToken(String token) { this.token = token; }
    
    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }
    
    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }
    
    public String getPeerId() { return peerId; }
    public void setPeerId(String peerId) { this.peerId = peerId; }
    
    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }
}

