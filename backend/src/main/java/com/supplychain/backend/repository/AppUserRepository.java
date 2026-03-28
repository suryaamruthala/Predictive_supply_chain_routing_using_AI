package com.supplychain.backend.repository;

import com.supplychain.backend.entity.AppUser;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface AppUserRepository extends JpaRepository<AppUser, Long> {
    Optional<AppUser> findByUsername(String username);
    Optional<AppUser> findByEmail(String email);

    @Query("SELECT u FROM AppUser u WHERE u.username = :identifier OR u.email = :identifier")
    Optional<AppUser> findByUsernameOrEmail(@Param("identifier") String identifier);

    Optional<AppUser> findByResetToken(String resetToken);
}
