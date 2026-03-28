package com.supplychain.backend.controller;

import com.supplychain.backend.entity.Alert;
import com.supplychain.backend.entity.Shipment;
import com.supplychain.backend.repository.AlertRepository;
import com.supplychain.backend.repository.ShipmentRepository;
import com.supplychain.backend.service.ShipmentService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/alerts")
@CrossOrigin(origins = "*")
public class AlertController {

    @Autowired
    private AlertRepository alertRepository;

    @Autowired
    private ShipmentRepository shipmentRepository;

    @Autowired
    private ShipmentService shipmentService;

    @GetMapping
    public List<Alert> getActiveAlerts() {
        return alertRepository.findAllByOrderByCreatedAtDesc();
    }

    @PostMapping
    public Alert createAlert(@RequestBody Alert alert) {
        return alertRepository.save(alert);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String,String>> dismissAlert(@PathVariable Long id) {
        if (alertRepository.existsById(id)) {
            alertRepository.deleteById(id);
            return ResponseEntity.ok(Map.of("message", "Alert permanently deleted."));
        }
        return ResponseEntity.ok(Map.of("message", "Alert not found."));
    }

    /**
     * Called when admin clicks "Inject Storm Anomaly" button.
     * Finds all shipments with risk > 30, triggers reroute, and logs alerts to DB.
     */
    @PostMapping("/storm-reroute")
    public ResponseEntity<Map<String, Object>> stormReroute() {
        List<Shipment> allShipments = shipmentRepository.findAll();
        int rerouted = 0;

        for (Shipment s : allShipments) {
            if (s.getRiskScore() != null && s.getRiskScore() > 30
                    && !"DELIVERED".equals(s.getStatus())) {
                try {
                    shipmentService.forceReroute(s.getId());
                    rerouted++;

                    // Log a persistent alert
                    Alert alert = new Alert();
                    alert.setType("WEATHER");
                    alert.setShipmentId(String.valueOf(s.getId()));
                    alert.setCargoName(s.getName());
                    alert.setMessage("STORM OVERRIDE: High risk (" + s.getRiskScore()
                            + "%) detected. AI forced optimal reroute for dispatch "
                            + s.getName() + " (" + s.getOrigin() + " → " + s.getDestination() + ").");
                    alert.setSeverity(s.getRiskScore() > 60 ? "CRITICAL" : "HIGH");
                    alert.setCreatedAt(LocalDateTime.now());
                    alertRepository.save(alert);
                } catch (Exception e) {
                    e.printStackTrace();
                }
            }
        }

        return ResponseEntity.ok(Map.of(
                "message", "Storm reroute complete.",
                "reroutedCount", rerouted
        ));
    }
}
