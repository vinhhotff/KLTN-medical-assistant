package com.mediassist.service;

import com.mediassist.common.AppException;
import com.mediassist.dto.NotificationDto;
import com.mediassist.model.entity.Notification;
import com.mediassist.model.entity.User;
import com.mediassist.repository.NotificationRepository;
import com.mediassist.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class NotificationService {

    private static final Logger log = LoggerFactory.getLogger(NotificationService.class);

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;

    public NotificationService(NotificationRepository notificationRepository, UserRepository userRepository) {
        this.notificationRepository = notificationRepository;
        this.userRepository = userRepository;
    }

    @Async
    @Transactional
    public void sendNotification(UUID userId, String type, String title, String message, String metadataJson) {
        try {
            User user = userRepository.findById(userId).orElse(null);
            if (user == null) {
                log.warn("Cannot send notification: User {} not found", userId);
                return;
            }
            Notification n = new Notification(user, type, title, message);
            n.setMetadataJson(metadataJson);
            notificationRepository.save(n);
            log.info("🔔 [NOTIFICATION SENT] User: {}, Type: {}, Title: {}", user.getEmail(), type, title);
        } catch (Exception e) {
            log.error("Failed to send notification to user {}: {}", userId, e.getMessage());
        }
    }

    @Transactional(readOnly = true)
    public List<NotificationDto> getMyNotifications(UUID userId) {
        return notificationRepository.findByUserIdOrderByCreatedAtDesc(userId)
                .stream()
                .map(NotificationDto::fromEntity)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public long getUnreadCount(UUID userId) {
        return notificationRepository.countByUserIdAndReadFalse(userId);
    }

    @Transactional
    public NotificationDto markAsRead(UUID notificationId, UUID userId) {
        Notification n = notificationRepository.findByIdAndUserId(notificationId, userId)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Không tìm thấy thông báo"));
        n.setRead(true);
        Notification saved = notificationRepository.save(n);
        return NotificationDto.fromEntity(saved);
    }

    @Transactional
    public int markAllAsRead(UUID userId) {
        return notificationRepository.markAllAsReadByUserId(userId);
    }
}
