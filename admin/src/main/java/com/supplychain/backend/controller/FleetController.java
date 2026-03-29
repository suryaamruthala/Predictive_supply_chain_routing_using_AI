package com.supplychain.backend.controller;

import com.supplychain.backend.entity.Fleet;
import com.supplychain.backend.service.FleetService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/fleet")
@CrossOrigin(origins = "*")
public class FleetController {

    @Autowired
    private FleetService fleetService;

    @GetMapping
    public List<Fleet> getAllFleet() {
        return fleetService.getAllFleet();
    }

    @PostMapping
    public Fleet createFleet(@RequestBody Fleet fleet) {
        return fleetService.createFleet(fleet);
    }

    /* 🔥 ASSIGN SHIPMENT */
    @PostMapping("/{fleetId}/assign/{shipmentId}")
    public Fleet assignShipment(@PathVariable Long fleetId,
            @PathVariable Long shipmentId) {
        return fleetService.assignShipment(fleetId, shipmentId);
    }
}