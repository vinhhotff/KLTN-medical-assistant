package com.mediassist.repository;

import com.mediassist.model.entity.EmailVerificationToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface EmailVerificationTokenRepository extends JpaRepository<EmailVerificationToken, UUID> {

    Optional<EmailVerificationToken> findByTokenHash(String tokenHash);

    void deleteByUserId(UUID userId);

    /** Xoa moi token khac cua user (giu lai token vua dung de luu vet used_at). */
    void deleteByUserIdAndIdNot(UUID userId, UUID keepTokenId);
}
