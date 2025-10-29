package com.p2pchat.repository;

import com.p2pchat.entity.User;
import com.p2pchat.entity.User.UserStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByUsername(String username);
    Optional<User> findByEmail(String email);
    Optional<User> findByPeerId(String peerId);
    List<User> findByStatus(UserStatus status);
    boolean existsByUsername(String username);
    boolean existsByEmail(String email);
    
    /**
     * Set all users to OFFLINE status
     * Useful for server restart cleanup
     */
    @Modifying
    @Query("UPDATE User u SET u.status = :status")
    void updateAllUsersStatus(UserStatus status);
}

