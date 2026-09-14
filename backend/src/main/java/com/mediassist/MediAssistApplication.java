package com.mediassist;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cache.annotation.EnableCaching;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;

@SpringBootApplication
@EnableCaching
public class MediAssistApplication {

    private static final Logger log = LoggerFactory.getLogger(MediAssistApplication.class);

    public static void main(String[] args) {
        loadDotEnv();
        SpringApplication.run(MediAssistApplication.class, args);
    }

    private static void loadDotEnv() {
        List<Path> candidatePaths = List.of(
                Path.of(".env"),
                Path.of("../.env"),
                Path.of("backend/.env"),
                Path.of(".env.local"),
                Path.of("../.env.local"),
                Path.of("backend/.env.local")
        );

        for (Path p : candidatePaths) {
            if (Files.exists(p)) {
                try {
                    List<String> lines = Files.readAllLines(p);
                    for (String line : lines) {
                        line = line.trim();
                        if (line.isEmpty() || line.startsWith("#")) continue;
                        int eq = line.indexOf('=');
                        if (eq > 0) {
                            String key = line.substring(0, eq).trim();
                            String val = line.substring(eq + 1).trim();
                            if (val.startsWith("\"") && val.endsWith("\"") && val.length() >= 2) {
                                val = val.substring(1, val.length() - 1);
                            }
                            if (!val.isBlank()) {
                                System.setProperty(key, val);
                            }
                        }
                    }
                    log.info("🌱 [ENV] Loaded environment variables from: {}", p.toAbsolutePath().normalize());
                } catch (Exception e) {
                    log.warn("Could not read .env at {}: {}", p, e.getMessage());
                }
            }
        }
    }
}
