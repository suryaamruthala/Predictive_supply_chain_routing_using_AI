package com.supplychain.backend.repository;

import com.supplychain.backend.entity.TrackingEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface TrackingEventRepository extends JpaRepository<TrackingEvent, Long> {
    List<TrackingEvent> findByShipmentIdOrderByTimestampDesc(Long shipmentId);
}
