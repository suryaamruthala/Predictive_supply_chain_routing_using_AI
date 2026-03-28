package com.supplychain.backend.entity;

import jakarta.persistence.*;
import lombok.Data;

@Data
@Entity
public class Route {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "shipment_id")
    private Shipment shipment;

    private String pathCoordinatesJson; // Store coordinates array as JSON string
    
    private Double distance;
    private String riskLevel; // SAFE, MEDIUM, HIGH
    private Boolean isCurrent;
}
