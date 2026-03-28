package com.supplychain.backend.controller;

import com.supplychain.backend.entity.AppUser;
import com.supplychain.backend.repository.AppUserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.bind.annotation.RequestMethod;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/users")
@CrossOrigin(origins = "*", methods = {RequestMethod.GET, RequestMethod.POST, RequestMethod.PUT, RequestMethod.DELETE, RequestMethod.OPTIONS, RequestMethod.PATCH})
public class UserController {

    @Autowired
    private AppUserRepository userRepository;

    @GetMapping
    public List<AppUser> getAllUsers() {
        return userRepository.findAll();
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody AppUser user) {
        return userRepository.findByUsername(user.getUsername())
                .filter(u -> u.getPassword().equals(user.getPassword()))
                .map(u -> ResponseEntity.ok((Object) u))
                .orElse(ResponseEntity.status(401).body(Map.of("error", "Invalid username or password")));
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody AppUser user) {
        if (userRepository.findByUsername(user.getUsername()).isPresent()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Username already taken"));
        }
        if (user.getEmail() != null && userRepository.findByEmail(user.getEmail()).isPresent()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Email already registered"));
        }
        if (user.getRole() == null || user.getRole().isBlank()) {
            user.setRole("ANALYST");
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

