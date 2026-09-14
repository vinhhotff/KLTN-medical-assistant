package com.mediassist.repository;

import com.mediassist.model.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserRepository extends JpaRepository<User, UUID> {
    Optional<User> findByEmail(String email);
    boolean existsByEmail(String email);
    Optional<User> findByGoogleId(String googleId);

    @org.springframework.transaction.annotation.Transactional
    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.data.jpa.repository.Query("UPDATE User u SET u.scanQuota = u.scanQuota - 1 WHERE u.id = :id AND u.scanQuota > 0")
    int deductScanQuota(@org.springframework.data.repository.query.Param("id") UUID id);

    @org.springframework.transaction.annotation.Transactional
    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.data.jpa.repository.Query("UPDATE User u SET u.scanQuota = u.scanQuota + 1 WHERE u.id = :id")
    int restoreScanQuota(@org.springframework.data.repository.query.Param("id") UUID id);
}
