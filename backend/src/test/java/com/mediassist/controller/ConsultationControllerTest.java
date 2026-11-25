package com.mediassist.controller;

import com.mediassist.common.ApiResponse;
import com.mediassist.dto.AppointmentDto;
import com.mediassist.dto.ConsultationMessageDto;
import com.mediassist.dto.ConsultationRoomDto;
import com.mediassist.dto.SendConsultationMessageRequest;
import com.mediassist.dto.SignalMessageDto;
import com.mediassist.model.entity.AppointmentStatus;
import com.mediassist.model.entity.ConsultationMessageType;
import com.mediassist.model.entity.ConsultationType;
import com.mediassist.model.entity.Role;
import com.mediassist.model.entity.User;
import com.mediassist.model.entity.UserStatus;
import com.mediassist.security.UserPrincipal;
import com.mediassist.service.ConsultationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ConsultationControllerTest {

    @Mock
    private ConsultationService consultationService;

    private ConsultationController controller;

    private UUID appointmentId;
    private UUID patientId;
    private UUID doctorId;
    private UserPrincipal patientPrincipal;
    private UserPrincipal doctorPrincipal;

    @BeforeEach
    void setUp() {
        controller = new ConsultationController(consultationService);
        appointmentId = UUID.randomUUID();
        patientId = UUID.randomUUID();
        doctorId = UUID.randomUUID();

        User patient = User.builder()
                .id(patientId)
                .email("patient@mediassist.local")
                .fullName("Patient Test")
                .role(Role.PATIENT)
                .status(UserStatus.ACTIVE)
                .build();
        User doctor = User.builder()
                .id(doctorId)
                .email("doctor@mediassist.local")
                .fullName("Doctor Test")
                .role(Role.DOCTOR)
                .status(UserStatus.ACTIVE)
                .build();

        patientPrincipal = UserPrincipal.create(patient);
        doctorPrincipal = UserPrincipal.create(doctor);
    }

    @Test
    @DisplayName("GET /api/v1/consultations/{id}/room delegates to ConsultationService")
    void getRoomInfo_ReturnsOk() {
        ConsultationRoomDto roomDto = new ConsultationRoomDto();
        roomDto.setAppointmentId(appointmentId);
        roomDto.setConsultationType(ConsultationType.ONLINE);
        roomDto.setMeetingRoomCode("ROOM-TEST-01");
        when(consultationService.getRoomInfo(appointmentId, patientId, Role.PATIENT)).thenReturn(roomDto);

        ResponseEntity<ApiResponse<ConsultationRoomDto>> resp = controller.getRoomInfo(appointmentId, patientPrincipal);

        assertEquals(HttpStatus.OK, resp.getStatusCode());
        assertNotNull(resp.getBody());
        assertTrue(resp.getBody().isSuccess());
        assertEquals("ROOM-TEST-01", resp.getBody().getData().getMeetingRoomCode());
    }

    @Test
    @DisplayName("POST /api/v1/consultations/{id}/join & /start & /leave delegate properly")
    void joinStartLeave_DelegateToService() {
        ConsultationRoomDto roomDto = new ConsultationRoomDto();
        roomDto.setAppointmentId(appointmentId);
        when(consultationService.joinRoom(appointmentId, patientId, Role.PATIENT)).thenReturn(roomDto);

        ResponseEntity<ApiResponse<ConsultationRoomDto>> joinResp = controller.joinRoom(appointmentId, patientPrincipal);
        assertEquals(HttpStatus.OK, joinResp.getStatusCode());
        verify(consultationService).joinRoom(appointmentId, patientId, Role.PATIENT);

        AppointmentDto started = new AppointmentDto();
        started.setId(appointmentId);
        started.setStatus(AppointmentStatus.IN_PROGRESS);
        when(consultationService.startConsultation(appointmentId, doctorId, Role.DOCTOR)).thenReturn(started);

        ResponseEntity<ApiResponse<AppointmentDto>> startResp = controller.startConsultation(appointmentId, doctorPrincipal);
        assertEquals(HttpStatus.OK, startResp.getStatusCode());
        assertEquals(AppointmentStatus.IN_PROGRESS, startResp.getBody().getData().getStatus());

        ResponseEntity<ApiResponse<Void>> leaveResp = controller.leaveRoom(appointmentId, patientPrincipal);
        assertEquals(HttpStatus.OK, leaveResp.getStatusCode());
        verify(consultationService).leaveRoom(appointmentId, patientId, Role.PATIENT);
    }

    @Test
    @DisplayName("REST messages GET/POST delegate to ConsultationService")
    void messagesRestEndpoints_Delegate() {
        SendConsultationMessageRequest req = new SendConsultationMessageRequest(
                ConsultationMessageType.TEXT, "Chào bác sĩ", null);
        ConsultationMessageDto created = new ConsultationMessageDto(
                UUID.randomUUID(), appointmentId, patientId, "PATIENT", "Patient Test",
                ConsultationMessageType.TEXT, "Chào bác sĩ", null, LocalDateTime.now());

        when(consultationService.sendMessage(appointmentId, patientId, Role.PATIENT, req)).thenReturn(created);
        when(consultationService.getMessages(appointmentId, doctorId, Role.DOCTOR, null)).thenReturn(List.of(created));

        ResponseEntity<ApiResponse<ConsultationMessageDto>> postResp =
                controller.sendMessage(appointmentId, req, patientPrincipal);
        assertEquals(HttpStatus.CREATED, postResp.getStatusCode());
        assertEquals("Chào bác sĩ", postResp.getBody().getData().getContent());

        ResponseEntity<ApiResponse<List<ConsultationMessageDto>>> getResp =
                controller.getMessages(appointmentId, null, doctorPrincipal);
        assertEquals(HttpStatus.OK, getResp.getStatusCode());
        assertEquals(1, getResp.getBody().getData().size());
    }

    @Test
    @DisplayName("REST signal fallback POST/GET & STOMP @MessageMapping delegate with extracted UserPrincipal")
    void signalRestAndStompHandlers_Delegate() {
        SignalMessageDto signalReq = new SignalMessageDto();
        signalReq.setType("OFFER");
        signalReq.setSdp("sdp-offer");

        SignalMessageDto stamped = new SignalMessageDto();
        stamped.setId("sig-1");
        stamped.setType("OFFER");
        stamped.setTimestamp(1000L);

        when(consultationService.relaySignal(appointmentId, doctorId, Role.DOCTOR, signalReq)).thenReturn(stamped);
        when(consultationService.getSignals(appointmentId, patientId, Role.PATIENT, 900L, false)).thenReturn(List.of(stamped));

        ResponseEntity<ApiResponse<SignalMessageDto>> sendSigResp =
                controller.sendSignal(appointmentId, signalReq, doctorPrincipal);
        assertEquals(HttpStatus.OK, sendSigResp.getStatusCode());
        assertEquals("sig-1", sendSigResp.getBody().getData().getId());

        ResponseEntity<ApiResponse<List<SignalMessageDto>>> pollResp =
                controller.getSignals(appointmentId, 900L, false, patientPrincipal);
        assertEquals(HttpStatus.OK, pollResp.getStatusCode());
        assertEquals(1, pollResp.getBody().getData().size());

        // Test STOMP @MessageMapping handlers
        UsernamePasswordAuthenticationToken auth =
                new UsernamePasswordAuthenticationToken(doctorPrincipal, null, doctorPrincipal.getAuthorities());
        SendConsultationMessageRequest stompChat = new SendConsultationMessageRequest(
                ConsultationMessageType.PRESCRIPTION_NOTE, "Uống thuốc sau ăn", null);

        controller.handleStompChat(appointmentId, stompChat, auth);
        verify(consultationService).sendMessage(appointmentId, doctorId, Role.DOCTOR, stompChat);

        controller.handleStompSignal(appointmentId, signalReq, auth);
        verify(consultationService, times(2)).relaySignal(appointmentId, doctorId, Role.DOCTOR, signalReq);
    }
}
