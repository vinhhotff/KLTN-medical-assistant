package com.mediassist.repository;

import com.mediassist.model.entity.OrderType;
import com.mediassist.model.entity.PaymentTransaction;
import com.mediassist.model.entity.TransactionStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface PaymentTransactionRepository extends JpaRepository<PaymentTransaction, UUID> {

    Optional<PaymentTransaction> findByTransactionCode(String transactionCode);

    Optional<PaymentTransaction> findByGatewayReference(String gatewayReference);

    @Query("SELECT pt FROM PaymentTransaction pt JOIN FETCH pt.user WHERE pt.user.id = :userId ORDER BY pt.createdAt DESC")
    List<PaymentTransaction> findByUserIdOrderByCreatedAtDesc(@Param("userId") UUID userId);

    Optional<PaymentTransaction> findFirstByUserIdAndOrderTypeAndReferenceIdAndStatus(
            UUID userId, OrderType orderType, String referenceId, TransactionStatus status);
}
