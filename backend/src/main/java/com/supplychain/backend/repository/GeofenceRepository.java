package com.supplychain.backend.repository;

import com.supplychain.backend.entity.Geofence;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface GeofenceRepository extends JpaRepository<Geofence, Long> {
}
