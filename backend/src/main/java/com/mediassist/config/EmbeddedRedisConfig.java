package com.mediassist.config;

import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import redis.embedded.RedisServer;

import java.io.IOException;
import java.net.Socket;

@Configuration
@Profile("dev")
public class EmbeddedRedisConfig {

    private static final Logger log = LoggerFactory.getLogger(EmbeddedRedisConfig.class);

    @Value("${spring.data.redis.port:6379}")
    private int redisPort;

    private RedisServer redisServer;

    @PostConstruct
    public void startRedis() {
        if (isPortInUse(redisPort)) {
            log.info("ℹ️ Port {} is already in use. Assuming Redis is already running externally.", redisPort);
            return;
        }

        try {
            log.info("🚀 Starting Embedded Redis Server on port {} (No account or external setup required)...", redisPort);
            redisServer = RedisServer.newRedisServer()
                    .port(redisPort)
                    .setting("maxmemory 128M")
                    .build();
            redisServer.start();
            log.info("✅ Embedded Redis Server started successfully on port {}!", redisPort);
        } catch (Exception ex) {
            log.warn("⚠️ Could not start Embedded Redis Server on port {}: {}. Bypassing to in-memory fallback.", redisPort, ex.getMessage());
        }
    }

    @PreDestroy
    public void stopRedis() {
        if (redisServer != null && redisServer.isActive()) {
            try {
                log.info("Stopping Embedded Redis Server...");
                redisServer.stop();
            } catch (IOException e) {
                log.warn("Error stopping Embedded Redis Server: {}", e.getMessage());
            }
        }
    }

    private boolean isPortInUse(int port) {
        try (Socket socket = new Socket("localhost", port)) {
            return true;
        } catch (Exception e) {
            return false;
        }
    }
}
