package com.mediassist.mail;

import jakarta.mail.internet.MimeMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.NestedExceptionUtils;
import org.springframework.mail.MailException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.thymeleaf.ITemplateEngine;
import org.thymeleaf.context.Context;

import java.util.Locale;
import java.util.Map;

/**
 * Gui email HTML render tu template Thymeleaf trong templates/email/.
 * Gui that bai KHONG nem exception ra ngoai: chi log WARN (khong ghi token/link, che dia chi nguoi nhan).
 */
@Service
public class EmailService {

    private static final Logger log = LoggerFactory.getLogger(EmailService.class);
    private static final Locale VIETNAMESE = Locale.forLanguageTag("vi-VN");

    private final ObjectProvider<JavaMailSender> mailSenderProvider;
    private final ITemplateEngine templateEngine;
    private final boolean enabled;
    private final String from;

    public EmailService(ObjectProvider<JavaMailSender> mailSenderProvider,
                        ITemplateEngine templateEngine,
                        @Value("${app.mail.enabled:true}") boolean enabled,
                        @Value("${app.mail.from:MediAssist AI <no-reply@mediassist.local>}") String from) {
        this.mailSenderProvider = mailSenderProvider;
        this.templateEngine = templateEngine;
        this.enabled = enabled;
        this.from = from;
    }

    /**
     * @param template ten template trong templates/email/ (khong co duoi .html)
     * @return true neu da giao cho SMTP server thanh cong
     */
    public boolean send(String to, String subject, String template, Map<String, Object> variables) {
        if (!enabled) {
            log.debug("Mail disabled - skip '{}' to {}", template, MailFormat.maskEmail(to));
            return false;
        }
        if (to == null || to.isBlank()) {
            log.warn("Mail '{}' skipped: empty recipient", template);
            return false;
        }
        JavaMailSender mailSender = mailSenderProvider.getIfAvailable();
        if (mailSender == null) {
            log.warn("Mail '{}' skipped: JavaMailSender not configured (spring.mail.host)", template);
            return false;
        }
        try {
            Context context = new Context(VIETNAMESE);
            context.setVariables(variables);
            context.setVariable("subject", subject);
            String html = templateEngine.process("email/" + template, context);

            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, false, "UTF-8");
            helper.setFrom(from);
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(html, true);
            mailSender.send(message);

            log.info("Mail '{}' sent to {}", template, MailFormat.maskEmail(to));
            return true;
        } catch (MailException e) {
            // Loi SMTP (ket noi, xac thuc, tu choi nguoi nhan) - message khong chua noi dung email
            Throwable root = NestedExceptionUtils.getMostSpecificCause(e);
            log.warn("Mail '{}' to {} failed: {} ({})", template, MailFormat.maskEmail(to),
                    e.getClass().getSimpleName(), root.getMessage());
            return false;
        } catch (Exception e) {
            // Loi render/MIME: chi ghi ten loi, khong ghi message vi co the trich noi dung email (link co token)
            log.warn("Mail '{}' to {} failed: {}", template, MailFormat.maskEmail(to), e.getClass().getSimpleName());
            return false;
        }
    }
}
