package com.p2pchat.service;

import com.p2pchat.dto.UserDTO;
import com.p2pchat.entity.User;
import com.p2pchat.entity.User.UserStatus;
import com.p2pchat.repository.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    
    public UserService(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    public User registerUser(String username, String password, String email) {
        if (userRepository.existsByUsername(username)) {
            throw new RuntimeException("Username already exists");
        }

        User user = new User();
        user.setUsername(username);
        user.setPassword(passwordEncoder.encode(password));
        user.setEmail(email);
        user.setPeerId(generatePeerId());
        user.setStatus(UserStatus.OFFLINE);
        user.setCreatedAt(LocalDateTime.now());

        return userRepository.save(user);
    }

    public User findByUsername(String username) {
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));
    }

    public User updateUserStatus(Long userId, UserStatus status) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        user.setStatus(status);
        user.setLastSeen(LocalDateTime.now());
        return userRepository.save(user);
    }

    public List<UserDTO> getOnlineUsers() {
        return userRepository.findByStatus(UserStatus.ONLINE)
                .stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    public List<UserDTO> getAllUsers() {
        return userRepository.findAll()
                .stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    private String generatePeerId() {
        return "peer-" + UUID.randomUUID().toString();
    }

    private UserDTO convertToDTO(User user) {
        UserDTO dto = new UserDTO();
        dto.setUserId(user.getUserId());
        dto.setUsername(user.getUsername());
        dto.setEmail(user.getEmail());
        dto.setAvatarUrl(user.getAvatarUrl());
        dto.setStatus(user.getStatus().name());
        dto.setPeerId(user.getPeerId());
        return dto;
    }

    public boolean validatePassword(String rawPassword, String encodedPassword) {
        return passwordEncoder.matches(rawPassword, encodedPassword);
    }
    
    /**
     * Set all users to OFFLINE status
     * Called during server startup to clean stale ONLINE statuses
     */
    public void setAllUsersOffline() {
        userRepository.updateAllUsersStatus(UserStatus.OFFLINE);
    }
}

