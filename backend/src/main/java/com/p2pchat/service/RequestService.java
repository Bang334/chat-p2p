package com.p2pchat.service;

import com.p2pchat.dto.SignalingMessage;
import com.p2pchat.entity.Friend;
import com.p2pchat.entity.Group;
import com.p2pchat.entity.Request;
import com.p2pchat.entity.Request.RequestStatus;
import com.p2pchat.entity.Request.RequestType;
import com.p2pchat.entity.User;
import com.p2pchat.repository.FriendRepository;
import com.p2pchat.repository.GroupRepository;
import com.p2pchat.repository.RequestRepository;
import com.p2pchat.repository.UserRepository;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class RequestService {
    private final RequestRepository requestRepository;
    private final FriendRepository friendRepository;
    private final GroupRepository groupRepository;
    private final UserRepository userRepository;
    private final SimpMessagingTemplate messagingTemplate;

    public RequestService(RequestRepository requestRepository, FriendRepository friendRepository, 
                         GroupRepository groupRepository, UserRepository userRepository,
                         SimpMessagingTemplate messagingTemplate) {
        this.requestRepository = requestRepository;
        this.friendRepository = friendRepository;
        this.groupRepository = groupRepository;
        this.userRepository = userRepository;
        this.messagingTemplate = messagingTemplate;
    }

    // Send friend request
    @Transactional
    public boolean sendFriendRequest(Long fromUserId, Long toUserId) {
        // Check if already friends
        if (friendRepository.existsByUserIdAndFriendId(fromUserId, toUserId)) {
            return false;
        }

        // Check if request already exists
        if (requestRepository.existsByFromUserIdAndToUserIdAndRequestType(fromUserId, toUserId, RequestType.FRIEND)) {
            return false;
        }

        Request request = new Request(fromUserId, toUserId, RequestType.FRIEND, null);
        requestRepository.save(request);
        return true;
    }

    // Send group invitation
    @Transactional
    public boolean sendGroupInvitation(Long fromUserId, Long toUserId, Long groupId) {
        // No duplicate check - allow inviting same person to multiple groups
        Request request = new Request(fromUserId, toUserId, RequestType.GROUP, groupId);
        requestRepository.save(request);
        return true;
    }

    // Accept request
    @Transactional
    public boolean acceptRequest(Long requestId, Long userId) {
        return requestRepository.findById(requestId)
                .map(request -> {
                    if (!request.getToUserId().equals(userId)) {
                        return false;
                    }
                    request.setStatus(RequestStatus.ACCEPTED);
                    request.setRespondedAt(LocalDateTime.now());
                    requestRepository.save(request);

                    // If friend request, create friendship
                    if (request.getRequestType() == RequestType.FRIEND) {
                        friendRepository.save(new Friend(request.getFromUserId(), request.getToUserId()));
                        friendRepository.save(new Friend(request.getToUserId(), request.getFromUserId()));
                    }
                    // If group invitation, add user to group
                    else if (request.getRequestType() == RequestType.GROUP && request.getTargetId() != null) {
                        Group group = groupRepository.findById(request.getTargetId()).orElse(null);
                        if (group != null) {
                            group.addMember(userId);
                            groupRepository.save(group);
                            
                            // Broadcast to all group members that new member joined
                            broadcastGroupMemberJoined(group, userId);
                        }
                    }

                    return true;
                })
                .orElse(false);
    }
    
    private void broadcastGroupMemberJoined(Group group, Long newMemberId) {
        User newMember = userRepository.findById(newMemberId).orElse(null);
        if (newMember == null || newMember.getPeerId() == null) {
            return;
        }
        
        // Prepare payload
        Map<String, Object> payload = new HashMap<>();
        payload.put("groupId", group.getGroupId());
        payload.put("groupName", group.getGroupName());
        payload.put("newMemberId", newMemberId);
        payload.put("newMemberPeerId", newMember.getPeerId());
        payload.put("newMemberUsername", newMember.getUsername());
        payload.put("totalMembers", group.getMemberIds().size());
        
        // Send to all existing members (including the new member)
        for (Long memberId : group.getMemberIds()) {
            User member = userRepository.findById(memberId).orElse(null);
            if (member != null && member.getPeerId() != null) {
                SignalingMessage message = new SignalingMessage(
                    SignalingMessage.SignalType.GROUP_MEMBER_JOINED,
                    newMember.getPeerId(),
                    member.getPeerId(),
                    payload,
                    System.currentTimeMillis()
                );
                
                // Send to peer's personal topic
                messagingTemplate.convertAndSend("/topic/peer/" + member.getPeerId(), message);
            }
        }
    }

    // Reject request
    @Transactional
    public boolean rejectRequest(Long requestId, Long userId) {
        return requestRepository.findById(requestId)
                .map(request -> {
                    if (!request.getToUserId().equals(userId)) {
                        return false;
                    }
                    request.setStatus(RequestStatus.REJECTED);
                    request.setRespondedAt(LocalDateTime.now());
                    requestRepository.save(request);
                    return true;
                })
                .orElse(false);
    }

    // Get all pending requests for user
    public List<Request> getPendingRequests(Long userId) {
        return requestRepository.findByToUserIdAndStatus(userId, RequestStatus.PENDING);
    }

    // Get pending friend requests
    public List<Request> getPendingFriendRequests(Long userId) {
        return requestRepository.findByToUserIdAndRequestTypeAndStatus(userId, RequestType.FRIEND, RequestStatus.PENDING);
    }

    // Get pending group invitations
    public List<Request> getPendingGroupInvitations(Long userId) {
        return requestRepository.findByToUserIdAndRequestTypeAndStatus(userId, RequestType.GROUP, RequestStatus.PENDING);
    }
}

