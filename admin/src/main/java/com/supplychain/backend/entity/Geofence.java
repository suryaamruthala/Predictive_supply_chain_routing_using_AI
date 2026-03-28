package com.supplychain.backend.entity;

import jakarta.persistence.*;
import lombok.Data;

@Data
@Entity
public class Geofence {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;
    
    // Can represent a circular geofence with center lat/lng and radius in km
    private Double centerLat;
    private Double centerLng;
    private Double radiusKm;
    
    private String riskLevel; // HIGH, CRITICAL
    private String description;
}
