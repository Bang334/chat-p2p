package com.p2pchat.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "users")
public class User {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long userId;
    
    @Column(unique = true, nullable = false)
    private String username;
    
    @Column(nullable = false)
    private String password;
    
    @Column(unique = true)
    private String email;
    
    private String avatarUrl;
    
    @Enumerated(EnumType.STRING)
    private UserStatus status = UserStatus.OFFLINE;
    
    private String peerId;
    
    private LocalDateTime createdAt = LocalDateTime.now();
    
    private LocalDateTime lastSeen;
    
    public User() {}
    
    public User(Long userId, String username, String password, String email, String avatarUrl, 
                UserStatus status, String peerId, LocalDateTime createdAt, LocalDateTime lastSeen) {
        this.userId = userId;
        this.username = username;
        this.password = password;
        this.email = email;
        this.avatarUrl = avatarUrl;
        this.status = status;
        this.peerId = peerId;
        this.createdAt = createdAt;
        this.lastSeen = lastSeen;
    }
    
    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }
    
    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }
    
    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }
    
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    
    public String getAvatarUrl() { return avatarUrl; }
    public void setAvatarUrl(String avatarUrl) { this.avatarUrl = avatarUrl; }
    
    public UserStatus getStatus() { return status; }
    public void setStatus(UserStatus status) { this.status = status; }
    
    public String getPeerId() { return peerId; }
    public void setPeerId(String peerId) { this.peerId = peerId; }
    
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    
    public LocalDateTime getLastSeen() { return lastSeen; }
    public void setLastSeen(LocalDateTime lastSeen) { this.lastSeen = lastSeen; }
    
    public enum UserStatus {
        ONLINE, OFFLINE, BUSY
    }
}

