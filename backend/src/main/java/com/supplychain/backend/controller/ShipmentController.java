package com.supplychain.backend.controller;

import com.supplychain.backend.entity.Shipment;
import com.supplychain.backend.service.ShipmentService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/shipments")
@CrossOrigin(origins = "*")
public class ShipmentController {

    @Autowired
    private ShipmentService shipmentService;

    @GetMapping
    public List<Shipment> getAllShipments() {
        return shipmentService.getAllShipments();
    }

    @GetMapping("/{id}")
    public Shipment getShipmentById(@PathVariable Long id) {
        return shipmentService.getShipmentById(id);
    }

    @PostMapping
    public Shipment createShipment(@RequestBody Shipment shipment) {
        return shipmentService.createShipment(shipment);
    }

    @PutMapping("/{id}")
    public Shipment updateShipment(@PathVariable Long id, @RequestBody Shipment shipment) {
        return shipmentService.updateShipment(id, shipment);
    }

    @PostMapping("/{id}/reroute")
    public ResponseEntity<Shipment> rerouteShipment(@PathVariable Long id) {
        Shipment rerouted = shipmentService.forceReroute(id);
        return ResponseEntity.ok(rerouted);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, String>> deleteShipment(@PathVariable Long id) {
        shipmentService.deleteShipment(id);
        return ResponseEntity.ok(Map.of("message", "Shipment " + id + " permanently removed."));
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<Shipment> toggleStatus(@PathVariable Long id) {
        Shipment s = shipmentService.getShipmentById(id);
        if ("DELIVERED".equals(s.getStatus())) {
            s.setStatus("IN_TRANSIT");
        } else {
            s.setStatus("DELIVERED");
        }
        shipmentService.updateShipment(id, s);
        return ResponseEntity.ok(s);
    }
}

