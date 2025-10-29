package com.p2pchat.dto;

public class UserDTO {
    private Long userId;
    private String username;
    private String email;
    private String avatarUrl;
    private String status;
    private String peerId;
    
    public UserDTO() {}
    
    public UserDTO(Long userId, String username, String email, String avatarUrl, String status, String peerId) {
        this.userId = userId;
        this.username = username;
        this.email = email;
        this.avatarUrl = avatarUrl;
        this.status = status;
        this.peerId = peerId;
    }
    
    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }
    
    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }
    
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    
    public String getAvatarUrl() { return avatarUrl; }
    public void setAvatarUrl(String avatarUrl) { this.avatarUrl = avatarUrl; }
    
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    
    public String getPeerId() { return peerId; }
    public void setPeerId(String peerId) { this.peerId = peerId; }
}

