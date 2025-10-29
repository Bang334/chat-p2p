package com.p2pchat.repository;

import com.p2pchat.entity.Request;
import com.p2pchat.entity.Request.RequestStatus;
import com.p2pchat.entity.Request.RequestType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface RequestRepository extends JpaRepository<Request, Long> {
    List<Request> findByToUserIdAndStatus(Long toUserId, RequestStatus status);
    List<Request> findByToUserIdAndRequestTypeAndStatus(Long toUserId, RequestType type, RequestStatus status);
    Optional<Request> findByFromUserIdAndToUserIdAndRequestType(Long fromUserId, Long toUserId, RequestType type);
    boolean existsByFromUserIdAndToUserIdAndRequestType(Long fromUserId, Long toUserId, RequestType type);
    List<Request> findByToUserId(Long toUserId);
}

