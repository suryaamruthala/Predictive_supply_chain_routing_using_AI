package com.supplychain.backend.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.supplychain.backend.entity.RiskLog;
import com.supplychain.backend.entity.Shipment;
import com.supplychain.backend.entity.TrackingEvent;
import com.supplychain.backend.repository.RiskLogRepository;
import com.supplychain.backend.repository.ShipmentRepository;
import com.supplychain.backend.repository.TrackingEventRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.ArrayList;

@Service
@EnableScheduling
public class TrackingSimulatorService {

    @Autowired
    private ShipmentRepository shipmentRepository;
    
    @Autowired
    private TrackingEventRepository trackingEventRepository;
    
    @Autowired
    private RiskLogRepository riskLogRepository;
    
    @Autowired
    private AiIntegrationService aiIntegrationService;
    
    @Autowired
    private AlertService alertService;
    
    @Autowired
    private SimpMessagingTemplate messagingTemplate;
    
    private final ObjectMapper mapper = new ObjectMapper();

    // Run every 2 seconds
    @Scheduled(fixedRate = 2000)
    @jakarta.transaction.Transactional
    public void simulateTracking() {
        List<Shipment> activeShipments = shipmentRepository.findAll();
        boolean updatesMade = false;
        
        for (Shipment shipment : activeShipments) {
            if ("DELIVERED".equals(shipment.getStatus())) {
                continue;
            }
            
            if (shipment.getActiveRoutePolyline() == null || shipment.getActiveRoutePolyline().isEmpty()) {
                continue;
            }
            
            try {
                List<Map<String, Object>> polyline = mapper.readValue(shipment.getActiveRoutePolyline(), new TypeReference<>() {});
                int currentIndex = shipment.getCurrentRouteIndex() != null ? shipment.getCurrentRouteIndex() : 0;
                
                if (currentIndex >= polyline.size() - 1) {
                    shipment.setStatus("DELIVERED");
                    shipmentRepository.save(shipment);
                    continue;
                }
                
                Map<String, Object> currentPoint = polyline.get(currentIndex);
                Map<String, Object> nextPoint = polyline.get(currentIndex + 1);
                
                String originName = currentPoint.containsKey("name") ? currentPoint.get("name").toString() : "Unknown";
                String destName = nextPoint.containsKey("name") ? nextPoint.get("name").toString() : "Unknown";
                Double lat1 = Double.valueOf(currentPoint.get("lat").toString());
                Double lng1 = Double.valueOf(currentPoint.get("lng").toString());
                Double lat2 = Double.valueOf(nextPoint.get("lat").toString());
                Double lng2 = Double.valueOf(nextPoint.get("lng").toString());
                
                // Fetch AI Risk for the current segment
                Map<String, Object> aiResponse = aiIntegrationService.getRiskScore(lat1, lng1, lat2, lng2, originName, destName);
                
                int riskScore = aiResponse != null && aiResponse.containsKey("risk_score") ? 
                        (int) Math.round(Double.parseDouble(aiResponse.get("risk_score").toString())) : 0;
                
                int oldRisk = shipment.getRiskScore() != null ? shipment.getRiskScore() : 0;
                shipment.setRiskScore(riskScore);
                
                if (riskScore > 75) {
                    // Trigger Reroute!
                    Map<String, Object> newRoute = aiIntegrationService.calculateRoute(originName, shipment.getDestination());
                    
                    if (newRoute != null && newRoute.containsKey("polyline")) {
                        shipment.setActiveRoutePolyline(mapper.writeValueAsString(newRoute.get("polyline")));
                        shipment.setCurrentRouteIndex(0);
                        shipment.setIsRerouted(true);
                        
                        List<String> alerts = newRoute.containsKey("alerts") ? (List<String>) newRoute.get("alerts") : new ArrayList<>();
                        shipment.setRerouteAlertData(mapper.writeValueAsString(alerts));
                        shipment.setStatus("REROUTED");
                    } else {
                        shipment.setStatus("DELAYED");
                    }
                } else {
                    shipment.setStatus("IN_TRANSIT");
                    shipment.setIsRerouted(false);
                }
                
                // Move marker directly to next point for simulation simplicity in 2s ticks
                shipment.setCurrentLat(lat2);
                shipment.setCurrentLng(lng2);
                shipment.setCurrentRouteIndex(currentIndex + 1);
                
                shipmentRepository.save(shipment);
                updatesMade = true;
                
                // Trigger formal Database Alert if we hit the 45% threshold (And only once per threshold crossing to avoid spam on 2s cycles)
                if (riskScore >= 45 && oldRisk < 45) {
                    alertService.generateShipmentAlert(
                        shipment, 
                        "admin@supplychain.ai", 
                        "In-Flight Risk Spike Detected: " + riskScore + "% (Approaching Weather/Traffic Anomaly)"
                    );
                    
                    // Force updates to immediately push to UI without waiting for refresh
                    List<String> liveAlerts = new ArrayList<>();
                    liveAlerts.add("DANGER: Risk increased to " + riskScore + "%");
                    shipment.setRerouteAlertData(mapper.writeValueAsString(liveAlerts));
                }
                
                // Log Risk
                if (riskScore > 50) {
                    RiskLog log = new RiskLog();
                    log.setShipment(shipment);
                    log.setRiskScore(riskScore);
                    log.setStatus("HIGH_RISK");
                    log.setTimestamp(LocalDateTime.now());
                    riskLogRepository.save(log);
                }
                
            } catch (Exception e) {
                e.printStackTrace();
            }
        }
        
        if (updatesMade) {
            // Push update to all subscribed frontend clients
            List<Shipment> updatedList = shipmentRepository.findAll();
            messagingTemplate.convertAndSend("/topic/shipments", updatedList);
        }
    }
}
