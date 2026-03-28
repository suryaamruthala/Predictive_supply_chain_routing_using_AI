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
                
                // Convert polyline objects to JSON string for the DB simulator loop
                com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
                String polylineJson = mapper.writeValueAsString(polylineList);
                
                shipment.setActiveRoutePolyline(polylineJson);
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
        shipment.setRiskScore(shipmentDetails.getRiskScore());
        shipment.setStatus(shipmentDetails.getStatus());
        shipment.setCurrentLat(shipmentDetails.getCurrentLat());
        shipment.setCurrentLng(shipmentDetails.getCurrentLng());
        return shipmentRepository.save(shipment);
    }

    public Shipment forceReroute(Long id) {
        Shipment shipment = getShipmentById(id);
        try {
            Map<String, Object> aiResponse = aiIntegrationService.calculateRoute(shipment.getOrigin(), shipment.getDestination());
            
            if (aiResponse.containsKey("polyline")) {
                List<Map<String, Object>> polylineList = (List<Map<String, Object>>) aiResponse.get("polyline");
                com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
                String polylineJson = mapper.writeValueAsString(polylineList);
                
                shipment.setActiveRoutePolyline(polylineJson);
                shipment.setIsRerouted(true);
                
                if (aiResponse.containsKey("total_risk")) {
                    shipment.setRiskScore(Double.valueOf(aiResponse.get("total_risk").toString()).intValue());
                }
                
                String currentAlerts = shipment.getRerouteAlertData();
                List<String> alerts;
                if (currentAlerts != null && !currentAlerts.isEmpty()) {
                    alerts = mapper.readValue(currentAlerts, new com.fasterxml.jackson.core.type.TypeReference<List<String>>(){});
                } else {
                    alerts = new java.util.ArrayList<>();
                }
                alerts.add("ADMIN OVERRIDE: Forced path recalculation executed. New grid secured.");
                shipment.setRerouteAlertData(mapper.writeValueAsString(alerts));

                // Persist alert to database
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
                
                return shipmentRepository.save(shipment);
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        return shipment;
    }

    public void deleteShipment(Long id) {
        shipmentRepository.deleteById(id);
    }
}
