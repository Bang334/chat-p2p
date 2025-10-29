package com.p2pchat.dto;

import com.p2pchat.entity.Request.RequestStatus;
import com.p2pchat.entity.Request.RequestType;

import java.time.LocalDateTime;

public class RequestDTO {
    private Long requestId;
    private Long fromUserId;
    private String fromUsername;
    private Long toUserId;
    private RequestType requestType;
    private Long targetId;  // For GROUP type, this is groupId
    private String targetName; // For GROUP type, this is groupName
    private RequestStatus status;
    private LocalDateTime createdAt;
    private LocalDateTime respondedAt;

    public RequestDTO() {}

    public RequestDTO(Long requestId, Long fromUserId, String fromUsername, Long toUserId, 
                     RequestType requestType, Long targetId, String targetName,
                     RequestStatus status, LocalDateTime createdAt, LocalDateTime respondedAt) {
        this.requestId = requestId;
        this.fromUserId = fromUserId;
        this.fromUsername = fromUsername;
        this.toUserId = toUserId;
        this.requestType = requestType;
        this.targetId = targetId;
        this.targetName = targetName;
        this.status = status;
        this.createdAt = createdAt;
        this.respondedAt = respondedAt;
    }

    // Getters and Setters
    public Long getRequestId() { return requestId; }
    public void setRequestId(Long requestId) { this.requestId = requestId; }

    public Long getFromUserId() { return fromUserId; }
    public void setFromUserId(Long fromUserId) { this.fromUserId = fromUserId; }

    public String getFromUsername() { return fromUsername; }
    public void setFromUsername(String fromUsername) { this.fromUsername = fromUsername; }

    public Long getToUserId() { return toUserId; }
    public void setToUserId(Long toUserId) { this.toUserId = toUserId; }

    public RequestType getRequestType() { return requestType; }
    public void setRequestType(RequestType requestType) { this.requestType = requestType; }

    public Long getTargetId() { return targetId; }
    public void setTargetId(Long targetId) { this.targetId = targetId; }

    public String getTargetName() { return targetName; }
    public void setTargetName(String targetName) { this.targetName = targetName; }

    public RequestStatus getStatus() { return status; }
    public void setStatus(RequestStatus status) { this.status = status; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getRespondedAt() { return respondedAt; }
    public void setRespondedAt(LocalDateTime respondedAt) { this.respondedAt = respondedAt; }
}

