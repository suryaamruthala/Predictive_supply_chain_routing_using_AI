-- ============================================
-- Predictive Supply Chain Routing - SQL Schema
-- ============================================

CREATE DATABASE IF NOT EXISTS supply_chain_db;
USE supply_chain_db;

-- Shipments table (managed by Hibernate auto-DDL)
-- This file documents the expected schema for reference.

CREATE TABLE IF NOT EXISTS shipment (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255),
    origin VARCHAR(255),
    destination VARCHAR(255),
    status VARCHAR(50),                  -- IN_TRANSIT, DELAYED, REROUTED, DELIVERED
    current_lat DOUBLE,
    current_lng DOUBLE,
    risk_score INT,
    estimated_delivery DATETIME(6),
    active_route_polyline LONGTEXT,     -- JSON array of {lat, lng, name}
    standard_route_polyline LONGTEXT,   -- Original route before rerouting
    transport_mode VARCHAR(20),         -- AIR, ROAD, WATER
    total_cost_inr DOUBLE,
    mode_justification LONGTEXT,
    current_route_index INT,
    carbon_emissions DOUBLE,
    is_rerouted BIT,
    reroute_alert_data LONGTEXT,        -- JSON array of alert messages
    alternate_routes_data LONGTEXT      -- JSON array of multi-modal alternatives
);

-- Routes table (for storing computed paths)
CREATE TABLE IF NOT EXISTS route (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    shipment_id BIGINT,
    path_coordinates_json LONGTEXT,
    distance DOUBLE,
    risk_level VARCHAR(20),             -- SAFE, MEDIUM, HIGH
    is_current BIT,
    FOREIGN KEY (shipment_id) REFERENCES shipment(id) ON DELETE CASCADE
);

-- Tracking events (live position logs)
CREATE TABLE IF NOT EXISTS tracking_event (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    shipment_id BIGINT,
    lat DOUBLE,
    lng DOUBLE,
    timestamp DATETIME(6),
    FOREIGN KEY (shipment_id) REFERENCES shipment(id) ON DELETE CASCADE
);

-- Risk logs (historical risk readings per shipment segment)
CREATE TABLE IF NOT EXISTS risk_log (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    shipment_id BIGINT,
    risk_score INT,
    risk_factors_json TEXT,
    status VARCHAR(50),
    timestamp DATETIME(6),
    FOREIGN KEY (shipment_id) REFERENCES shipment(id) ON DELETE CASCADE
);

-- Alerts table (admin-facing alerts from AI engine & reroutes)
CREATE TABLE IF NOT EXISTS alerts (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    type VARCHAR(50),                   -- WEATHER, TRAFFIC, GEOPOLITICAL, REROUTE, ROUTE_RISK
    shipment_id VARCHAR(50),
    cargo_name VARCHAR(255),
    message TEXT,
    severity VARCHAR(20),              -- CRITICAL, HIGH, MEDIUM
    created_at DATETIME(6),
    dismissed BIT DEFAULT 0
);

-- Users table (authentication)
CREATE TABLE IF NOT EXISTS app_user (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(255) UNIQUE,
    password VARCHAR(255),
    email VARCHAR(255) UNIQUE,
    role VARCHAR(50),                   -- ADMIN, MANAGER, ANALYST
    reset_token VARCHAR(255)
);

-- Geofences table
CREATE TABLE IF NOT EXISTS geofence (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255),
    lat DOUBLE,
    lng DOUBLE,
    radius_km DOUBLE,
    risk_type VARCHAR(50)
);
