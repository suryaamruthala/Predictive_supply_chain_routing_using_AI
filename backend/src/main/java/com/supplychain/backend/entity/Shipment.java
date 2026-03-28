package com.supplychain.backend.entity;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@Entity
public class Shipment {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;
    private String origin;
    private String destination;
    
    private String status; // IN_TRANSIT, DELAYED, BLOCKED, DELIVERED
    
    private Double currentLat;
    private Double currentLng;
    
    private Integer riskScore; // 0-100
    
    private LocalDateTime estimatedDelivery;

    @Column(columnDefinition = "TEXT")
    private String activeRoutePolyline; // JSON array of {lat, lng, name}

    private Integer currentRouteIndex;
    
    private Double carbonEmissions;
    
    private Boolean isRerouted;

    @Column(columnDefinition = "TEXT")
    private String rerouteAlertData; // JSON array of alert messages
}
