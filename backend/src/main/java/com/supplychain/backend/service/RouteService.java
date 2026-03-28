package com.supplychain.backend.service;

import com.supplychain.backend.entity.Route;
import com.supplychain.backend.entity.Shipment;
import com.supplychain.backend.repository.RouteRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class RouteService {

    @Autowired
    private RouteRepository routeRepository;

    public Route createRoute(Shipment shipment, String pathJson, double distance, String riskLevel) {
        Route route = new Route();
        route.setShipment(shipment);
        route.setPathCoordinatesJson(pathJson);
        route.setDistance(distance);
        route.setRiskLevel(riskLevel);
        route.setIsCurrent(true);
        return routeRepository.save(route);
    }
    
    public Route getCurrentRoute(Long shipmentId) {
        return routeRepository.findByShipmentIdAndIsCurrentTrue(shipmentId).orElse(null);
    }
}
