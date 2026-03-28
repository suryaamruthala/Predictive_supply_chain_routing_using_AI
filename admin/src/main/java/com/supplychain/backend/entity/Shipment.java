package com.supplychain.backend.entity;

import jakarta.persistence.*;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
public class Shipment {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;
    private String origin;
    private String destination;

    private String status; // IN_TRANSIT, DELAYED, BLOCKED, DELIVERED, REROUTED

    private Double currentLat;
    private Double currentLng;

    private Integer riskScore; // 0-100

    private LocalDateTime estimatedDelivery;

    @Column(columnDefinition = "TEXT")
    private String activeRoutePolyline; // JSON array of {lat, lng, name}

    @Column(columnDefinition = "TEXT")
    private String standardRoutePolyline; // Original shortest path JSON

    private String transportMode; // AIR, ROAD, WATER

    private Double totalCostInr;

    @Column(columnDefinition = "TEXT")
    private String modeJustification;

    private Integer currentRouteIndex;

    private Double carbonEmissions;

    // Explicit column name to avoid Hibernate naming issues with boolean "is" prefix
    @Column(name = "is_rerouted")
    private Boolean isRerouted;

    @Column(columnDefinition = "TEXT")
    private String rerouteAlertData; // JSON array of alert messages

    @Column(columnDefinition = "TEXT")
    private String alternateRoutesData; // JSON array of available multimodal routes

    // Cascade: deleting a Shipment will also delete its children
    @OneToMany(mappedBy = "shipment", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @JsonIgnore
    private List<TrackingEvent> trackingEvents = new ArrayList<>();

    @OneToMany(mappedBy = "shipment", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @JsonIgnore
    private List<Route> routes = new ArrayList<>();

    @OneToMany(mappedBy = "shipment", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @JsonIgnore
    private List<RiskLog> riskLogs = new ArrayList<>();

    // --- Manual Getters/Setters (replacing Lombok @Data to avoid isRerouted getter issue) ---
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getOrigin() { return origin; }
    public void setOrigin(String origin) { this.origin = origin; }

    public String getDestination() { return destination; }
    public void setDestination(String destination) { this.destination = destination; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public Double getCurrentLat() { return currentLat; }
    public void setCurrentLat(Double currentLat) { this.currentLat = currentLat; }

    public Double getCurrentLng() { return currentLng; }
    public void setCurrentLng(Double currentLng) { this.currentLng = currentLng; }

    public Integer getRiskScore() { return riskScore; }
    public void setRiskScore(Integer riskScore) { this.riskScore = riskScore; }

    public LocalDateTime getEstimatedDelivery() { return estimatedDelivery; }
    public void setEstimatedDelivery(LocalDateTime estimatedDelivery) { this.estimatedDelivery = estimatedDelivery; }

    public String getActiveRoutePolyline() { return activeRoutePolyline; }
    public void setActiveRoutePolyline(String activeRoutePolyline) { this.activeRoutePolyline = activeRoutePolyline; }

    public String getStandardRoutePolyline() { return standardRoutePolyline; }
    public void setStandardRoutePolyline(String standardRoutePolyline) { this.standardRoutePolyline = standardRoutePolyline; }

    public String getTransportMode() { return transportMode; }
    public void setTransportMode(String transportMode) { this.transportMode = transportMode; }

    public Double getTotalCostInr() { return totalCostInr; }
    public void setTotalCostInr(Double totalCostInr) { this.totalCostInr = totalCostInr; }

    public String getModeJustification() { return modeJustification; }
    public void setModeJustification(String modeJustification) { this.modeJustification = modeJustification; }

    public Integer getCurrentRouteIndex() { return currentRouteIndex; }
    public void setCurrentRouteIndex(Integer currentRouteIndex) { this.currentRouteIndex = currentRouteIndex; }

    public Double getCarbonEmissions() { return carbonEmissions; }
    public void setCarbonEmissions(Double carbonEmissions) { this.carbonEmissions = carbonEmissions; }

    // Use @JsonProperty to ensure it serializes as "isRerouted" (not "rerouted")
    @JsonProperty("isRerouted")
    public Boolean getIsRerouted() { return isRerouted; }
    public void setIsRerouted(Boolean isRerouted) { this.isRerouted = isRerouted; }

    public String getRerouteAlertData() { return rerouteAlertData; }
    public void setRerouteAlertData(String rerouteAlertData) { this.rerouteAlertData = rerouteAlertData; }

    public String getAlternateRoutesData() { return alternateRoutesData; }
    public void setAlternateRoutesData(String alternateRoutesData) { this.alternateRoutesData = alternateRoutesData; }

    public List<TrackingEvent> getTrackingEvents() { return trackingEvents; }
    public List<Route> getRoutes() { return routes; }
    public List<RiskLog> getRiskLogs() { return riskLogs; }
}
