package com.mediassist.mail;

import com.mediassist.event.PasswordChangedEvent;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.context.annotation.AnnotationConfigApplicationContext;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.annotation.EnableTransactionManagement;
import org.springframework.transaction.support.AbstractPlatformTransactionManager;
import org.springframework.transaction.support.DefaultTransactionStatus;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.LocalDateTime;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

/**
 * Kiem chung ngu nghia @TransactionalEventListener(AFTER_COMMIT, fallbackExecution = true) cua listener that:
 * commit -> gui mail, rollback -> khong gui, publish ngoai transaction -> van gui.
 * (Khong bat @EnableAsync o day de kiem tra dong bo.)
 */
class MailTransactionPhaseTest {

    private AnnotationConfigApplicationContext context;
    private EmailService emailService;
    private TransactionTemplate tx;

    @Configuration
    @EnableTransactionManagement
    static class TestConfig {
        @Bean
        EmailService emailService() {
            return mock(EmailService.class);
        }

        @Bean
        MailNotificationListener mailNotificationListener(EmailService emailService) {
            return new MailNotificationListener(emailService, "http://localhost:5173");
        }

        @Bean
        PlatformTransactionManager transactionManager() {
            return new InMemoryTransactionManager();
        }
    }

    /** Transaction manager toi gian, khong can DataSource - du de kich hoat transaction synchronization. */
    static class InMemoryTransactionManager extends AbstractPlatformTransactionManager {
        @Override protected Object doGetTransaction() { return new Object(); }
        @Override protected void doBegin(Object transaction, TransactionDefinition definition) {}
        @Override protected void doCommit(DefaultTransactionStatus status) {}
        @Override protected void doRollback(DefaultTransactionStatus status) {}
    }

    @BeforeEach
    void setUp() {
        context = new AnnotationConfigApplicationContext(TestConfig.class);
        emailService = context.getBean(EmailService.class);
        tx = new TransactionTemplate(context.getBean(PlatformTransactionManager.class));
    }

    @AfterEach
    void tearDown() {
        context.close();
    }

    private PasswordChangedEvent event() {
        return new PasswordChangedEvent("patient@example.com", "Nam", LocalDateTime.now());
    }

    @Test
    @DisplayName("Transaction commit -> email duoc gui sau commit")
    void sendsAfterCommit() {
        tx.executeWithoutResult(status -> {
            context.publishEvent(event());
            verify(emailService, never()).send(anyString(), anyString(), anyString(), anyMap());
        });
        verify(emailService).send(eq("patient@example.com"), anyString(), eq("password-changed"), any());
    }

    @Test
    @DisplayName("Transaction rollback -> KHONG gui email")
    void noMailOnRollback() {
        tx.executeWithoutResult(status -> {
            context.publishEvent(event());
            status.setRollbackOnly();
        });
        verify(emailService, never()).send(anyString(), anyString(), anyString(), anyMap());
    }

    @Test
    @DisplayName("Publish ngoai transaction -> van gui nho fallbackExecution = true")
    void sendsWithoutTransaction() {
        context.publishEvent(event());
        verify(emailService).send(eq("patient@example.com"), anyString(), eq("password-changed"), any());
    }
}
