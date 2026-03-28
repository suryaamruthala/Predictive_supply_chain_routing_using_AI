package com.supplychain.backend.service;

import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.http.ResponseEntity;
import java.util.Map;
import java.util.HashMap;

@Service
public class AiIntegrationService {
    
    private final RestTemplate restTemplate = new RestTemplate();
    private final String AI_SERVICE_URL = "http://localhost:8000/calculate_route";
    private final String AI_RISK_URL = "http://localhost:8000/analyze_risk";

    public Map<String, Object> calculateRoute(String origin, String destination) {
        try {
            Map<String, String> request = new HashMap<>();
            request.put("origin", origin);
            request.put("destination", destination);
            
            ResponseEntity<Map> response = restTemplate.postForEntity(AI_SERVICE_URL, request, Map.class);
            return response.getBody();
        } catch (Exception e) {
            e.printStackTrace();
            return null; // Handle thoughtfully in caller
        }
    }
    
    public Map<String, Object> getRiskScore(Double startLat, Double startLng, Double endLat, Double endLng, String u, String v) {
        try {
            Map<String, Object> request = new HashMap<>();
            request.put("start_lat", startLat);
            request.put("start_lng", startLng);
            request.put("end_lat", endLat);
            request.put("end_lng", endLng);
            request.put("origin_name", u);
            request.put("destination_name", v);
            
            ResponseEntity<Map> response = restTemplate.postForEntity(AI_RISK_URL, request, Map.class);
            return response.getBody();
        } catch (Exception e) {
            e.printStackTrace();
            Map<String, Object> fallback = new HashMap<>();
            fallback.put("risk_score", 0);
            fallback.put("status", "SAFE");
            return fallback;
        }
    }
}
