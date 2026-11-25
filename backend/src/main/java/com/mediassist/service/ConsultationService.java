package com.mediassist.service;

import com.mediassist.common.AppException;
import com.mediassist.dto.AppointmentDto;
import com.mediassist.dto.ConsultationMessageDto;
import com.mediassist.dto.ConsultationRoomDto;
import com.mediassist.dto.SendConsultationMessageRequest;
import com.mediassist.dto.SignalMessageDto;
import com.mediassist.model.entity.Appointment;
import com.mediassist.model.entity.AppointmentStatus;
import com.mediassist.model.entity.ConsultationMessage;
import com.mediassist.model.entity.ConsultationMessageType;
import com.mediassist.model.entity.ConsultationType;
import com.mediassist.model.entity.Role;
import com.mediassist.model.entity.User;
import com.mediassist.repository.AppointmentRepository;
import com.mediassist.repository.ConsultationMessageRepository;
import com.mediassist.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Deque;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;

@Service
public class ConsultationService {

    private static final Logger log = LoggerFactory.getLogger(ConsultationService.class);
    private static final int MAX_BUFFERED_SIGNALS_PER_ROOM = 200;

    private final AppointmentRepository appointmentRepository;
    private final ConsultationMessageRepository consultationMessageRepository;
    private final UserRepository userRepository;
    private final AppointmentService appointmentService;

    @Autowired(required = false)
    private SimpMessagingTemplate messagingTemplate;

    private final Map<UUID, Deque<SignalMessageDto>> roomSignals = new ConcurrentHashMap<>();
    private final Map<UUID, Map<UUID, ConsultationRoomDto.ParticipantDto>> roomParticipants = new ConcurrentHashMap<>();
    private final Map<UUID, AtomicLong> roomLastTimestamps = new ConcurrentHashMap<>();

    public ConsultationService(AppointmentRepository appointmentRepository,
                               ConsultationMessageRepository consultationMessageRepository,
                               UserRepository userRepository,
                               AppointmentService appointmentService) {
        this.appointmentRepository = appointmentRepository;
        this.consultationMessageRepository = consultationMessageRepository;
        this.userRepository = userRepository;
        this.appointmentService = appointmentService;
    }

    @Transactional(readOnly = true)
    public Appointment assertCanAccessRoom(UUID appointmentId, UUID userId, Role role) {
        if (appointmentId == null || userId == null) {
            throw new AppException(HttpStatus.UNAUTHORIZED, "UNAUTHORIZED", "Vui lòng đăng nhập để truy cập phòng khám.");
        }
        Appointment appt = appointmentRepository.findByIdWithUsers(appointmentId)
                .or(() -> appointmentRepository.findById(appointmentId))
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Không tìm thấy thông tin cuộc hẹn"));

        boolean isPatient = appt.getPatient() != null && userId.equals(appt.getPatient().getId());
        boolean isDoctor = appt.getDoctor() != null && userId.equals(appt.getDoctor().getId());
        boolean isAdmin = role == Role.ADMIN;

        if (!isPatient && !isDoctor && !isAdmin) {
            throw new AppException(HttpStatus.FORBIDDEN, "FORBIDDEN", "Bạn không có quyền truy cập phòng khám này");
        }
        return appt;
    }

    @Transactional(readOnly = true)
    public boolean canAccessRoom(UUID appointmentId, UUID userId, Role role) {
        try {
            assertCanAccessRoom(appointmentId, userId, role);
            return true;
        } catch (AppException ex) {
            return false;
        }
    }

    @Transactional(readOnly = true)
    public ConsultationRoomDto getRoomInfo(UUID appointmentId, UUID userId, Role role) {
        Appointment appt = assertCanAccessRoom(appointmentId, userId, role);
        return buildRoomDto(appt);
    }

    @Transactional
    public ConsultationRoomDto joinRoom(UUID appointmentId, UUID userId, Role role) {
        Appointment appt = assertCanAccessRoom(appointmentId, userId, role);

        if (appt.getStatus() == AppointmentStatus.CANCELLED || appt.getStatus() == AppointmentStatus.NO_SHOW) {
            throw new AppException(HttpStatus.BAD_REQUEST, "ROOM_CLOSED",
                    "Cuộc hẹn ở trạng thái " + appt.getStatus() + ", không thể tham gia phòng khám.");
        }

        boolean isPatient = appt.getPatient() != null && userId.equals(appt.getPatient().getId());
        if (appt.getConsultationType() == ConsultationType.ONLINE
                && isPatient
                && appt.getStatus() == AppointmentStatus.SCHEDULED) {
            appointmentService.checkInPatient(appointmentId, userId);
            appt = appointmentRepository.findByIdWithUsers(appointmentId)
                    .or(() -> appointmentRepository.findById(appointmentId))
                    .orElse(appt);
        }

        String name = resolveParticipantName(appt, userId, role);
        String resolvedRole = role != null ? role.name() : (isPatient ? Role.PATIENT.name() : Role.DOCTOR.name());
        addParticipant(appointmentId, userId, name, resolvedRole);

        SignalMessageDto joinSignal = new SignalMessageDto();
        joinSignal.setType("JOIN");
        broadcastAndBufferSignal(appt, userId, resolvedRole, name, joinSignal);

        return buildRoomDto(appt);
    }

    @Transactional(readOnly = true)
    public void leaveRoom(UUID appointmentId, UUID userId, Role role) {
        Appointment appt = assertCanAccessRoom(appointmentId, userId, role);
        removeParticipant(appointmentId, userId);

        String name = resolveParticipantName(appt, userId, role);
        String resolvedRole = role != null ? role.name() : Role.PATIENT.name();
        SignalMessageDto leaveSignal = new SignalMessageDto();
        leaveSignal.setType("LEAVE");
        broadcastAndBufferSignal(appt, userId, resolvedRole, name, leaveSignal);
    }

    @Transactional
    public AppointmentDto startConsultation(UUID appointmentId, UUID userId, Role role) {
        Appointment appt = assertCanAccessRoom(appointmentId, userId, role);

        boolean isDoctor = appt.getDoctor() != null && userId.equals(appt.getDoctor().getId());
        boolean isAdmin = role == Role.ADMIN;
        if (!isDoctor && !isAdmin) {
            throw new AppException(HttpStatus.FORBIDDEN, "FORBIDDEN", "Chỉ bác sĩ phụ trách hoặc quản trị viên mới có thể bắt đầu ca khám.");
        }

        AppointmentDto dto;
        if (appt.getStatus() == AppointmentStatus.IN_PROGRESS) {
            dto = AppointmentDto.fromEntity(appt);
        } else {
            dto = appointmentService.updateAppointmentStatus(appointmentId, userId, role, AppointmentStatus.IN_PROGRESS, null);
        }

        String name = resolveParticipantName(appt, userId, role);
        String resolvedRole = role != null ? role.name() : Role.DOCTOR.name();
        SignalMessageDto statusSignal = new SignalMessageDto();
        statusSignal.setType("ROOM_STATUS");
        statusSignal.setPayload(Map.of("status", AppointmentStatus.IN_PROGRESS.name()));
        broadcastAndBufferSignal(appt, userId, resolvedRole, name, statusSignal);

        return dto;
    }

    @Transactional(readOnly = true)
    public List<ConsultationMessageDto> getMessages(UUID appointmentId, UUID userId, Role role, LocalDateTime since) {
        assertCanAccessRoom(appointmentId, userId, role);
        List<ConsultationMessage> entities = since != null
                ? consultationMessageRepository.findByAppointmentIdAndCreatedAtAfterOrderByCreatedAtAsc(appointmentId, since)
                : consultationMessageRepository.findByAppointmentIdOrderByCreatedAtAsc(appointmentId);
        List<ConsultationMessageDto> result = new ArrayList<>(entities.size());
        for (ConsultationMessage entity : entities) {
            result.add(ConsultationMessageDto.fromEntity(entity));
        }
        return result;
    }

    @Transactional
    public ConsultationMessageDto sendMessage(UUID appointmentId, UUID userId, Role role, SendConsultationMessageRequest request) {
        Appointment appt = assertCanAccessRoom(appointmentId, userId, role);

        if (appt.getStatus() == AppointmentStatus.CANCELLED) {
            throw new AppException(HttpStatus.BAD_REQUEST, "ROOM_CLOSED", "Cuộc hẹn đã bị hủy, không thể gửi tin nhắn mới.");
        }

        String content = request != null && request.getContent() != null ? request.getContent().trim() : null;
        String attachmentUrl = request != null && request.getAttachmentUrl() != null ? request.getAttachmentUrl().trim() : null;
        if ((content == null || content.isEmpty()) && (attachmentUrl == null || attachmentUrl.isEmpty())) {
            throw new AppException(HttpStatus.BAD_REQUEST, "EMPTY_MESSAGE", "Nội dung tin nhắn hoặc tệp đính kèm không được để trống.");
        }

        ConsultationMessageType messageType = request != null && request.getMessageType() != null
                ? request.getMessageType()
                : ConsultationMessageType.TEXT;

        String senderName = resolveParticipantName(appt, userId, role);
        String senderRole = role != null ? role.name() : resolveRoleFromAppointment(appt, userId);

        ConsultationMessage entity = new ConsultationMessage();
        entity.setAppointment(appt);
        entity.setSenderId(userId);
        entity.setSenderRole(senderRole);
        entity.setSenderName(senderName);
        entity.setMessageType(messageType);
        entity.setContent(content);
        entity.setAttachmentUrl(attachmentUrl);

        ConsultationMessage saved = consultationMessageRepository.save(entity);
        ConsultationMessageDto dto = ConsultationMessageDto.fromEntity(saved);

        if (messagingTemplate != null) {
            try {
                messagingTemplate.convertAndSend("/topic/consultation." + appointmentId + ".messages", dto);
            } catch (Exception ex) {
                log.warn("⚠️ Failed to broadcast STOMP message for appointment {}: {}", appointmentId, ex.getMessage());
            }
        }

        return dto;
    }

    @Transactional(readOnly = true)
    public SignalMessageDto relaySignal(UUID appointmentId, UUID userId, Role role, SignalMessageDto signalRequest) {
        Appointment appt = assertCanAccessRoom(appointmentId, userId, role);

        if (appt.getStatus() == AppointmentStatus.CANCELLED || appt.getStatus() == AppointmentStatus.NO_SHOW) {
            throw new AppException(HttpStatus.BAD_REQUEST, "ROOM_CLOSED",
                    "Cuộc hẹn ở trạng thái " + appt.getStatus() + ", không thể truyền tín hiệu cuộc gọi.");
        }

        if (signalRequest == null || signalRequest.getType() == null || signalRequest.getType().isBlank()) {
            throw new AppException(HttpStatus.BAD_REQUEST, "INVALID_SIGNAL", "Loại tín hiệu WebRTC không được để trống.");
        }

        String name = resolveParticipantName(appt, userId, role);
        String resolvedRole = role != null ? role.name() : resolveRoleFromAppointment(appt, userId);
        String type = signalRequest.getType().trim().toUpperCase();

        if ("JOIN".equals(type)) {
            addParticipant(appointmentId, userId, name, resolvedRole);
        } else if ("LEAVE".equals(type) || "CALL_END".equals(type)) {
            removeParticipant(appointmentId, userId);
        }

        return broadcastAndBufferSignal(appt, userId, resolvedRole, name, signalRequest);
    }

    @Transactional(readOnly = true)
    public List<SignalMessageDto> getSignals(UUID appointmentId, UUID userId, Role role, Long sinceTimestamp, boolean includeSelf) {
        assertCanAccessRoom(appointmentId, userId, role);

        Deque<SignalMessageDto> queue = roomSignals.get(appointmentId);
        if (queue == null || queue.isEmpty()) {
            return List.of();
        }

        List<SignalMessageDto> result = new ArrayList<>();
        synchronized (queue) {
            for (SignalMessageDto sig : queue) {
                if (sinceTimestamp != null && sig.getTimestamp() != null && sig.getTimestamp() <= sinceTimestamp) {
                    continue;
                }
                if (!includeSelf && userId.equals(sig.getSenderId())) {
                    continue;
                }
                result.add(sig);
            }
        }
        return result;
    }

    private SignalMessageDto broadcastAndBufferSignal(Appointment appt, UUID userId, String senderRole,
                                                      String senderName, SignalMessageDto source) {
        UUID appointmentId = appt.getId();
        SignalMessageDto stamped = new SignalMessageDto(
                UUID.randomUUID().toString(),
                appointmentId,
                source.getType() != null ? source.getType().trim().toUpperCase() : "SIGNAL",
                userId,
                senderRole,
                senderName,
                source.getSdp(),
                source.getCandidate(),
                source.getPayload(),
                source.getAudioEnabled(),
                source.getVideoEnabled(),
                nextMonotonicTimestamp(appointmentId)
        );

        Deque<SignalMessageDto> queue = roomSignals.computeIfAbsent(appointmentId, id -> new ArrayDeque<>());
        synchronized (queue) {
            queue.addLast(stamped);
            while (queue.size() > MAX_BUFFERED_SIGNALS_PER_ROOM) {
                queue.removeFirst();
            }
        }

        if (messagingTemplate != null) {
            try {
                messagingTemplate.convertAndSend("/topic/consultation." + appointmentId + ".signals", stamped);
            } catch (Exception ex) {
                log.warn("⚠️ Failed to broadcast STOMP signal for appointment {}: {}", appointmentId, ex.getMessage());
            }
        }

        return stamped;
    }

    private long nextMonotonicTimestamp(UUID appointmentId) {
        AtomicLong counter = roomLastTimestamps.computeIfAbsent(appointmentId, id -> new AtomicLong(0L));
        long now = System.currentTimeMillis();
        return counter.updateAndGet(prev -> Math.max(now, prev + 1));
    }

    private void addParticipant(UUID appointmentId, UUID userId, String fullName, String role) {
        roomParticipants
                .computeIfAbsent(appointmentId, id -> new ConcurrentHashMap<>())
                .put(userId, new ConsultationRoomDto.ParticipantDto(userId, fullName, role, LocalDateTime.now()));
    }

    private void removeParticipant(UUID appointmentId, UUID userId) {
        Map<UUID, ConsultationRoomDto.ParticipantDto> participants = roomParticipants.get(appointmentId);
        if (participants != null) {
            participants.remove(userId);
        }
    }

    private ConsultationRoomDto buildRoomDto(Appointment appt) {
        ConsultationRoomDto dto = new ConsultationRoomDto();
        dto.setAppointmentId(appt.getId());
        dto.setAppointmentCode(appt.getAppointmentCode());
        dto.setConsultationType(appt.getConsultationType());
        dto.setStatus(appt.getStatus());
        dto.setMeetingRoomCode(appt.getMeetingRoomCode());
        dto.setMeetingUrl(appt.getMeetingUrl() != null ? appt.getMeetingUrl()
                : (appt.getConsultationType() == ConsultationType.ONLINE && appt.getId() != null ? "/consultation/" + appt.getId() : null));
        if (appt.getPatient() != null) {
            dto.setPatientId(appt.getPatient().getId());
            dto.setPatientName(appt.getPatient().getFullName());
        }
        if (appt.getDoctor() != null) {
            dto.setDoctorId(appt.getDoctor().getId());
            dto.setDoctorName(appt.getDoctor().getFullName());
        }
        dto.setScheduledStart(appt.getScheduledStart());
        dto.setScheduledEnd(appt.getScheduledEnd());
        dto.setCheckedInAt(appt.getCheckedInAt());
        boolean canJoin = appt.getConsultationType() == ConsultationType.ONLINE
                && appt.getStatus() != AppointmentStatus.CANCELLED
                && appt.getStatus() != AppointmentStatus.NO_SHOW;
        dto.setCanJoinCall(canJoin);
        dto.setWsEndpoint("/ws");
        dto.setSockJsEndpoint("/ws-sockjs");
        dto.setIceServers(List.of(
                new ConsultationRoomDto.IceServerDto(List.of(
                        "stun:stun.l.google.com:19302",
                        "stun:stun1.l.google.com:19302"
                ))
        ));

        Map<UUID, ConsultationRoomDto.ParticipantDto> participants = roomParticipants.get(appt.getId());
        dto.setActiveParticipants(participants != null ? new ArrayList<>(participants.values()) : List.of());
        return dto;
    }

    private String resolveParticipantName(Appointment appt, UUID userId, Role role) {
        if (appt.getPatient() != null && userId.equals(appt.getPatient().getId()) && appt.getPatient().getFullName() != null) {
            return appt.getPatient().getFullName();
        }
        if (appt.getDoctor() != null && userId.equals(appt.getDoctor().getId()) && appt.getDoctor().getFullName() != null) {
            return appt.getDoctor().getFullName();
        }
        return userRepository.findById(userId)
                .map(User::getFullName)
                .orElse(role == Role.ADMIN ? "Quản trị viên" : "Người dùng");
    }

    private String resolveRoleFromAppointment(Appointment appt, UUID userId) {
        if (appt.getDoctor() != null && userId.equals(appt.getDoctor().getId())) {
            return Role.DOCTOR.name();
        }
        if (appt.getPatient() != null && userId.equals(appt.getPatient().getId())) {
            return Role.PATIENT.name();
        }
        return Role.ADMIN.name();
    }
}
