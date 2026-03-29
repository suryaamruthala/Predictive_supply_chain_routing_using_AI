package com.supplychain.backend.service;

import com.supplychain.backend.entity.Fleet;
import com.supplychain.backend.repository.FleetRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class FleetService {

    @Autowired
    private FleetRepository fleetRepository;

    public List<Fleet> getAllFleet() {
        return fleetRepository.findAll();
    }

    public Fleet createFleet(Fleet f) {
        f.setStatus("AVAILABLE");
        return fleetRepository.save(f);
    }

    public Fleet assignShipment(Long fleetId, Long shipmentId) {
        Fleet f = fleetRepository.findById(fleetId)
                .orElseThrow(() -> new RuntimeException("Fleet not found"));

        f.setShipmentId(shipmentId);
        f.setStatus("IN_USE");

        return fleetRepository.save(f);
    }
}