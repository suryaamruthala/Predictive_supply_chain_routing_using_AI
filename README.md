# 🚢 Predictive Supply Chain Routing — AI-Powered Platform

A hackathon-ready, production-grade supply chain intelligence platform with real-time disruption detection, AI-driven risk prediction, and autonomous multi-modal route optimization.

---

## 🏗️ Architecture

```
supply-chain-routing/
├── frontend/          → React (Vite) + Glassmorphism Dashboard
├── backend/           → Spring Boot (Maven) REST APIs + WebSocket
├── ai-service/        → Python FastAPI AI Engine
└── database/          → MySQL Schema (schema.sql)
```

---

## ⚡ Quick Start (Run All 3 Services)

### Prerequisites

| Tool       | Version   | Download |
|------------|-----------|----------|
| Node.js    | 18+       | https://nodejs.org |
| Java (JDK) | 17 or 20  | https://adoptium.net |
| Python     | 3.10+     | https://python.org |
| MySQL      | 8.0+      | via XAMPP or standalone |
| Maven      | (bundled with Spring Boot IDE) | |

---

### 1. 🗄️ Database Setup

1. Start MySQL (via XAMPP or standalone)
2. The database `supply_chain_db` is created **automatically** by Spring Boot (`createDatabaseIfNotExist=true`)
3. Schema tables are also created automatically via Hibernate (`ddl-auto=update`)

> Optionally run `database/schema.sql` manually for reference.

**Database Credentials** (in `backend/src/main/resources/application.properties`):
```
spring.datasource.url=jdbc:mysql://localhost:3306/supply_chain_db
spring.datasource.username=root
spring.datasource.password=Suryanan.110
```

---

### 2. 🐍 AI Service (Python FastAPI)

```bash
cd ai-service

# Install dependencies
pip install -r requirements.txt

# Start the server
uvicorn main:app --reload --port 8000
```

**Endpoints:**
- `GET  /api/heatmap` — Live risk heat zones (weather, traffic, geopolitics)
- `POST /calculate_route` — AI multi-modal route optimizer
- `POST /analyze_risk` — Segment risk analysis
- `POST /api/news-risk` — Geopolitical risk checker
- `POST /api/simulate/storm` — Admin: inject storm event
- `POST /api/clear/storms` — Admin: remove simulated storms

---

### 3. ☕ Backend (Spring Boot)

```bash
cd backend

# Run with Maven
mvn spring-boot:run
```

Or run `BackendApplication.java` from your IDE.

**REST APIs:**
- `GET  /api/shipments` — List all shipments
- `POST /api/shipments` — Create shipment (calls AI to compute optimal route)
- `DELETE /api/shipments/{id}` — Permanently delete shipment + all linked data
- `PATCH /api/shipments/{id}/status` — Toggle status
- `POST /api/shipments/{id}/reroute` — Force AI reroute
- `GET  /api/alerts` — All system alerts
- `DELETE /api/alerts/{id}` — Permanently dismiss alert
- `POST /api/alerts/storm-reroute` — Admin: trigger storm-based mass reroute

**WebSocket:** `ws://localhost:8080/ws` → topic `/topic/shipments`

---

### 4. ⚛️ Frontend (React + Vite)

```bash
cd frontend

# Install dependencies
npm install

# Start dev server
npm run dev
```

Open **http://localhost:5173**

---

## 🎮 Demo Mode (Hackathon)

| Scenario        | How to Trigger | Expected Result |
|-----------------|----------------|-----------------|
| **War**         | Admin → Inject Storm Anomaly | High risk (>60%), auto reroute, CRITICAL alert |
| **Heavy Rain**  | Weather zone over route    | Medium risk (30-60%), orange indicators |
| **Traffic**     | Traffic zone over route    | Low-medium risk, ROAD penalty |
| **Reroute**     | Admin → Force Reroute button on any shipment | New AI path calculated, isRerouted=true |

---

## 🗺️ Multi-Modal Routing

When you click **Track** on any shipment, the AI Decision Engine shows:
- 🤖 **OPTIMAL** — AI-selected best cost/risk tradeoff
- 🚛 **ROAD** — Land corridor route
- ✈️ **AIR** — Air freight route
- 🚢 **WATER** — Sea freight route

Each mode shows: **Route map polyline + Risk % + Cost (₹) + Carbon (kg CO₂)**

---

## 🌍 Supported Cities (AI Route Graph)

**India:** Mumbai, Delhi, Chennai, Kolkata, Bangalore, Hyderabad, Pune, Ahmedabad  
**Global Hubs:** London, JFK, Singapore, Shanghai, Rotterdam, Dubai, Sydney, Frankfurt, Los Angeles  
**Russia:** Moscow, St. Petersburg, Vladivostok

---

## 🔧 Troubleshooting

| Error | Fix |
|-------|-----|
| `500 on DELETE /api/shipments/{id}` | Restart Spring Boot to apply Cascade schema update |
| `400 Bad Request from /calculate_route` | City not in AI node graph — use a supported city |
| `CORS error` | Ensure all 3 services are running on ports 5173, 8080, 8000 |
| `isRerouted missing in JSON` | Already fixed — `@JsonProperty("isRerouted")` applied |
| `LazyInitializationException` | Already fixed — `@Transactional` added to scheduler |

---

## 🏆 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, TailwindCSS, Leaflet.js, React-Leaflet |
| Backend | Spring Boot 3.4, Spring Data JPA, Spring WebSocket (STOMP) |
| AI Engine | Python 3.10+, FastAPI, NetworkX, Pydantic |
| Database | MySQL 8 (XAMPP) |
| Communication| REST (HTTP), WebSocket (STOMP/SockJS), CORS configured |
