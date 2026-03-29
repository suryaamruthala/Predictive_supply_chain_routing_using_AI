package com.supplychain.backend.entity;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "alerts")
public class Alert {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String type; // WEATHER, TRAFFIC, REROUTE
    private String shipmentId;
    private String cargoName;

    @Column(columnDefinition = "TEXT")
    private String message;

    private String severity; // CRITICAL, HIGH, MEDIUM
    private String userEmail;

    private LocalDateTime createdAt;
    private boolean dismissed;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        dismissed = false;
    }
}