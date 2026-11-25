package com.mediassist.controller;

import com.mediassist.common.ApiResponse;
import com.mediassist.common.AppException;
import com.mediassist.dto.AppointmentDto;
import com.mediassist.dto.ConsultationMessageDto;
import com.mediassist.dto.ConsultationRoomDto;
import com.mediassist.dto.SendConsultationMessageRequest;
import com.mediassist.dto.SignalMessageDto;
import com.mediassist.security.UserPrincipal;
import com.mediassist.service.ConsultationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageExceptionHandler;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/consultations")
@Tag(name = "Telehealth Consultations", description = "Online consultation rooms, real-time chat persistence, and WebRTC signaling (WS + REST fallback)")
public class ConsultationController {

    private static final Logger log = LoggerFactory.getLogger(ConsultationController.class);

    private final ConsultationService consultationService;

    public ConsultationController(ConsultationService consultationService) {
        this.consultationService = consultationService;
    }

    @GetMapping("/{appointmentId}/room")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get telehealth consultation room metadata, ICE servers, and active participants")
    public ResponseEntity<ApiResponse<ConsultationRoomDto>> getRoomInfo(
            @PathVariable("appointmentId") UUID appointmentId,
            @AuthenticationPrincipal UserPrincipal principal) {
        ConsultationRoomDto room = consultationService.getRoomInfo(appointmentId, principal.getId(), principal.getRole());
        return ResponseEntity.ok(ApiResponse.success(room));
    }

    @PostMapping("/{appointmentId}/join")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Join consultation room (auto-checks in ONLINE patient if SCHEDULED and broadcasts JOIN)")
    public ResponseEntity<ApiResponse<ConsultationRoomDto>> joinRoom(
            @PathVariable("appointmentId") UUID appointmentId,
            @AuthenticationPrincipal UserPrincipal principal) {
        ConsultationRoomDto room = consultationService.joinRoom(appointmentId, principal.getId(), principal.getRole());
        return ResponseEntity.ok(ApiResponse.success(room));
    }

    @PostMapping("/{appointmentId}/leave")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Leave consultation room and broadcast LEAVE signal")
    public ResponseEntity<ApiResponse<Void>> leaveRoom(
            @PathVariable("appointmentId") UUID appointmentId,
            @AuthenticationPrincipal UserPrincipal principal) {
        consultationService.leaveRoom(appointmentId, principal.getId(), principal.getRole());
        return ResponseEntity.ok(ApiResponse.success(null, "Đã rời phòng khám."));
    }

    @PostMapping("/{appointmentId}/start")
    @PreAuthorize("hasAnyRole('DOCTOR', 'ADMIN')")
    @Operation(summary = "Doctor/Admin starts consultation (transitions SCHEDULED/CHECKED_IN -> IN_PROGRESS)")
    public ResponseEntity<ApiResponse<AppointmentDto>> startConsultation(
            @PathVariable("appointmentId") UUID appointmentId,
            @AuthenticationPrincipal UserPrincipal principal) {
        AppointmentDto dto = consultationService.startConsultation(appointmentId, principal.getId(), principal.getRole());
        return ResponseEntity.ok(ApiResponse.success(dto));
    }

    @GetMapping("/{appointmentId}/messages")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get persistent chat history for an appointment consultation room")
    public ResponseEntity<ApiResponse<List<ConsultationMessageDto>>> getMessages(
            @PathVariable("appointmentId") UUID appointmentId,
            @RequestParam(value = "since", required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime since,
            @AuthenticationPrincipal UserPrincipal principal) {
        List<ConsultationMessageDto> messages = consultationService.getMessages(
                appointmentId, principal.getId(), principal.getRole(), since);
        return ResponseEntity.ok(ApiResponse.success(messages));
    }

    @PostMapping("/{appointmentId}/messages")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Send a persistent chat/image/prescription-note message (REST + WS broadcast)")
    public ResponseEntity<ApiResponse<ConsultationMessageDto>> sendMessage(
            @PathVariable("appointmentId") UUID appointmentId,
            @Valid @RequestBody SendConsultationMessageRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {
        ConsultationMessageDto dto = consultationService.sendMessage(
                appointmentId, principal.getId(), principal.getRole(), request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(dto));
    }

    @PostMapping("/{appointmentId}/signal")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "REST fallback to send a WebRTC SDP/ICE/media signal and broadcast over STOMP")
    public ResponseEntity<ApiResponse<SignalMessageDto>> sendSignal(
            @PathVariable("appointmentId") UUID appointmentId,
            @RequestBody SignalMessageDto request,
            @AuthenticationPrincipal UserPrincipal principal) {
        SignalMessageDto signal = consultationService.relaySignal(
                appointmentId, principal.getId(), principal.getRole(), request);
        return ResponseEntity.ok(ApiResponse.success(signal));
    }

    @GetMapping("/{appointmentId}/signals")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "REST fallback polling for WebRTC signals since a given epoch timestamp")
    public ResponseEntity<ApiResponse<List<SignalMessageDto>>> getSignals(
            @PathVariable("appointmentId") UUID appointmentId,
            @RequestParam(value = "since", required = false) Long since,
            @RequestParam(value = "includeSelf", defaultValue = "false") boolean includeSelf,
            @AuthenticationPrincipal UserPrincipal principal) {
        List<SignalMessageDto> signals = consultationService.getSignals(
                appointmentId, principal.getId(), principal.getRole(), since, includeSelf);
        return ResponseEntity.ok(ApiResponse.success(signals));
    }

    @MessageMapping("/consultation/{appointmentId}/chat")
    public void handleStompChat(
            @DestinationVariable("appointmentId") UUID appointmentId,
            @Payload SendConsultationMessageRequest request,
            Principal principal) {
        UserPrincipal user = extractUserPrincipal(principal);
        consultationService.sendMessage(appointmentId, user.getId(), user.getRole(), request);
    }

    @MessageMapping("/consultation/{appointmentId}/signal")
    public void handleStompSignal(
            @DestinationVariable("appointmentId") UUID appointmentId,
            @Payload SignalMessageDto request,
            Principal principal) {
        UserPrincipal user = extractUserPrincipal(principal);
        consultationService.relaySignal(appointmentId, user.getId(), user.getRole(), request);
    }

    @MessageExceptionHandler
    public void handleStompException(Throwable ex) {
        log.warn("⚠️ WebSocket STOMP handler error: {}", ex.getMessage());
    }

    private UserPrincipal extractUserPrincipal(Principal principal) {
        if (principal instanceof Authentication auth && auth.getPrincipal() instanceof UserPrincipal up) {
            return up;
        }
        if (principal instanceof UserPrincipal up) {
            return up;
        }
        throw new AppException(HttpStatus.UNAUTHORIZED, "UNAUTHORIZED", "Phiên WebSocket chưa được xác thực.");
    }
}
