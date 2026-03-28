package com.supplychain.backend.service;

import com.supplychain.backend.entity.Alert;
import com.supplychain.backend.entity.Shipment;
import com.supplychain.backend.repository.AlertRepository;
import com.supplychain.backend.repository.ShipmentRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Objects;

@Service
public class ShipmentService {

    @Autowired
    private ShipmentRepository shipmentRepository;
    
    @Autowired
    private AiIntegrationService aiIntegrationService;

    @Autowired
    private AlertRepository alertRepository;

    public List<Shipment> getAllShipments() {
        return shipmentRepository.findAll();
    }

    public Shipment getShipmentById(Long id) {
        return shipmentRepository.findById(id).orElseThrow(() -> new RuntimeException("Shipment not found"));
    }

    public Shipment createShipment(Shipment shipment) {
        shipment.setStatus("IN_TRANSIT");
        shipment.setRiskScore(5); // Baseline initial risk
        
        try {
            // Immediately ask AI for the safest live route overriding current risk heatmaps
            Map<String, Object> aiResponse = aiIntegrationService.calculateRoute(shipment.getOrigin(), shipment.getDestination());
            
            if (aiResponse.containsKey("polyline")) {
                List<Map<String, Object>> polylineList = (List<Map<String, Object>>) aiResponse.get("polyline");
                com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
                shipment.setActiveRoutePolyline(mapper.writeValueAsString(polylineList));
                
                if (aiResponse.containsKey("standard_polyline")) {
                    List<Map<String, Object>> stdPolylineList = (List<Map<String, Object>>) aiResponse.get("standard_polyline");
                    shipment.setStandardRoutePolyline(mapper.writeValueAsString(stdPolylineList));
                }

                if (aiResponse.containsKey("selected_mode")) {
                    shipment.setTransportMode(aiResponse.get("selected_mode").toString());
                }

                if (aiResponse.containsKey("total_cost_inr")) {
                    shipment.setTotalCostInr(Double.valueOf(aiResponse.get("total_cost_inr").toString()));
                }

                if (aiResponse.containsKey("mode_justification")) {
                    shipment.setModeJustification(aiResponse.get("mode_justification").toString());
                }

                if (aiResponse.containsKey("carbon_emissions_kg")) {
                    shipment.setCarbonEmissions(Double.valueOf(aiResponse.get("carbon_emissions_kg").toString()));
                }

                if (aiResponse.containsKey("total_risk")) {
                    shipment.setRiskScore(Double.valueOf(aiResponse.get("total_risk").toString()).intValue());
                }

                if (aiResponse.containsKey("alternatives")) {
                    List<Map<String, Object>> alternatives = (List<Map<String, Object>>) aiResponse.get("alternatives");
                    shipment.setAlternateRoutesData(mapper.writeValueAsString(alternatives));
                }

                shipment.setCurrentRouteIndex(0);
                if (!polylineList.isEmpty()) {
                    Map<String, Object> firstPoint = polylineList.get(0);
                    shipment.setCurrentLat(Double.parseDouble(firstPoint.get("lat").toString()));
                    shipment.setCurrentLng(Double.parseDouble(firstPoint.get("lng").toString()));
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
            System.err.println("Could not establish AI route for new shipment. It will remain stationary.");
        }
        
        return shipmentRepository.save(shipment);
    }

    public Shipment updateShipment(Long id, Shipment shipmentDetails) {
        Shipment shipment = getShipmentById(id);
        // Core fields
        if (shipmentDetails.getRiskScore() != null)    shipment.setRiskScore(shipmentDetails.getRiskScore());
        if (shipmentDetails.getStatus() != null)       shipment.setStatus(shipmentDetails.getStatus());
        if (shipmentDetails.getCurrentLat() != null)   shipment.setCurrentLat(shipmentDetails.getCurrentLat());
        if (shipmentDetails.getCurrentLng() != null)   shipment.setCurrentLng(shipmentDetails.getCurrentLng());
        if (shipmentDetails.getName() != null)         shipment.setName(shipmentDetails.getName());
        if (shipmentDetails.getOrigin() != null)       shipment.setOrigin(shipmentDetails.getOrigin());
        if (shipmentDetails.getDestination() != null)  shipment.setDestination(shipmentDetails.getDestination());
        if (shipmentDetails.getEstimatedDelivery() != null) shipment.setEstimatedDelivery(shipmentDetails.getEstimatedDelivery());
        // Reroute / AI route fields
        if (shipmentDetails.getIsRerouted() != null)              shipment.setIsRerouted(shipmentDetails.getIsRerouted());
        if (shipmentDetails.getActiveRoutePolyline() != null)     shipment.setActiveRoutePolyline(shipmentDetails.getActiveRoutePolyline());
        if (shipmentDetails.getStandardRoutePolyline() != null)   shipment.setStandardRoutePolyline(shipmentDetails.getStandardRoutePolyline());
        if (shipmentDetails.getRerouteAlertData() != null)        shipment.setRerouteAlertData(shipmentDetails.getRerouteAlertData());
        if (shipmentDetails.getAlternateRoutesData() != null)     shipment.setAlternateRoutesData(shipmentDetails.getAlternateRoutesData());
        if (shipmentDetails.getTransportMode() != null)           shipment.setTransportMode(shipmentDetails.getTransportMode());
        if (shipmentDetails.getTotalCostInr() != null)            shipment.setTotalCostInr(shipmentDetails.getTotalCostInr());
        if (shipmentDetails.getModeJustification() != null)       shipment.setModeJustification(shipmentDetails.getModeJustification());
        if (shipmentDetails.getCarbonEmissions() != null)         shipment.setCarbonEmissions(shipmentDetails.getCarbonEmissions());
        return shipmentRepository.save(shipment);
    }

    public Shipment forceReroute(Long id) {
        Shipment shipment = getShipmentById(id);
        try {
            Map<String, Object> aiResponse = aiIntegrationService.calculateRoute(shipment.getOrigin(), shipment.getDestination());
            
            if (aiResponse.containsKey("polyline")) {
                List<Map<String, Object>> polylineList = (List<Map<String, Object>>) aiResponse.get("polyline");
                com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
                shipment.setActiveRoutePolyline(mapper.writeValueAsString(polylineList));
                
                if (aiResponse.containsKey("standard_polyline")) {
                    shipment.setStandardRoutePolyline(mapper.writeValueAsString(aiResponse.get("standard_polyline")));
                }

                if (aiResponse.containsKey("selected_mode")) {
                    shipment.setTransportMode(aiResponse.get("selected_mode").toString());
                }

                if (aiResponse.containsKey("total_cost_inr")) {
                    shipment.setTotalCostInr(Double.valueOf(aiResponse.get("total_cost_inr").toString()));
                }

                if (aiResponse.containsKey("mode_justification")) {
                    shipment.setModeJustification(aiResponse.get("mode_justification").toString());
                }

                shipment.setIsRerouted(true);
                if (aiResponse.containsKey("total_risk")) {
                    shipment.setRiskScore(Double.valueOf(aiResponse.get("total_risk").toString()).intValue());
                }

                if (aiResponse.containsKey("alternatives")) {
                    List<Map<String, Object>> alternatives = (List<Map<String, Object>>) aiResponse.get("alternatives");
                    shipment.setAlternateRoutesData(mapper.writeValueAsString(alternatives));
                }
                
                String currentAlerts = shipment.getRerouteAlertData();
                List<String> alerts;
                if (currentAlerts != null && !currentAlerts.isEmpty()) {
                    alerts = mapper.readValue(currentAlerts, new com.fasterxml.jackson.core.type.TypeReference<List<String>>(){});
                } else {
                    alerts = new java.util.ArrayList<>();
                }
                
                // Add AI-specific alerts if returned
                if (aiResponse.containsKey("alerts")) {
                    List<String> aiAlerts = (List<String>) aiResponse.get("alerts");
                    for (String alertMsg : aiAlerts) {
                        if (!alerts.contains(alertMsg)) alerts.add(alertMsg);
                    }
                }
                
                alerts.add("ADMIN OVERRIDE: Forced path recalculation executed. New grid secured.");
                shipment.setRerouteAlertData(mapper.writeValueAsString(alerts));

                // Persist reroute alert to database
                Alert dbAlert = new Alert();
                dbAlert.setType("REROUTE");
                dbAlert.setShipmentId(String.valueOf(shipment.getId()));
                dbAlert.setCargoName(shipment.getName());
                dbAlert.setMessage("AI REROUTE: Forced path recalculation for dispatch "
                        + shipment.getName() + " (" + shipment.getOrigin() + " → "
                        + shipment.getDestination() + "). Risk: "
                        + shipment.getRiskScore() + "%.");
                dbAlert.setSeverity(shipment.getRiskScore() != null && shipment.getRiskScore() > 60 ? "CRITICAL" : "HIGH");
                dbAlert.setCreatedAt(LocalDateTime.now());
                alertRepository.save(dbAlert);

                // If admin-selected route still has risk > 30%, create an additional ROUTE_RISK alert
                if (shipment.getRiskScore() != null && shipment.getRiskScore() > 30) {
                    Alert riskAlert = new Alert();
                    riskAlert.setType("ROUTE_RISK");
                    riskAlert.setShipmentId(String.valueOf(shipment.getId()));
                    riskAlert.setCargoName(shipment.getName());
                    String severity = shipment.getRiskScore() > 60 ? "CRITICAL" : shipment.getRiskScore() > 45 ? "HIGH" : "MEDIUM";
                    riskAlert.setSeverity(severity);
                    riskAlert.setMessage("⚠ HIGH-RISK ROUTE SELECTED: Admin-selected route for dispatch "
                            + shipment.getName() + " (" + shipment.getOrigin() + " → "
                            + shipment.getDestination() + ") carries a risk score of "
                            + shipment.getRiskScore() + "% — exceeding the 30% safety threshold. Immediate review recommended.");
                    riskAlert.setCreatedAt(LocalDateTime.now());
                    alertRepository.save(riskAlert);
                }
                
                return shipmentRepository.save(shipment);
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        return shipment;
    }

    @jakarta.transaction.Transactional
    public void deleteShipment(Long id) {
        Long nonNullId = Objects.requireNonNull(id, "Shipment id must not be null.");
        // Verify shipment exists first
        if (!shipmentRepository.existsById(nonNullId)) {
            throw new RuntimeException("Shipment with id " + nonNullId + " not found.");
        }
        // Delete related alerts first (no JPA cascade from Shipment side — stored by string ID)
        try {
            alertRepository.deleteByShipmentId(String.valueOf(id));
        } catch (Exception e) {
            System.err.println("Could not delete alerts for shipment " + id + ": " + e.getMessage());
        }
        // Delete shipment — JPA CascadeType.ALL handles TrackingEvent, Route, RiskLog
        shipmentRepository.deleteById(id);
        shipmentRepository.flush();
    }
}
