package com.p2pchat.service;

import com.p2pchat.dto.GroupDTO;
import com.p2pchat.dto.SignalingMessage;
import com.p2pchat.entity.Group;
import com.p2pchat.entity.User;
import com.p2pchat.repository.GroupRepository;
import com.p2pchat.repository.UserRepository;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class GroupService {

    private final GroupRepository groupRepository;
    private final UserRepository userRepository;
    private final SimpMessagingTemplate messagingTemplate;
    
    public GroupService(GroupRepository groupRepository, UserRepository userRepository, 
                       SimpMessagingTemplate messagingTemplate) {
        this.groupRepository = groupRepository;
        this.userRepository = userRepository;
        this.messagingTemplate = messagingTemplate;
    }

    public GroupDTO createGroup(String groupName, Long creatorId, Set<Long> memberIds) {
        Group group = new Group(groupName, creatorId);
        
        // Only creator is added initially
        // Other members will be added when they accept the invitation
        
        Group savedGroup = groupRepository.save(group);
        return convertToDTO(savedGroup);
    }

    public List<GroupDTO> getUserGroups(Long userId) {
        return groupRepository.findGroupsByUserId(userId)
                .stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    public GroupDTO getGroup(Long groupId) {
        return groupRepository.findById(groupId)
                .map(this::convertToDTO)
                .orElseThrow(() -> new RuntimeException("Group not found"));
    }

    public GroupDTO addMember(Long groupId, Long userId) {
        Group group = groupRepository.findById(groupId)
                .orElseThrow(() -> new RuntimeException("Group not found"));
        
        group.addMember(userId);
        Group savedGroup = groupRepository.save(group);
        return convertToDTO(savedGroup);
    }

    public GroupDTO removeMember(Long groupId, Long userId) {
        Group group = groupRepository.findById(groupId)
                .orElseThrow(() -> new RuntimeException("Group not found"));
        
        // Get member info before removing
        User leavingMember = userRepository.findById(userId).orElse(null);
        
        group.removeMember(userId);
        Group savedGroup = groupRepository.save(group);
        
        // Broadcast to remaining members that someone left
        if (leavingMember != null && leavingMember.getPeerId() != null) {
            broadcastGroupMemberLeft(savedGroup, leavingMember);
        }
        
        return convertToDTO(savedGroup);
    }
    
    private void broadcastGroupMemberLeft(Group group, User leavingMember) {
        // Prepare payload
        Map<String, Object> payload = new HashMap<>();
        payload.put("groupId", group.getGroupId());
        payload.put("groupName", group.getGroupName());
        payload.put("leftMemberId", leavingMember.getUserId());
        payload.put("leftMemberPeerId", leavingMember.getPeerId());
        payload.put("leftMemberUsername", leavingMember.getUsername());
        payload.put("totalMembers", group.getMemberIds().size());
        
        // Send to remaining members AND the leaving member
        Set<Long> allMemberIds = new java.util.HashSet<>(group.getMemberIds());
        allMemberIds.add(leavingMember.getUserId()); // Include leaving member to update their UI
        
        for (Long memberId : allMemberIds) {
            User member = userRepository.findById(memberId).orElse(null);
            if (member != null && member.getPeerId() != null) {
                SignalingMessage message = new SignalingMessage(
                    SignalingMessage.SignalType.GROUP_MEMBER_LEFT,
                    leavingMember.getPeerId(),
                    member.getPeerId(),
                    payload,
                    System.currentTimeMillis()
                );
                
                // Send to peer's personal topic
                messagingTemplate.convertAndSend("/topic/peer/" + member.getPeerId(), message);
            }
        }
    }

    private GroupDTO convertToDTO(Group group) {
        return new GroupDTO(
            group.getGroupId(),
            group.getGroupName(),
            group.getGroupAvatar(),
            group.getCreatorId(),
            group.getMemberIds()
        );
    }
}

