package com.supplychain.backend;

import com.supplychain.backend.entity.Shipment;
import com.supplychain.backend.repository.ShipmentRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;

import java.time.LocalDateTime;

@SpringBootApplication
public class BackendApplication {

	public static void main(String[] args) {
		SpringApplication.run(BackendApplication.class, args);
	}

	@Bean
	CommandLineRunner initDatabase(ShipmentRepository repository) {
		return args -> {
			if (repository.count() == 0) {
				Shipment shipment = new Shipment();
				shipment.setName("Medical Supplies - TRK#9921");
				shipment.setOrigin("Mumbai");
				shipment.setDestination("Delhi");
				shipment.setStatus("IN_TRANSIT");
				shipment.setCurrentLat(19.0760);
				shipment.setCurrentLng(72.8777);
				shipment.setRiskScore(10);
				shipment.setEstimatedDelivery(LocalDateTime.now().plusDays(2));
				
				// A simple mock polyline from Mumbai to Pune to Ahmedabad to Delhi to simulate some motion
				String polylineJson = "[\n" +
						"  {\"lat\": 19.0760, \"lng\": 72.8777, \"name\": \"Mumbai\"},\n" +
						"  {\"lat\": 18.5204, \"lng\": 73.8567, \"name\": \"Pune\"},\n" +
						"  {\"lat\": 23.0225, \"lng\": 72.5714, \"name\": \"Ahmedabad\"},\n" +
						"  {\"lat\": 28.7041, \"lng\": 77.1025, \"name\": \"Delhi\"}\n" +
						"]";
				
				shipment.setActiveRoutePolyline(polylineJson);
				shipment.setCurrentRouteIndex(0);
				shipment.setCarbonEmissions(0.0);
				shipment.setIsRerouted(Boolean.FALSE);

				repository.save(shipment);
				
				System.out.println("Seeded database with demo shipment TRK#9921");
			}
		};
	}
}
