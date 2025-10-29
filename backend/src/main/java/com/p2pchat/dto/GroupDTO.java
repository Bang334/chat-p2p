package com.p2pchat.dto;

import java.util.Set;

public class GroupDTO {
    private Long groupId;
    private String groupName;
    private String groupAvatar;
    private Long creatorId;
    private Set<Long> memberIds;
    private Integer memberCount;
    
    public GroupDTO() {}
    
    public GroupDTO(Long groupId, String groupName, String groupAvatar, Long creatorId, Set<Long> memberIds) {
        this.groupId = groupId;
        this.groupName = groupName;
        this.groupAvatar = groupAvatar;
        this.creatorId = creatorId;
        this.memberIds = memberIds;
        this.memberCount = memberIds != null ? memberIds.size() : 0;
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
    public void setMemberIds(Set<Long> memberIds) { 
        this.memberIds = memberIds;
        this.memberCount = memberIds != null ? memberIds.size() : 0;
    }
    
    public Integer getMemberCount() { return memberCount; }
    public void setMemberCount(Integer memberCount) { this.memberCount = memberCount; }
}

