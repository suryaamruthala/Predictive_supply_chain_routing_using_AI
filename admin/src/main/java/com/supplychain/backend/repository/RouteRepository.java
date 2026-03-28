package com.supplychain.backend.repository;

import com.supplychain.backend.entity.Route;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface RouteRepository extends JpaRepository<Route, Long> {
    List<Route> findByShipmentId(Long shipmentId);
    Optional<Route> findByShipmentIdAndIsCurrentTrue(Long shipmentId);
}
