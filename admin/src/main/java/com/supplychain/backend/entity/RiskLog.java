package com.supplychain.backend.entity;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@Entity
public class RiskLog {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "shipment_id")
    private Shipment shipment;

    private Integer riskScore;
    private String riskFactorsJson; // JSON of factors { weather, traffic, news }
    private String status; // e.g., REROUTED
    
    private LocalDateTime timestamp;
}
