package com.supplychain.backend.controller;

import com.supplychain.backend.entity.AppUser;
import com.supplychain.backend.repository.AppUserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@RestController
@RequestMapping("/api/users")
@CrossOrigin(origins = "*")
public class UserController {

    @Autowired
    private AppUserRepository userRepository;

    @GetMapping
    public List<AppUser> getAllUsers() {
        return userRepository.findAll();
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> payload) {
        String identifier = payload.get("username"); 
        String password = payload.get("password");
        
        System.out.println("Login Attempt with identifier: " + identifier);
        
        Optional<AppUser> userOpt = userRepository.findByUsernameOrEmail(identifier);
        
        if (userOpt.isPresent()) {
            AppUser u = userOpt.get();
            System.out.println("User found in DB! Username: " + u.getUsername() + ", Email: " + u.getEmail());
            if (u.getPassword().equals(password)) {
                return ResponseEntity.ok((Object) u);
            } else {
                System.out.println("Password mismatch for: " + u.getUsername() + " (Expected: " + u.getPassword() + ", Received: " + password + ")");
                return ResponseEntity.status(401).body(Map.of("error", "Invalid username/email or password"));
            }
        } else {
            System.out.println("User NOT found for identifier: " + identifier);
            // DEBUG: Check how many users exist in the DB
            System.out.println("Total users in system: " + userRepository.count());
            return ResponseEntity.status(401).body(Map.of("error", "Invalid username/email or password"));
        }
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody AppUser user) {
        if (userRepository.findByUsername(user.getUsername()).isPresent()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Username already taken"));
        }
        if (user.getEmail() != null && userRepository.findByEmail(user.getEmail()).isPresent()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Email already registered"));
        }
        return ResponseEntity.ok(userRepository.save(user));
    }

    /** Forgot password — generates a reset token and returns it (simulates email send) */
    @PostMapping("/forgot-password")
    public ResponseEntity<?> forgotPassword(@RequestBody Map<String, String> body) {
        String email = body.get("email");
        return userRepository.findByEmail(email)
                .map(u -> {
                    String token = UUID.randomUUID().toString().replace("-", "").substring(0, 8).toUpperCase();
                    u.setResetToken(token);
                    userRepository.save(u);
                    // In production this would send an email. For demo, we return the token directly.
                    return ResponseEntity.ok((Object) Map.of(
                        "message", "Reset token generated. Check your email.",
                        "token", token,   // Remove in production
                        "username", u.getUsername()
                    ));
                })
                .orElse(ResponseEntity.badRequest().body(Map.of("error", "No account found with that email")));
    }

    /** Reset password — validates token and sets new password */
    @PostMapping("/reset-password")
    public ResponseEntity<?> resetPassword(@RequestBody Map<String, String> body) {
        String token    = body.get("token");
        String newPass  = body.get("newPassword");
        if (token == null || newPass == null || newPass.length() < 6) {
            return ResponseEntity.badRequest().body(Map.of("error", "Token and password (min 6 chars) required"));
        }
        return userRepository.findByResetToken(token)
                .map(u -> {
                    u.setPassword(newPass);
                    u.setResetToken(null);
                    userRepository.save(u);
                    return ResponseEntity.ok((Object) Map.of("message", "Password reset successful"));
                })
                .orElse(ResponseEntity.badRequest().body(Map.of("error", "Invalid or expired reset token")));
    }

    @GetMapping("/check-username/{username}")
    public ResponseEntity<?> checkUsername(@PathVariable String username) {
        boolean taken = userRepository.findByUsername(username).isPresent();
        return ResponseEntity.ok(Map.of("taken", taken));
    }
}

