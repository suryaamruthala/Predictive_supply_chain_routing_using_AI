package com.supplychain.backend.service;

import com.supplychain.backend.entity.Alert;
import com.supplychain.backend.entity.Shipment;
import com.supplychain.backend.repository.AlertRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class AlertService {

    @Autowired
    private AlertRepository alertRepository;

    @Autowired
    private EmailService emailService;

    /* 🔥 MAIN ALERT ENGINE */
    public Alert generateShipmentAlert(Shipment s, String email, String altRoute) {

        int risk = s.getRiskScore() != null ? s.getRiskScore() : 0;

        Alert alert = new Alert();
        alert.setShipmentId(String.valueOf(s.getId()));
        alert.setCargoName(s.getName());
        alert.setUserEmail(email);

        String message;
        String severity;
        String type = "RISK";

        if (risk > 70) {
            severity = "CRITICAL";

            message = "🚨 HIGH RISK (" + risk + "%)\n" +
                    "Shipment: " + s.getName() + "\n" +
                    "Route: " + s.getOrigin() + " → " + s.getDestination() + "\n\n" +
                    "⚠ Immediate route change required.\n" +
                    "➡ Suggested Route: " + altRoute;
        }

        else if (risk >= 45) {
            severity = "HIGH";

            message = "⚠ MEDIUM RISK (" + risk + "%)\n" +
                    "Shipment: " + s.getName() + "\n\n" +
                    "Drive carefully.\n" +
                    "➡ Alternate Route Suggested: " + altRoute;
        }

        else {
            severity = "LOW";

            message = "✅ LOW RISK (" + risk + "%)\n" +
                    "Shipment: " + s.getName() + " is safe.";
        }

        alert.setSeverity(severity);
        alert.setMessage(message);
        alert.setType(type);

        Alert saved = alertRepository.save(alert);

        // 🔥 EMAIL
        if (email != null && !email.isEmpty()) {
            emailService.sendAlertEmail(email, message);
        }

        return saved;
    }
}