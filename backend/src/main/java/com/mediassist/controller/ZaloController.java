package com.mediassist.controller;

import com.mediassist.common.ApiResponse;
import com.mediassist.common.AppException;
import com.mediassist.model.entity.User;
import com.mediassist.repository.UserRepository;
import com.mediassist.service.ZaloReminderService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/zalo")
@Tag(name = "Zalo OA Clinical Reminders", description = "Endpoints for linking patient Zalo OA and dispatching appointment & medication reminders")
public class ZaloController {

    private static final Logger log = LoggerFactory.getLogger(ZaloController.class);

    private final ZaloReminderService zaloReminderService;
    private final UserRepository userRepository;

    public ZaloController(ZaloReminderService zaloReminderService, UserRepository userRepository) {
        this.zaloReminderService = zaloReminderService;
        this.userRepository = userRepository;
    }

    private User requireCurrentUser(Authentication auth) {
        if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getName())) {
            throw new AppException(HttpStatus.UNAUTHORIZED, "UNAUTHORIZED", "Vui lòng đăng nhập để sử dụng tính năng Zalo.");
        }
        return userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "USER_NOT_FOUND", "Không tìm thấy tài khoản người dùng."));
    }

    @GetMapping("/status")
    @Operation(summary = "Get current user's Zalo OA link status and gateway mode")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getStatus(Authentication auth) {
        User user = requireCurrentUser(auth);
        return ResponseEntity.ok(ApiResponse.success(zaloReminderService.getStatus(user)));
    }

    @PostMapping("/link")
    @Operation(summary = "Link patient account with Zalo User ID for appointment & medication reminders")
    public ResponseEntity<ApiResponse<Map<String, Object>>> linkZalo(
            @RequestBody(required = false) Map<String, String> body,
            Authentication auth) {
        User user = requireCurrentUser(auth);
        String zaloUserId = body != null ? body.get("zaloUserId") : null;
        return ResponseEntity.ok(ApiResponse.success(zaloReminderService.linkZalo(user, zaloUserId)));
    }

    @PostMapping("/unlink")
    @Operation(summary = "Unlink patient account from Zalo OA")
    public ResponseEntity<ApiResponse<Map<String, Object>>> unlinkZalo(Authentication auth) {
        User user = requireCurrentUser(auth);
        return ResponseEntity.ok(ApiResponse.success(zaloReminderService.unlinkZalo(user)));
    }

    @PostMapping("/appointments/{appointmentId}/remind")
    @Operation(summary = "Send Zalo appointment reminder immediately")
    public ResponseEntity<ApiResponse<Map<String, Object>>> sendAppointmentReminder(
            @PathVariable UUID appointmentId,
            Authentication auth) {
        User user = requireCurrentUser(auth);
        return ResponseEntity.ok(ApiResponse.success(zaloReminderService.sendAppointmentReminderForUser(user, appointmentId)));
    }

    @PostMapping("/appointments/{appointmentId}/remind-medication")
    @Operation(summary = "Send Zalo medication adherence reminder from doctor prescription")
    public ResponseEntity<ApiResponse<Map<String, Object>>> sendMedicationReminder(
            @PathVariable UUID appointmentId,
            Authentication auth) {
        User user = requireCurrentUser(auth);
        return ResponseEntity.ok(ApiResponse.success(zaloReminderService.sendMedicationReminderForUser(user, appointmentId)));
    }

    @PostMapping("/webhook")
    @Operation(summary = "Public Zalo OA Webhook receiver (follow / user_send_text events)")
    public ResponseEntity<Map<String, Object>> receiveWebhook(@RequestBody(required = false) Map<String, Object> payload) {
        if (payload != null) {
            String eventName = String.valueOf(payload.getOrDefault("event_name", ""));
            log.info("📩 [ZALO WEBHOOK] Received event_name={}", eventName);
            if ("user_send_text".equals(eventName)) {
                Object senderObj = payload.get("sender");
                Object msgObj = payload.get("message");
                if (senderObj instanceof Map<?, ?> sender && msgObj instanceof Map<?, ?> msg) {
                    String zaloId = String.valueOf(sender.get("id"));
                    String text = String.valueOf(msg.get("text")).trim();
                    if (text.toUpperCase().startsWith("LIENKET ")) {
                        String email = text.substring(8).trim().toLowerCase();
                        userRepository.findByEmail(email).ifPresent(u -> zaloReminderService.linkZalo(u, zaloId));
                    }
                }
            }
        }
        return ResponseEntity.ok(Map.of("error", 0, "message", "ok"));
    }
}
