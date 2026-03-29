package com.supplychain.backend.controller;

import com.supplychain.backend.entity.Alert;
import com.supplychain.backend.entity.Shipment;
import com.supplychain.backend.repository.AlertRepository;
import com.supplychain.backend.repository.ShipmentRepository;
import com.supplychain.backend.service.AlertService;
import com.supplychain.backend.service.ShipmentService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

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

    @Autowired
    private AlertService alertService;

    /* 🔔 GET ALERTS */
    @GetMapping
    public List<Alert> getActiveAlerts() {
        return alertRepository.findByDismissedFalseOrderByCreatedAtDesc();
    }

    /* 🔥 GENERATE ALERT (FROM FRONTEND / AI) */
    @PostMapping("/generate/{shipmentId}")
    public Alert generateAlert(@PathVariable Long shipmentId,
            @RequestParam String email) {

        Shipment s = shipmentRepository.findById(shipmentId)
                .orElseThrow(() -> new RuntimeException("Shipment not found"));

        return alertService.generateShipmentAlert(
                s,
                email,
                "AI Suggested Route via Highway");
    }

    /* ❌ DISMISS */
    @DeleteMapping("/{id}")
    public ResponseEntity<?> dismissAlert(@PathVariable Long id) {
        alertRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("message", "Alert removed"));
    }

    /* 🌪 STORM REROUTE */
    @PostMapping("/storm-reroute")
    public ResponseEntity<?> stormReroute() {

        List<Shipment> allShipments = shipmentRepository.findAll();
        int count = 0;

        for (Shipment s : allShipments) {

            if (s.getRiskScore() != null && s.getRiskScore() > 30 &&
                    !"DELIVERED".equals(s.getStatus())) {

                shipmentService.forceReroute(s.getId());

                alertService.generateShipmentAlert(
                        s,
                        "user@gmail.com",
                        "Storm-safe AI Route");

                count++;
            }
        }

        return ResponseEntity.ok(Map.of(
                "message", "Storm reroute completed",
                "rerouted", count));
    }
}