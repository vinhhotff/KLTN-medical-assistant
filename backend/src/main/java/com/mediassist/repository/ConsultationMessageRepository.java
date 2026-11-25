package com.mediassist.repository;

import com.mediassist.model.entity.ConsultationMessage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Repository
public interface ConsultationMessageRepository extends JpaRepository<ConsultationMessage, UUID> {

    List<ConsultationMessage> findByAppointmentIdOrderByCreatedAtAsc(UUID appointmentId);

    List<ConsultationMessage> findByAppointmentIdAndCreatedAtAfterOrderByCreatedAtAsc(UUID appointmentId, LocalDateTime after);
}
