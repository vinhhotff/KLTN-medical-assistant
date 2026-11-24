package com.mediassist.service;

import com.mediassist.model.entity.Appointment;
import com.mediassist.model.entity.PaymentStatus;
import com.mediassist.model.entity.PaymentTransaction;
import com.mediassist.model.entity.Role;
import com.mediassist.model.entity.TransactionStatus;
import com.mediassist.repository.PaymentTransactionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AppointmentRefundServiceTest {

    @Mock
    private PaymentTransactionRepository paymentTransactionRepository;

    private AppointmentRefundService refundService;

    @BeforeEach
    void setUp() {
        refundService = new AppointmentRefundService(paymentTransactionRepository);
    }

    @Test
    @DisplayName("Hủy trước > 24h: hoàn 100% và chuyển giao dịch sang REFUNDED")
    void patientCancel_Over24Hours_Refunds100Percent() {
        UUID apptId = UUID.randomUUID();
        Appointment appt = Appointment.builder()
                .id(apptId)
                .appointmentCode("AP-REF-100")
                .scheduledStart(LocalDateTime.now().plusHours(30))
                .feeAmount(new BigDecimal("450000.00"))
                .paymentStatus(PaymentStatus.PAID)
                .build();
        PaymentTransaction tx = new PaymentTransaction();
        tx.setAmount(new BigDecimal("450000.00"));
        tx.setStatus(TransactionStatus.COMPLETED);

        when(paymentTransactionRepository.findFirstByReferenceIdAndStatus(apptId.toString(), TransactionStatus.COMPLETED))
                .thenReturn(Optional.of(tx));

        AppointmentRefundService.RefundResult result = refundService.refundIfPaid(appt, Role.PATIENT);

        assertTrue(result.refunded());
        assertEquals(0, new BigDecimal("450000.00").compareTo(result.amount()));
        assertEquals(PaymentStatus.REFUNDED, appt.getPaymentStatus());
        assertEquals(100, appt.getRefundPercentage());
        assertEquals(0, new BigDecimal("450000.00").compareTo(appt.getRefundAmount()));
        assertNotNull(appt.getRefundedAt());
        assertEquals(TransactionStatus.REFUNDED, tx.getStatus());
    }

    @Test
    @DisplayName("Hủy từ 2 đến 24h trước giờ khám: hoàn 80% theo chính sách")
    void patientCancel_Between2And24Hours_Refunds80Percent() {
        UUID apptId = UUID.randomUUID();
        Appointment appt = Appointment.builder()
                .id(apptId)
                .appointmentCode("AP-REF-80")
                .scheduledStart(LocalDateTime.now().plusHours(6))
                .feeAmount(new BigDecimal("350000.00"))
                .paymentStatus(PaymentStatus.PAID)
                .build();

        when(paymentTransactionRepository.findFirstByReferenceIdAndStatus(apptId.toString(), TransactionStatus.COMPLETED))
                .thenReturn(Optional.empty());
        when(paymentTransactionRepository.findFirstByReferenceIdAndStatus(apptId.toString(), TransactionStatus.REFUNDED))
                .thenReturn(Optional.empty());

        AppointmentRefundService.RefundResult result = refundService.refundIfPaid(appt, Role.PATIENT);

        assertTrue(result.refunded());
        assertEquals(0, new BigDecimal("280000.00").compareTo(result.amount()));
        assertEquals(PaymentStatus.REFUNDED, appt.getPaymentStatus());
        assertEquals(80, appt.getRefundPercentage());
        assertTrue(appt.getRefundPolicyNote().contains("80%"));
    }

    @Test
    @DisplayName("Hủy sát giờ < 2h: không hoàn tiền (0%), giữ trạng thái PAID")
    void patientCancel_Under2Hours_ZeroRefund() {
        UUID apptId = UUID.randomUUID();
        Appointment appt = Appointment.builder()
                .id(apptId)
                .appointmentCode("AP-REF-0")
                .scheduledStart(LocalDateTime.now().plusMinutes(45))
                .feeAmount(new BigDecimal("350000.00"))
                .paymentStatus(PaymentStatus.PAID)
                .build();

        AppointmentRefundService.RefundResult result = refundService.refundIfPaid(appt, Role.PATIENT);

        assertFalse(result.refunded());
        assertEquals(0, BigDecimal.ZERO.compareTo(result.amount()));
        assertEquals(PaymentStatus.PAID, appt.getPaymentStatus());
        assertEquals(0, appt.getRefundPercentage());
        assertTrue(appt.getRefundPolicyNote().contains("Không hoàn tiền"));
        verifyNoInteractions(paymentTransactionRepository);
    }

    @Test
    @DisplayName("Bác sĩ hủy sát giờ < 2h: vẫn hoàn 100% cho bệnh nhân")
    void doctorCancel_Under2Hours_StillRefunds100Percent() {
        UUID apptId = UUID.randomUUID();
        Appointment appt = Appointment.builder()
                .id(apptId)
                .appointmentCode("AP-REF-DOC")
                .scheduledStart(LocalDateTime.now().plusMinutes(30))
                .feeAmount(new BigDecimal("400000.00"))
                .paymentStatus(PaymentStatus.PAID)
                .build();

        when(paymentTransactionRepository.findFirstByReferenceIdAndStatus(apptId.toString(), TransactionStatus.COMPLETED))
                .thenReturn(Optional.empty());
        when(paymentTransactionRepository.findFirstByReferenceIdAndStatus(apptId.toString(), TransactionStatus.REFUNDED))
                .thenReturn(Optional.empty());

        AppointmentRefundService.RefundResult result = refundService.refundIfPaid(appt, Role.DOCTOR);

        assertTrue(result.refunded());
        assertEquals(100, appt.getRefundPercentage());
        assertEquals(0, new BigDecimal("400000.00").compareTo(appt.getRefundAmount()));
    }
}
