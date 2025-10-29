package com.p2pchat.controller;

import com.p2pchat.dto.GroupDTO;
import com.p2pchat.service.GroupService;
import com.p2pchat.service.RequestService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;
import java.util.Set;

@RestController
@RequestMapping("/api/groups")
@CrossOrigin(origins = "*")
public class GroupController {

    private final GroupService groupService;
    private final RequestService requestService;
    
    public GroupController(GroupService groupService, RequestService requestService) {
        this.groupService = groupService;
        this.requestService = requestService;
    }

    @PostMapping
    public ResponseEntity<GroupDTO> createGroup(@RequestBody Map<String, Object> request) {
        String groupName = (String) request.get("groupName");
        Long creatorId = ((Number) request.get("creatorId")).longValue();
        
        @SuppressWarnings("unchecked")
        List<Number> memberIdsList = (List<Number>) request.get("memberIds");
        Set<Long> memberIds = memberIdsList != null 
            ? memberIdsList.stream().map(Number::longValue).collect(java.util.stream.Collectors.toSet())
            : null;
        
        System.out.println("📝 Creating group '" + groupName + "' by creator " + creatorId);
        System.out.println("📝 Member IDs to invite: " + memberIds);
        
        // Create group with only creator
        GroupDTO group = groupService.createGroup(groupName, creatorId, memberIds);
        
        // Send invitations to invited members (skip creator)
        if (memberIds != null && !memberIds.isEmpty()) {
            int invitationsSent = 0;
            for (Long memberId : memberIds) {
                // Don't send invitation to creator (they're already in the group)
                if (!memberId.equals(creatorId)) {
                    boolean sent = requestService.sendGroupInvitation(creatorId, memberId, group.getGroupId());
                    if (sent) {
                        invitationsSent++;
                        System.out.println("✉️ Sent group invitation to user " + memberId);
                    } else {
                        System.out.println("⚠️ Failed to send invitation to user " + memberId + " (duplicate or error)");
                    }
                } else {
                    System.out.println("⏭️ Skipping invitation for creator " + creatorId);
                }
            }
            System.out.println("✅ Sent " + invitationsSent + " group invitations");
        }
        
        return ResponseEntity.ok(group);
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<List<GroupDTO>> getUserGroups(@PathVariable Long userId) {
        return ResponseEntity.ok(groupService.getUserGroups(userId));
    }

    @GetMapping("/{groupId}")
    public ResponseEntity<GroupDTO> getGroup(@PathVariable Long groupId) {
        return ResponseEntity.ok(groupService.getGroup(groupId));
    }

    @PostMapping("/{groupId}/members")
    public ResponseEntity<GroupDTO> addMember(
            @PathVariable Long groupId,
            @RequestBody Map<String, Long> request) {
        Long userId = request.get("userId");
        return ResponseEntity.ok(groupService.addMember(groupId, userId));
    }

    @DeleteMapping("/{groupId}/members/{userId}")
    public ResponseEntity<GroupDTO> removeMember(
            @PathVariable Long groupId,
            @PathVariable Long userId) {
        return ResponseEntity.ok(groupService.removeMember(groupId, userId));
    }
}

