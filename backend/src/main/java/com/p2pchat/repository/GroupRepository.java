package com.p2pchat.repository;

import com.p2pchat.entity.Group;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface GroupRepository extends JpaRepository<Group, Long> {
    
    @Query("SELECT g FROM Group g JOIN g.memberIds m WHERE m = :userId")
    List<Group> findGroupsByUserId(@Param("userId") Long userId);
    
    List<Group> findByCreatorId(Long creatorId);
}

