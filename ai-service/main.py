from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any
import networkx as nx
import random
import math
import time
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="AI Risk Prediction & Routing Service")

# Allow frontend to directly fetch heatmap grids
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

injected_storms = []

# Geographic Nodes (Cities in India for simulation)
NODES = {
    "Mumbai": {"lat": 19.0760, "lng": 72.8777},
    "Delhi": {"lat": 28.7041, "lng": 77.1025},
    "Chennai": {"lat": 13.0827, "lng": 80.2707},
    "Kolkata": {"lat": 22.5726, "lng": 88.3639},
    "Bangalore": {"lat": 12.9716, "lng": 77.5946},
    "Hyderabad": {"lat": 17.3850, "lng": 78.4867},
    "Pune": {"lat": 18.5204, "lng": 73.8567},
    "Ahmedabad": {"lat": 23.0225, "lng": 72.5714}
}

# Base Edges (source, target, distance_km)
EDGES = [
    ("Mumbai", "Pune", 150),
    ("Mumbai", "Ahmedabad", 530),
    ("Mumbai", "Bangalore", 980),
    ("Pune", "Hyderabad", 560),
    ("Pune", "Bangalore", 840),
    ("Ahmedabad", "Delhi", 950),
    ("Delhi", "Kolkata", 1530),
    ("Kolkata", "Chennai", 1670),
    ("Kolkata", "Hyderabad", 1500),
    ("Chennai", "Bangalore", 350),
    ("Chennai", "Hyderabad", 630),
    ("Ahmedabad", "Pune", 660),
    ("Delhi", "Hyderabad", 1580)
]

# Build Graph
G = nx.Graph()
for node, coords in NODES.items():
    G.add_node(node, lat=coords["lat"], lng=coords["lng"])

for u, v, d in EDGES:
    G.add_edge(u, v, distance=d, base_risk=0)


class RouteRequest(BaseModel):
    origin: str
    destination: str

class Location(BaseModel):
    lat: float
    lng: float
    name: str

class RouteResponse(BaseModel):
    path: List[str]
    polyline: List[Location]
    total_distance: float
    total_risk: float
    status: str
    carbon_emissions_kg: float
    alerts: List[str]

    alerts: List[str]

def get_active_heatmaps():
    """Simulates live data streams (Weather, Traffic, Geopolitics) generating moving/pulsing risk zones."""
    t = time.time()
    
    # 1. Moving Weather System (Moves slowly from West to East)
    # Starts near Mumbai, drifts towards Central India
    weather_lat = 19.0 + math.sin(t / 100.0) * 3.0
    weather_lng = 73.0 + (t % 1000) / 100.0 * 1.5 
    weather_intensity = 80 + math.sin(t / 50.0) * 20 # Pulses 60-100
    
    # 2. Static Traffic Congestion (Geofenced around Delhi, pulses rapidly)
    traffic_lat = 28.7041
    traffic_lng = 77.1025
    traffic_intensity = 60 + math.sin(t / 10.0) * 30 # Pulses 30-90
    
    # 3. Geopolitical/News Risk (Pops up randomly around Chennai)
    news_lat = 13.0827 + math.cos(t / 200.0) * 2.0
    news_lng = 80.2707 + math.sin(t / 200.0) * 2.0
    news_intensity = 70 if (int(t / 60) % 3 == 0) else 20 # Spikes every few minutes
    
    base_maps = [
        {"id": "storm_01", "type": "WEATHER", "lat": weather_lat, "lng": weather_lng, "radius_km": 300, "intensity": weather_intensity},
        {"id": "traffic_01", "type": "TRAFFIC", "lat": traffic_lat, "lng": traffic_lng, "radius_km": 100, "intensity": traffic_intensity},
        {"id": "news_01", "type": "GEOPOLITICAL", "lat": news_lat, "lng": news_lng, "radius_km": 250, "intensity": news_intensity}
    ]
    return base_maps + injected_storms

@app.post("/api/simulate/storm")
def simulate_storm():
    storm = {
        "id": f"sim_storm_{int(time.time())}", 
        "type": "WEATHER", 
        "lat": 21.1458 + random.uniform(-2, 2), # Base Central India
        "lng": 79.0882 + random.uniform(-2, 2), 
        "radius_km": 500, 
        "intensity": 99.0
    }
    injected_storms.append(storm)
    return {"message": "Storm simulated successfully!", "storm": storm}

@app.post("/api/clear/storms")
def clear_storms():
    injected_storms.clear()
    return {"message": "Simulated storms cleared."}

@app.get("/api/heatmap")
def get_heatmap():
    return {"timestamp": time.time(), "zones": get_active_heatmaps()}

def get_distance(lat1, lng1, lat2, lng2):
    """Approximate distance in km"""
    return math.sqrt((lat1-lat2)**2 + (lng1-lng2)**2) * 111.0

def generate_dynamic_risk(u, v):
    """Calculates risk on an edge based on proximity to live heat zones."""
    u_lat, u_lng = NODES[u]["lat"], NODES[u]["lng"]
    v_lat, v_lng = NODES[v]["lat"], NODES[v]["lng"]
    mid_lat, mid_lng = (u_lat+v_lat)/2.0, (u_lng+v_lng)/2.0
    
    max_risk = 5.0 # Baseline
    for zone in get_active_heatmaps():
        # Check distance from edge midpoint to the risk zone
        dist = get_distance(mid_lat, mid_lng, float(zone["lat"]), float(zone["lng"]))
        rad = float(zone["radius_km"])
        if dist < rad:
            # Risk drops off linearly with distance
            risk_factor = float(zone["intensity"]) * (1.0 - (dist / rad))
            max_risk = max(max_risk, risk_factor)
            
    return float(max_risk)

@app.post("/calculate_route", response_model=RouteResponse)
def calculate_route(req: RouteRequest):
    if req.origin not in NODES or req.destination not in NODES:
        raise HTTPException(status_code=400, detail="Invalid origin or destination. Available nodes: " + ", ".join(NODES.keys()))
    
    # Update edges with current dynamic risk
    alerts = []
    for u, v, data in G.edges(data=True):
        risk = generate_dynamic_risk(u, v)
        data['current_risk'] = risk
        
        # Effective weight: Highly penalize risk to force avoiding heat zones
        # Exponential curve so a 90 risk is overwhelmingly avoided
        risk_penalty = math.exp(risk / 20.0) 
        data['effective_weight'] = data['distance'] * risk_penalty
        
        
        if risk > 65.0:
            alerts.append(f"AI Warning: High hazard density ({int(risk)}%) detected blocking {u}-{v} corridor.")

    try:
        # Calculate optimal path
        path = nx.shortest_path(G, source=req.origin, target=req.destination, weight="effective_weight")
        
        # Compile response
        polyline = []
        total_dist = 0.0
        total_risk = 0.0
        
        for i in range(len(path)):
            node = path[i]
            polyline.append(Location(
                lat=float(NODES[node]["lat"]), 
                lng=float(NODES[node]["lng"]), 
                name=node
            ))
            if i < len(path) - 1:
                u, v = path[i], path[i+1]
                edge_data = G.get_edge_data(u, v)
                total_dist += float(edge_data.get('distance', 0.0))
                total_risk += float(edge_data.get('current_risk', 0.0))
        
        avg_risk = float(total_risk) / float(len(path) - 1) if len(path) > 1 else 0.0
        status = "SAFE"
        if avg_risk > 60.0:
            status = "HIGH_RISK"
        elif avg_risk > 30.0:
            status = "MEDIUM_RISK"
            
        # Carbon emissions: approx 0.15 kg CO2 per ton-km. Assume 20 ton truck -> 3 kg/km
        emissions = float(total_dist * 3.0)
            
        return RouteResponse(
            path=path,
            polyline=polyline,
            total_distance=float(total_dist),
            total_risk=float(avg_risk),
            status=status,
            carbon_emissions_kg=float(emissions),
            alerts=alerts
        )
        
    except nx.NetworkXNoPath:
        raise HTTPException(status_code=404, detail="No path found between the specified origin and destination.")


class RouteData(BaseModel):
    start_lat: float
    start_lng: float
    end_lat: float
    end_lng: float
    origin_name: str = ""
    destination_name: str = ""

@app.post("/analyze_risk")
def analyze_risk(data: RouteData):
    """Fallback simple risk analyzer for segment ticks"""
    # If we know the named Edge, we could look it up. Otherwise fallback to random for the segment.
    # Fallback simulation
    risk = 25.0
    for zone in get_active_heatmaps():
        # Fake check
        risk = max(risk, float(zone["intensity"]) * 0.5)
        
    risk = float(min(100.0, max(0.0, float(risk))))
    
    status = "SAFE"
    if risk > 70:
        status = "HIGH_RISK"
    elif risk > 40:
        status = "MEDIUM_RISK"
        
    return {
        "risk_score": risk,
        "status": status,
        "factors": {
            "weather": int(risk * 0.3),
            "traffic": int(risk * 0.5),
            "news": int(risk * 0.2)
        }
    }

class NlpRequest(BaseModel):
    news_text: str

@app.post("/analyze_news")
def analyze_news(req: NlpRequest):
    words = req.news_text.lower()
    risk = 0
    if any(word in words for word in ["war", "conflict", "strike", "riot"]):
        risk = 85
    elif any(word in words for word in ["delay", "protest", "heavy rain", "flood"]):
        risk = 60
    elif any(word in words for word in ["traffic", "congestion", "accident"]):
        risk = 40
    return {"text_risk_score": risk}


# Conflict zones — cities where geopolitical tension is elevated
CONFLICT_ZONES = {
    "war": ["Kolkata", "Chennai", "Hyderabad"],       # Eastern corridor
    "flooding": ["Mumbai", "Pune"],                    # Western corridor  
    "protest": ["Delhi", "Ahmedabad"],                 # Northern corridor
}

# Simulated news headlines for demonstration (normally fetched from NewsAPI)
SIMULATED_NEWS = [
    {"headline": "Armed conflict escalating in Eastern India corridor", "severity": "war"},
    {"headline": "Major flooding reported near Mumbai and Pune regions", "severity": "flooding"},
    {"headline": "Protests disrupting transport links in Delhi-Ahmedabad route", "severity": "protest"},
]

class NewsRiskRequest(BaseModel):
    origin: str
    destination: str
    # Optionally pass live news text to analyze
    news_override: str = ""

@app.post("/api/news-risk")
def check_news_risk(req: NewsRiskRequest):
    """
    Checks if there is an active conflict / geopolitical risk between origin and destination.
    In production, this would call a real NewsAPI. For now we simulate based on known zones.
    """
    origin = req.origin
    destination = req.destination
    route_nodes = {origin, destination}
    
    detected_risks = []
    max_risk = 0
    should_avoid = False
    
    # Check simulated news against route
    for news_item in SIMULATED_NEWS:
        severity = news_item["severity"]
        affected_cities = CONFLICT_ZONES.get(severity, [])
        
        # If either the origin or destination is in an affected zone, flag it
        if route_nodes.intersection(set(affected_cities)):
            risk_score = 90 if severity == "war" else 65 if severity == "flooding" else 50
            detected_risks.append({
                "headline": news_item["headline"],
                "severity": severity,
                "risk_score": risk_score,
                "affected_cities": [c for c in affected_cities if c in route_nodes]
            })
            max_risk = max(max_risk, risk_score)
            if severity == "war":
                should_avoid = True
    
    # Check explicit news text if provided
    if req.news_override:
        override_lower = req.news_override.lower()
        if any(w in override_lower for w in ["war", "conflict", "attack", "airstrike"]):
            should_avoid = True
            max_risk = max(max_risk, 90)
            detected_risks.append({
                "headline": req.news_override[:100],
                "severity": "war",
                "risk_score": 90,
                "affected_cities": [origin, destination]
            })
    
    return {
        "origin": origin,
        "destination": destination,
        "risk_score": max_risk,
        "should_avoid_route": should_avoid,
        "detected_risks": detected_risks,
        "recommendation": ("AVOID THIS ROUTE — Active conflict detected. Use alternate corridor." 
                          if should_avoid 
                          else "Route appears clear of major geopolitical disruptions.")
    }
