package com.mediassist;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cache.annotation.EnableCaching;

@SpringBootApplication
@EnableCaching
public class MediAssistApplication {

    public static void main(String[] args) {
        SpringApplication.run(MediAssistApplication.class, args);
    }
}
