package com.supplychain.backend.repository;

import com.supplychain.backend.entity.RiskLog;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface RiskLogRepository extends JpaRepository<RiskLog, Long> {
    List<RiskLog> findByShipmentIdOrderByTimestampDesc(Long shipmentId);
}
