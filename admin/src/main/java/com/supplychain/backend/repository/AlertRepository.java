package com.supplychain.backend.repository;

import com.supplychain.backend.entity.Alert;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface AlertRepository extends JpaRepository<Alert, Long> {
    List<Alert> findByDismissedFalseOrderByCreatedAtDesc();
    List<Alert> findAllByOrderByCreatedAtDesc();
    
    @jakarta.transaction.Transactional
    @org.springframework.data.jpa.repository.Modifying
    void deleteByShipmentId(String shipmentId);
}
