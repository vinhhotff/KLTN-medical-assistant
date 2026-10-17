package com.mediassist.repository;

import com.mediassist.model.entity.PasswordResetToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface PasswordResetTokenRepository extends JpaRepository<PasswordResetToken, UUID> {

    Optional<PasswordResetToken> findByTokenHash(String tokenHash);

    void deleteByUserId(UUID userId);

    /** Xoa moi token khac cua user (giu lai token vua dung de luu vet used=true). */
    void deleteByUserIdAndIdNot(UUID userId, UUID keepTokenId);
}
