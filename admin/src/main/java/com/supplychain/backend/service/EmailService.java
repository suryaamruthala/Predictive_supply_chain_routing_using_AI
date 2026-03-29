package com.supplychain.backend.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
public class EmailService {

    @Autowired
    private JavaMailSender mailSender;

    public void sendAlertEmail(String to, String message) {

        SimpleMailMessage mail = new SimpleMailMessage();
        mail.setTo(to);
        mail.setSubject("🚨 Smart Logistics Alert");
        mail.setText(
                "AI ALERT SYSTEM\n\n" +
                        message +
                        "\n\nStay Safe,\nSmart Logistics AI");

        try {
            mailSender.send(mail);
        } catch (Exception e) {
            System.err.println("Failed to send email alert: " + e.getMessage());
        }
    }
}