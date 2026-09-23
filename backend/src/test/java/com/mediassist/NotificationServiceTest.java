package com.mediassist;

import com.mediassist.dto.NotificationDto;
import com.mediassist.model.entity.Notification;
import com.mediassist.model.entity.Role;
import com.mediassist.model.entity.User;
import com.mediassist.model.entity.UserStatus;
import com.mediassist.repository.NotificationRepository;
import com.mediassist.repository.UserRepository;
import com.mediassist.service.NotificationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class NotificationServiceTest {

    @Mock
    private NotificationRepository notificationRepository;

    @Mock
    private UserRepository userRepository;

    private NotificationService notificationService;
    private User testUser;
    private UUID userId;

    @BeforeEach
    void setUp() {
        notificationService = new NotificationService(notificationRepository, userRepository);
        userId = UUID.randomUUID();
        testUser = User.builder()
                .id(userId)
                .email("doctor@mediassist.local")
                .fullName("BS. Nguyễn Văn An")
                .role(Role.DOCTOR)
                .status(UserStatus.ACTIVE)
                .build();
    }

    @Test
    void testSendNotification_Success() {
        when(userRepository.findById(userId)).thenReturn(Optional.of(testUser));
        when(notificationRepository.save(any(Notification.class))).thenAnswer(i -> i.getArgument(0));

        notificationService.sendNotification(userId, "VETTING_APPROVED", "Duyệt hồ sơ", "Hồ sơ của bạn đã được duyệt", null);

        verify(notificationRepository, times(1)).save(any(Notification.class));
    }

    @Test
    void testGetMyNotifications_ReturnsList() {
        Notification n = new Notification(testUser, "SYSTEM", "Thông báo hệ thống", "Nội dung thông báo");
        when(notificationRepository.findByUserIdOrderByCreatedAtDesc(userId)).thenReturn(List.of(n));

        List<NotificationDto> dtos = notificationService.getMyNotifications(userId);

        assertNotNull(dtos);
        assertEquals(1, dtos.size());
        assertEquals("SYSTEM", dtos.get(0).getType());
        assertEquals("Thông báo hệ thống", dtos.get(0).getTitle());
    }

    @Test
    void testMarkAsRead_Success() {
        UUID notifId = UUID.randomUUID();
        Notification n = new Notification(testUser, "SYSTEM", "Title", "Msg");
        n.setId(notifId);
        n.setRead(false);

        when(notificationRepository.findByIdAndUserId(notifId, userId)).thenReturn(Optional.of(n));
        when(notificationRepository.save(any(Notification.class))).thenAnswer(i -> i.getArgument(0));

        NotificationDto dto = notificationService.markAsRead(notifId, userId);

        assertNotNull(dto);
        assertTrue(dto.isRead());
    }

    @Test
    void testGetUnreadCount_ReturnsCount() {
        when(notificationRepository.countByUserIdAndReadFalse(userId)).thenReturn(3L);

        long count = notificationService.getUnreadCount(userId);

        assertEquals(3L, count);
    }
}
