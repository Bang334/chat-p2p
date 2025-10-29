package com.p2pchat.service;

import com.p2pchat.entity.Friend;
import com.p2pchat.repository.FriendRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class FriendService {
    private final FriendRepository friendRepository;

    public FriendService(FriendRepository friendRepository) {
        this.friendRepository = friendRepository;
    }

    public List<Long> getFriends(Long userId) {
        List<Friend> friends = friendRepository.findByUserId(userId);
        return friends.stream()
                .map(Friend::getFriendId)
                .collect(Collectors.toList());
    }

    @Transactional
    public boolean addFriend(Long userId, Long friendId) {
        // Check if already friends
        if (friendRepository.existsByUserIdAndFriendId(userId, friendId)) {
            return false;
        }

        // Create bidirectional friendship
        friendRepository.save(new Friend(userId, friendId));
        friendRepository.save(new Friend(friendId, userId));
        return true;
    }

    @Transactional
    public boolean removeFriend(Long userId, Long friendId) {
        friendRepository.deleteByUserIdAndFriendId(userId, friendId);
        friendRepository.deleteByUserIdAndFriendId(friendId, userId);
        return true;
    }
}

