package com.lexiguard;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import java.util.Map;

@SpringBootApplication
@EnableAsync
@RestController
public class LexiGuardApplication {

    public static void main(String[] academ) {
        // Load .env file from root or current folder
        try {
            java.io.File envFile = new java.io.File("../.env");
            if (!envFile.exists()) {
                envFile = new java.io.File(".env");
            }
            if (envFile.exists()) {
                java.nio.file.Files.lines(envFile.toPath())
                    .map(String::trim)
                    .filter(line -> !line.isEmpty() && !line.startsWith("#"))
                    .forEach(line -> {
                        int index = line.indexOf('=');
                        if (index > 0) {
                            String key = line.substring(0, index).trim();
                            String value = line.substring(index + 1).trim();
                            if (value.startsWith("\"") && value.endsWith("\"")) {
                                value = value.substring(1, value.length() - 1);
                            } else if (value.startsWith("'") && value.endsWith("'")) {
                                value = value.substring(1, value.length() - 1);
                            }
                            System.setProperty(key, value);
                        }
                    });
            }
        } catch (Exception e) {
            System.err.println("Failed to load .env file: " + e.getMessage());
        }

        SpringApplication.run(LexiGuardApplication.class, academ);
    }

    @GetMapping("/api/health")
    public Map<String, Object> healthCheck() {
        return Map.of(
            "status", "UP",
            "message", "LexiGuard AI API is running successfully"
        );
    }
}
