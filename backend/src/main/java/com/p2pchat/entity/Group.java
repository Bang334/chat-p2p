package com.p2pchat.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "`groups`")
public class Group {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long groupId;
    
    @Column(nullable = false)
    private String groupName;
    
    private String groupAvatar;
    
    @Column(nullable = false)
    private Long creatorId;
    
    @ElementCollection
    @CollectionTable(name = "`group_members`", joinColumns = @JoinColumn(name = "group_id"))
    @Column(name = "user_id")
    private Set<Long> memberIds = new HashSet<>();
    
    private LocalDateTime createdAt = LocalDateTime.now();
    
    public Group() {}
    
    public Group(String groupName, Long creatorId) {
        this.groupName = groupName;
        this.creatorId = creatorId;
        this.memberIds.add(creatorId);
    }
    
    // Getters and Setters
    public Long getGroupId() { return groupId; }
    public void setGroupId(Long groupId) { this.groupId = groupId; }
    
    public String getGroupName() { return groupName; }
    public void setGroupName(String groupName) { this.groupName = groupName; }
    
    public String getGroupAvatar() { return groupAvatar; }
    public void setGroupAvatar(String groupAvatar) { this.groupAvatar = groupAvatar; }
    
    public Long getCreatorId() { return creatorId; }
    public void setCreatorId(Long creatorId) { this.creatorId = creatorId; }
    
    public Set<Long> getMemberIds() { return memberIds; }
    public void setMemberIds(Set<Long> memberIds) { this.memberIds = memberIds; }
    
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    
    public void addMember(Long userId) {
        this.memberIds.add(userId);
    }
    
    public void removeMember(Long userId) {
        this.memberIds.remove(userId);
    }
}

