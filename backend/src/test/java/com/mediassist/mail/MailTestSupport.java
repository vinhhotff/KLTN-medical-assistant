package com.mediassist.mail;

import jakarta.mail.Session;
import jakarta.mail.internet.InternetAddress;
import jakarta.mail.internet.MimeMessage;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.mail.javamail.JavaMailSender;
import org.thymeleaf.spring6.SpringTemplateEngine;
import org.thymeleaf.templatemode.TemplateMode;
import org.thymeleaf.templateresolver.ClassLoaderTemplateResolver;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.atLeast;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Dung EmailService that (Thymeleaf SpringTemplateEngine giong production) voi JavaMailSender gia lap.
 */
final class MailTestSupport {

    private MailTestSupport() {}

    static SpringTemplateEngine templateEngine() {
        ClassLoaderTemplateResolver resolver = new ClassLoaderTemplateResolver();
        resolver.setPrefix("templates/");
        resolver.setSuffix(".html");
        resolver.setTemplateMode(TemplateMode.HTML);
        resolver.setCharacterEncoding("UTF-8");
        resolver.setCacheable(false);
        SpringTemplateEngine engine = new SpringTemplateEngine();
        engine.setTemplateResolver(resolver);
        return engine;
    }

    static JavaMailSender mockSender() {
        JavaMailSender sender = mock(JavaMailSender.class);
        when(sender.createMimeMessage()).thenAnswer(inv -> new MimeMessage((Session) null));
        return sender;
    }

    @SuppressWarnings("unchecked")
    static EmailService emailService(JavaMailSender sender, boolean enabled) {
        ObjectProvider<JavaMailSender> provider = mock(ObjectProvider.class);
        when(provider.getIfAvailable()).thenReturn(sender);
        return new EmailService(provider, templateEngine(), enabled, "MediAssist AI <no-reply@mediassist.local>");
    }

    static List<MimeMessage> sentMessages(JavaMailSender sender) {
        ArgumentCaptor<MimeMessage> captor = ArgumentCaptor.forClass(MimeMessage.class);
        verify(sender, atLeast(1)).send(captor.capture());
        return captor.getAllValues();
    }

    static String recipient(MimeMessage message) throws Exception {
        return ((InternetAddress) message.getAllRecipients()[0]).getAddress();
    }

    static String html(MimeMessage message) throws Exception {
        return message.getContent().toString();
    }

    static MimeMessage sentTo(List<MimeMessage> messages, String email) throws Exception {
        for (MimeMessage m : messages) {
            if (email.equals(recipient(m))) return m;
        }
        throw new AssertionError("No mail sent to " + email);
    }

    static void neverSent(JavaMailSender sender) {
        verify(sender, org.mockito.Mockito.never()).send(any(MimeMessage.class));
    }
}
