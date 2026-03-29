package com.supplychain.backend.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.supplychain.backend.entity.Shipment;
import com.supplychain.backend.repository.ShipmentRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

@Service
public class ShipmentService {

    @Autowired
    private ShipmentRepository shipmentRepository;

    @Autowired
    private AiIntegrationService aiIntegrationService; // 🔥 IMPORTANT

    @Autowired
    private AlertService alertService; // 🔥 Auto-Alert generation

    /* ------------------ GET ------------------ */

    public List<Shipment> getAllShipments() {
        return shipmentRepository.findAll();
    }

    public Shipment getShipmentById(Long id) {
        return shipmentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Shipment not found"));
    }

    /* ------------------ CREATE ------------------ */

    public Shipment createShipment(Shipment shipment) {

        shipment.setStatus("IN_TRANSIT");
        shipment.setCurrentRouteIndex(0);

        try {
            Map<String, Object> aiResponse = aiIntegrationService.calculateRoute(
                    shipment.getOrigin(),
                    shipment.getDestination());

            ObjectMapper mapper = new ObjectMapper();

            if (aiResponse.containsKey("polyline")) {
                shipment.setActiveRoutePolyline(
                        mapper.writeValueAsString(aiResponse.get("polyline")));

                // set initial position
                List<Map<String, Object>> route = (List<Map<String, Object>>) aiResponse.get("polyline");

                if (!route.isEmpty()) {
                    Map<String, Object> first = route.get(0);
                    shipment.setCurrentLat(Double.valueOf(first.get("lat").toString()));
                    shipment.setCurrentLng(Double.valueOf(first.get("lng").toString()));
                }
            }

            if (aiResponse.containsKey("total_risk")) {
                shipment.setRiskScore(Double.valueOf(aiResponse.get("total_risk").toString()).intValue());
            }

            if (aiResponse.containsKey("justification")) {
                shipment.setModeJustification(aiResponse.get("justification").toString());
            }

            if (aiResponse.containsKey("transport_mode")) {
                shipment.setTransportMode(aiResponse.get("transport_mode").toString());
            }

            if (aiResponse.containsKey("estimated_cost_inr")) {
                shipment.setTotalCostInr(Double.valueOf(aiResponse.get("estimated_cost_inr").toString()));
            }

            if (aiResponse.containsKey("carbon_emissions_kg")) {
                shipment.setCarbonEmissions(Double.valueOf(aiResponse.get("carbon_emissions_kg").toString()));
            }

        } catch (Exception e) {
            e.printStackTrace();

            // fallback
            shipment.setCurrentLat(20.0);
            shipment.setCurrentLng(78.0);
        }

        Shipment savedShipment = shipmentRepository.save(shipment);

        // 🔥 Auto-generate alert if AI assigns high risk on creation
        if (savedShipment.getRiskScore() != null && savedShipment.getRiskScore() > 30) {
            alertService.generateShipmentAlert(savedShipment, "admin@supplychain.ai", "Initial Route Assignment");
        }

        return savedShipment;
    }

    /* ------------------ UPDATE ------------------ */

    public Shipment updateShipment(Long id, Shipment updated) {
        Shipment s = getShipmentById(id);

        if (updated.getCurrentLat() != null)
            s.setCurrentLat(updated.getCurrentLat());

        if (updated.getCurrentLng() != null)
            s.setCurrentLng(updated.getCurrentLng());

        if (updated.getStatus() != null)
            s.setStatus(updated.getStatus());

        if (updated.getRiskScore() != null)
            s.setRiskScore(updated.getRiskScore());

        return shipmentRepository.save(s);
    }

    /* ------------------ LIVE MOVEMENT ------------------ */

    public Shipment moveShipment(Long id) {
        Shipment s = getShipmentById(id);

        try {
            if (s.getActiveRoutePolyline() == null)
                return s;

            ObjectMapper mapper = new ObjectMapper();

            List<Map<String, Object>> route = mapper.readValue(s.getActiveRoutePolyline(), List.class);

            int index = s.getCurrentRouteIndex() == null ? 0 : s.getCurrentRouteIndex();

            if (index < route.size() - 1) {
                index++;

                Map<String, Object> point = route.get(index);

                s.setCurrentRouteIndex(index);
                s.setCurrentLat(Double.valueOf(point.get("lat").toString()));
                s.setCurrentLng(Double.valueOf(point.get("lng").toString()));
            }

        } catch (Exception e) {
            e.printStackTrace();
        }

        return shipmentRepository.save(s);
    }

    /* ------------------ REROUTE (FIXED ERROR) ------------------ */

    public Shipment forceReroute(Long id) {
        Shipment shipment = getShipmentById(id);

        try {
            Map<String, Object> aiResponse = aiIntegrationService.calculateRoute(
                    shipment.getOrigin(),
                    shipment.getDestination());

            ObjectMapper mapper = new ObjectMapper();

            if (aiResponse.containsKey("polyline")) {
                shipment.setActiveRoutePolyline(
                        mapper.writeValueAsString(aiResponse.get("polyline")));

                shipment.setIsRerouted(true);
                shipment.setCurrentRouteIndex(0);

                List<Map<String, Object>> route = (List<Map<String, Object>>) aiResponse.get("polyline");

                if (!route.isEmpty()) {
                    Map<String, Object> first = route.get(0);
                    shipment.setCurrentLat(Double.valueOf(first.get("lat").toString()));
                    shipment.setCurrentLng(Double.valueOf(first.get("lng").toString()));
                }
            }

            if (aiResponse.containsKey("total_risk")) {
                shipment.setRiskScore(Double.valueOf(aiResponse.get("total_risk").toString()).intValue());
            }

            if (aiResponse.containsKey("justification")) {
                shipment.setModeJustification(aiResponse.get("justification").toString());
            }

            if (aiResponse.containsKey("transport_mode")) {
                shipment.setTransportMode(aiResponse.get("transport_mode").toString());
            }

            if (aiResponse.containsKey("estimated_cost_inr")) {
                shipment.setTotalCostInr(Double.valueOf(aiResponse.get("estimated_cost_inr").toString()));
            }

            if (aiResponse.containsKey("carbon_emissions_kg")) {
                shipment.setCarbonEmissions(Double.valueOf(aiResponse.get("carbon_emissions_kg").toString()));
            }

        } catch (Exception e) {
            e.printStackTrace();
        }

        Shipment savedShipment = shipmentRepository.save(shipment);

        // 🔥 Auto-generate alert if the forced reroute is still risky
        if (savedShipment.getRiskScore() != null && savedShipment.getRiskScore() > 30) {
            alertService.generateShipmentAlert(savedShipment, "admin@supplychain.ai", "Admin Forced Reroute");
        }

        return savedShipment;
    }

    /* ------------------ DELETE ------------------ */

    public void deleteShipment(Long id) {
        shipmentRepository.deleteById(id);
    }
}