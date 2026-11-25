package com.mediassist.config;

import com.mediassist.model.entity.Appointment;
import com.mediassist.model.entity.Role;
import com.mediassist.model.entity.User;
import com.mediassist.model.entity.UserStatus;
import com.mediassist.repository.AppointmentRepository;
import com.mediassist.repository.UserRepository;
import com.mediassist.security.JwtTokenProvider;
import com.mediassist.security.UserPrincipal;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.http.server.ServletServerHttpRequest;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.util.StringUtils;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;
import org.springframework.web.socket.server.HandshakeInterceptor;
import org.springframework.web.socket.server.support.DefaultHandshakeHandler;

import java.security.Principal;
import java.util.Map;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    private static final Logger log = LoggerFactory.getLogger(WebSocketConfig.class);
    private static final String WS_PRINCIPAL_ATTR = "wsPrincipal";
    private static final Pattern CONSULTATION_DEST_PATTERN =
            Pattern.compile("^/(?:topic/consultation\\.|app/consultation/)([0-9a-fA-F\\-]{36})(?:[./].*)?$");

    private final JwtTokenProvider jwtTokenProvider;
    private final UserRepository userRepository;
    private final AppointmentRepository appointmentRepository;

    public WebSocketConfig(JwtTokenProvider jwtTokenProvider,
                           UserRepository userRepository,
                           AppointmentRepository appointmentRepository) {
        this.jwtTokenProvider = jwtTokenProvider;
        this.userRepository = userRepository;
        this.appointmentRepository = appointmentRepository;
    }

    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        config.enableSimpleBroker("/topic", "/queue");
        config.setApplicationDestinationPrefixes("/app");
        config.setUserDestinationPrefix("/user");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        HandshakeInterceptor authInterceptor = new JwtHandshakeInterceptor();
        DefaultHandshakeHandler handshakeHandler = new PrincipalHandshakeHandler();

        registry.addEndpoint("/ws", "/api/v1/ws")
                .setAllowedOriginPatterns("*")
                .addInterceptors(authInterceptor)
                .setHandshakeHandler(handshakeHandler);

        registry.addEndpoint("/ws-sockjs")
                .setAllowedOriginPatterns("*")
                .addInterceptors(authInterceptor)
                .setHandshakeHandler(handshakeHandler)
                .withSockJS();
    }

    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        registration.interceptors(new StompAuthChannelInterceptor());
    }

    private Authentication authenticateToken(String rawToken) {
        if (!StringUtils.hasText(rawToken)) {
            return null;
        }
        String token = rawToken.startsWith("Bearer ") ? rawToken.substring(7).trim() : rawToken.trim();
        if (!StringUtils.hasText(token) || !jwtTokenProvider.validateToken(token)) {
            return null;
        }
        UUID userId = jwtTokenProvider.getUserIdFromToken(token);
        User user = userRepository.findById(userId).orElse(null);
        if (user == null || user.getStatus() == UserStatus.SUSPENDED) {
            return null;
        }
        UserPrincipal principal = UserPrincipal.create(user);
        return new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities());
    }

    private class JwtHandshakeInterceptor implements HandshakeInterceptor {
        @Override
        public boolean beforeHandshake(ServerHttpRequest request, ServerHttpResponse response,
                                       WebSocketHandler wsHandler, Map<String, Object> attributes) {
            if (request instanceof ServletServerHttpRequest servletRequest) {
                HttpServletRequest httpReq = servletRequest.getServletRequest();
                String token = extractTokenFromHttpRequest(httpReq);
                Authentication auth = authenticateToken(token);
                if (auth != null) {
                    attributes.put(WS_PRINCIPAL_ATTR, auth);
                }
            }
            return true;
        }

        @Override
        public void afterHandshake(ServerHttpRequest request, ServerHttpResponse response,
                                   WebSocketHandler wsHandler, Exception exception) {
            // No-op
        }

        private String extractTokenFromHttpRequest(HttpServletRequest request) {
            if (request.getCookies() != null) {
                for (Cookie cookie : request.getCookies()) {
                    if ("accessToken".equals(cookie.getName()) && StringUtils.hasText(cookie.getValue())) {
                        return cookie.getValue();
                    }
                }
            }
            String authHeader = request.getHeader("Authorization");
            if (StringUtils.hasText(authHeader) && authHeader.startsWith("Bearer ")) {
                return authHeader.substring(7);
            }
            String tokenParam = request.getParameter("token");
            if (StringUtils.hasText(tokenParam)) {
                return tokenParam;
            }
            return null;
        }
    }

    private static class PrincipalHandshakeHandler extends DefaultHandshakeHandler {
        @Override
        protected Principal determineUser(ServerHttpRequest request, WebSocketHandler wsHandler,
                                          Map<String, Object> attributes) {
            Object attr = attributes.get(WS_PRINCIPAL_ATTR);
            if (attr instanceof Principal principal) {
                return principal;
            }
            return super.determineUser(request, wsHandler, attributes);
        }
    }

    private class StompAuthChannelInterceptor implements ChannelInterceptor {
        @Override
        public Message<?> preSend(Message<?> message, MessageChannel channel) {
            StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
            if (accessor == null) {
                return message;
            }

            StompCommand command = accessor.getCommand();
            if (StompCommand.CONNECT.equals(command)) {
                String authHeader = accessor.getFirstNativeHeader("Authorization");
                if (!StringUtils.hasText(authHeader)) {
                    authHeader = accessor.getFirstNativeHeader("authorization");
                }
                if (!StringUtils.hasText(authHeader)) {
                    authHeader = accessor.getFirstNativeHeader("token");
                }

                Authentication auth = authenticateToken(authHeader);
                if (auth != null) {
                    accessor.setUser(auth);
                } else if (accessor.getUser() == null && accessor.getSessionAttributes() != null) {
                    Object attr = accessor.getSessionAttributes().get(WS_PRINCIPAL_ATTR);
                    if (attr instanceof Principal principal) {
                        accessor.setUser(principal);
                    }
                }

                if (accessor.getUser() == null) {
                    log.warn("🚫 Rejected unauthenticated STOMP CONNECT");
                    throw new AccessDeniedException("WebSocket authentication required");
                }
            } else if (StompCommand.SUBSCRIBE.equals(command) || StompCommand.SEND.equals(command)) {
                Principal user = accessor.getUser();
                if (!(user instanceof Authentication auth) || !(auth.getPrincipal() instanceof UserPrincipal principal)) {
                    throw new AccessDeniedException("WebSocket authentication required");
                }
                String destination = accessor.getDestination();
                if (StringUtils.hasText(destination)) {
                    Matcher matcher = CONSULTATION_DEST_PATTERN.matcher(destination);
                    if (matcher.matches()) {
                        UUID appointmentId = UUID.fromString(matcher.group(1));
                        if (!isAuthorizedForAppointment(appointmentId, principal)) {
                            log.warn("🚫 User {} denied STOMP {} to {}", principal.getId(), command, destination);
                            throw new AccessDeniedException("Bạn không có quyền truy cập phòng khám này");
                        }
                    }
                }
            }

            return message;
        }

        private boolean isAuthorizedForAppointment(UUID appointmentId, UserPrincipal principal) {
            if (principal.getRole() == Role.ADMIN) {
                return appointmentRepository.existsById(appointmentId);
            }
            Appointment appt = appointmentRepository.findByIdWithUsers(appointmentId).orElse(null);
            if (appt == null) {
                return false;
            }
            UUID userId = principal.getId();
            return (appt.getPatient() != null && userId.equals(appt.getPatient().getId()))
                    || (appt.getDoctor() != null && userId.equals(appt.getDoctor().getId()));
        }
    }
}
