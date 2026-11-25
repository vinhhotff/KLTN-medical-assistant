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
import com.mediassist.model.entity.UserStatus;
import com.mediassist.repository.AppointmentRepository;
import com.mediassist.repository.ConsultationMessageRepository;
import com.mediassist.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ConsultationServiceTest {

    @Mock
    private AppointmentRepository appointmentRepository;

    @Mock
    private ConsultationMessageRepository consultationMessageRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private AppointmentService appointmentService;

    @Mock
    private SimpMessagingTemplate messagingTemplate;

    private ConsultationService consultationService;

    private UUID appointmentId;
    private UUID patientId;
    private UUID doctorId;
    private UUID adminId;
    private UUID strangerId;
    private User patientUser;
    private User doctorUser;
    private Appointment onlineAppointment;

    @BeforeEach
    void setUp() {
        consultationService = new ConsultationService(
                appointmentRepository,
                consultationMessageRepository,
                userRepository,
                appointmentService
        );
        ReflectionTestUtils.setField(consultationService, "messagingTemplate", messagingTemplate);

        appointmentId = UUID.randomUUID();
        patientId = UUID.randomUUID();
        doctorId = UUID.randomUUID();
        adminId = UUID.randomUUID();
        strangerId = UUID.randomUUID();

        patientUser = User.builder()
                .id(patientId)
                .email("patient@mediassist.local")
                .fullName("Nguyễn Thị Mai")
                .role(Role.PATIENT)
                .status(UserStatus.ACTIVE)
                .build();

        doctorUser = User.builder()
                .id(doctorId)
                .email("doctor@mediassist.local")
                .fullName("BS. Lê Minh Tuấn")
                .role(Role.DOCTOR)
                .status(UserStatus.ACTIVE)
                .build();

        onlineAppointment = Appointment.builder()
                .id(appointmentId)
                .appointmentCode("AP-20261125-ONL001")
                .patient(patientUser)
                .doctor(doctorUser)
                .scheduledStart(LocalDateTime.now().plusHours(1))
                .scheduledEnd(LocalDateTime.now().plusHours(1).plusMinutes(30))
                .status(AppointmentStatus.SCHEDULED)
                .consultationType(ConsultationType.ONLINE)
                .meetingRoomCode("ROOM-20261125-XYZ789")
                .meetingUrl("/consultation/" + appointmentId)
                .build();
    }

    @Test
    @DisplayName("getRoomInfo: patient, assigned doctor, and admin can access; third party gets 403")
    void getRoomInfo_AuthorizationEnforced() {
        when(appointmentRepository.findByIdWithUsers(appointmentId)).thenReturn(Optional.of(onlineAppointment));

        ConsultationRoomDto patientView = consultationService.getRoomInfo(appointmentId, patientId, Role.PATIENT);
        assertEquals(appointmentId, patientView.getAppointmentId());
        assertEquals("ROOM-20261125-XYZ789", patientView.getMeetingRoomCode());
        assertTrue(patientView.isCanJoinCall());
        assertEquals("/ws", patientView.getWsEndpoint());
        assertFalse(patientView.getIceServers().isEmpty());

        ConsultationRoomDto doctorView = consultationService.getRoomInfo(appointmentId, doctorId, Role.DOCTOR);
        assertEquals(ConsultationType.ONLINE, doctorView.getConsultationType());

        ConsultationRoomDto adminView = consultationService.getRoomInfo(appointmentId, adminId, Role.ADMIN);
        assertEquals("AP-20261125-ONL001", adminView.getAppointmentCode());

        AppException ex = assertThrows(AppException.class,
                () -> consultationService.getRoomInfo(appointmentId, strangerId, Role.PATIENT));
        assertEquals(HttpStatus.FORBIDDEN, ex.getStatus());
        assertEquals("FORBIDDEN", ex.getCode());
    }

    @Test
    @DisplayName("joinRoom: online SCHEDULED patient auto-checks in, records presence, and broadcasts JOIN")
    void joinRoom_OnlinePatient_AutoChecksInAndBroadcasts() {
        when(appointmentRepository.findByIdWithUsers(appointmentId)).thenReturn(Optional.of(onlineAppointment));

        ConsultationRoomDto room = consultationService.joinRoom(appointmentId, patientId, Role.PATIENT);

        verify(appointmentService).checkInPatient(appointmentId, patientId);
        verify(messagingTemplate).convertAndSend(eq("/topic/consultation." + appointmentId + ".signals"), any(SignalMessageDto.class));
        assertEquals(1, room.getActiveParticipants().size());
        assertEquals(patientId, room.getActiveParticipants().get(0).getUserId());
    }

    @Test
    @DisplayName("joinRoom: cancelled appointment rejects with ROOM_CLOSED")
    void joinRoom_CancelledAppointment_ThrowsRoomClosed() {
        onlineAppointment.setStatus(AppointmentStatus.CANCELLED);
        when(appointmentRepository.findByIdWithUsers(appointmentId)).thenReturn(Optional.of(onlineAppointment));

        AppException ex = assertThrows(AppException.class,
                () -> consultationService.joinRoom(appointmentId, patientId, Role.PATIENT));
        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatus());
        assertEquals("ROOM_CLOSED", ex.getCode());
    }

    @Test
    @DisplayName("startConsultation: doctor transitions to IN_PROGRESS and broadcasts ROOM_STATUS; patient forbidden")
    void startConsultation_DoctorAllowed_PatientForbidden() {
        when(appointmentRepository.findByIdWithUsers(appointmentId)).thenReturn(Optional.of(onlineAppointment));

        AppException patientEx = assertThrows(AppException.class,
                () -> consultationService.startConsultation(appointmentId, patientId, Role.PATIENT));
        assertEquals(HttpStatus.FORBIDDEN, patientEx.getStatus());

        AppointmentDto startedDto = AppointmentDto.fromEntity(onlineAppointment);
        startedDto.setStatus(AppointmentStatus.IN_PROGRESS);
        when(appointmentService.updateAppointmentStatus(appointmentId, doctorId, Role.DOCTOR, AppointmentStatus.IN_PROGRESS, null))
                .thenReturn(startedDto);

        AppointmentDto result = consultationService.startConsultation(appointmentId, doctorId, Role.DOCTOR);
        assertEquals(AppointmentStatus.IN_PROGRESS, result.getStatus());
        verify(messagingTemplate).convertAndSend(eq("/topic/consultation." + appointmentId + ".signals"), any(SignalMessageDto.class));
    }

    @Test
    @DisplayName("sendMessage: persists TEXT/IMAGE message and broadcasts to STOMP topic")
    void sendMessage_PersistsAndBroadcasts() {
        when(appointmentRepository.findByIdWithUsers(appointmentId)).thenReturn(Optional.of(onlineAppointment));
        when(consultationMessageRepository.save(any(ConsultationMessage.class))).thenAnswer(inv -> {
            ConsultationMessage msg = inv.getArgument(0);
            msg.setId(UUID.randomUUID());
            msg.setCreatedAt(LocalDateTime.now());
            return msg;
        });

        SendConsultationMessageRequest req = new SendConsultationMessageRequest(
                ConsultationMessageType.IMAGE,
                "Kết quả xét nghiệm máu mới nhất",
                "https://storage.example.com/lab-report.png"
        );

        ConsultationMessageDto dto = consultationService.sendMessage(appointmentId, patientId, Role.PATIENT, req);

        assertNotNull(dto.getId());
        assertEquals(appointmentId, dto.getAppointmentId());
        assertEquals(patientId, dto.getSenderId());
        assertEquals("PATIENT", dto.getSenderRole());
        assertEquals("Nguyễn Thị Mai", dto.getSenderName());
        assertEquals(ConsultationMessageType.IMAGE, dto.getMessageType());
        assertEquals("https://storage.example.com/lab-report.png", dto.getAttachmentUrl());
        verify(consultationMessageRepository).save(any(ConsultationMessage.class));
        verify(messagingTemplate).convertAndSend(eq("/topic/consultation." + appointmentId + ".messages"), eq(dto));
    }

    @Test
    @DisplayName("sendMessage: empty content and empty attachment throws EMPTY_MESSAGE")
    void sendMessage_Empty_ThrowsBadRequest() {
        when(appointmentRepository.findByIdWithUsers(appointmentId)).thenReturn(Optional.of(onlineAppointment));

        SendConsultationMessageRequest req = new SendConsultationMessageRequest(ConsultationMessageType.TEXT, "   ", null);
        AppException ex = assertThrows(AppException.class,
                () -> consultationService.sendMessage(appointmentId, patientId, Role.PATIENT, req));
        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatus());
        assertEquals("EMPTY_MESSAGE", ex.getCode());
        verify(consultationMessageRepository, never()).save(any());
    }

    @Test
    @DisplayName("getMessages: returns chronological history for authorized user and blocks stranger")
    void getMessages_ReturnsHistoryAndEnforcesAuth() {
        ConsultationMessage msg1 = new ConsultationMessage();
        msg1.setId(UUID.randomUUID());
        msg1.setAppointment(onlineAppointment);
        msg1.setSenderId(patientId);
        msg1.setSenderRole("PATIENT");
        msg1.setSenderName("Nguyễn Thị Mai");
        msg1.setMessageType(ConsultationMessageType.TEXT);
        msg1.setContent("Em bị đau đầu từ sáng ạ");
        msg1.setCreatedAt(LocalDateTime.now().minusMinutes(5));

        when(appointmentRepository.findByIdWithUsers(appointmentId)).thenReturn(Optional.of(onlineAppointment));
        when(consultationMessageRepository.findByAppointmentIdOrderByCreatedAtAsc(appointmentId)).thenReturn(List.of(msg1));

        List<ConsultationMessageDto> history = consultationService.getMessages(appointmentId, doctorId, Role.DOCTOR, null);
        assertEquals(1, history.size());
        assertEquals("Em bị đau đầu từ sáng ạ", history.get(0).getContent());

        assertThrows(AppException.class,
                () -> consultationService.getMessages(appointmentId, strangerId, Role.PATIENT, null));
    }

    @Test
    @DisplayName("relaySignal & getSignals: REST fallback buffers signals with monotonic timestamps and excludes self by default")
    void relaySignalAndPoll_WorksForWebRtcFallback() {
        when(appointmentRepository.findByIdWithUsers(appointmentId)).thenReturn(Optional.of(onlineAppointment));

        SignalMessageDto offer = new SignalMessageDto();
        offer.setType("OFFER");
        offer.setSdp("v=0\r\no=- 123 2 IN IP4 127.0.0.1...");

        SignalMessageDto relayedOffer = consultationService.relaySignal(appointmentId, doctorId, Role.DOCTOR, offer);
        assertNotNull(relayedOffer.getId());
        assertNotNull(relayedOffer.getTimestamp());
        assertEquals("OFFER", relayedOffer.getType());
        assertEquals(doctorId, relayedOffer.getSenderId());

        SignalMessageDto ice = new SignalMessageDto();
        ice.setType("ICE_CANDIDATE");
        ice.setCandidate(java.util.Map.of("candidate", "candidate:1 1 UDP 2122252543 192.168.1.2 50000 typ host"));
        SignalMessageDto relayedIce = consultationService.relaySignal(appointmentId, doctorId, Role.DOCTOR, ice);
        assertTrue(relayedIce.getTimestamp() > relayedOffer.getTimestamp());

        // Doctor polling with includeSelf=false sees 0 signals
        List<SignalMessageDto> doctorPoll = consultationService.getSignals(appointmentId, doctorId, Role.DOCTOR, null, false);
        assertTrue(doctorPoll.isEmpty());

        // Patient polling sees both OFFER and ICE_CANDIDATE
        List<SignalMessageDto> patientPoll1 = consultationService.getSignals(appointmentId, patientId, Role.PATIENT, null, false);
        assertEquals(2, patientPoll1.size());
        assertEquals("OFFER", patientPoll1.get(0).getType());
        assertEquals("ICE_CANDIDATE", patientPoll1.get(1).getType());

        // Incremental polling since first signal's timestamp returns only ICE_CANDIDATE
        List<SignalMessageDto> patientPoll2 = consultationService.getSignals(
                appointmentId, patientId, Role.PATIENT, relayedOffer.getTimestamp(), false);
        assertEquals(1, patientPoll2.size());
        assertEquals("ICE_CANDIDATE", patientPoll2.get(0).getType());
    }
}
