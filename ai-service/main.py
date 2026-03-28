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

# Geographic Nodes (Global Hubs)
NODES = {
    "Mumbai": {"lat": 19.0760, "lng": 72.8777},
    "Delhi": {"lat": 28.7041, "lng": 77.1025},
    "Chennai": {"lat": 13.0827, "lng": 80.2707},
    "Kolkata": {"lat": 22.5726, "lng": 88.3639},
    "Bangalore": {"lat": 12.9716, "lng": 77.5946},
    "Hyderabad": {"lat": 17.3850, "lng": 78.4867},
    "Pune": {"lat": 18.5204, "lng": 73.8567},
    "Ahmedabad": {"lat": 23.0225, "lng": 72.5714},
    "London": {"lat": 51.4700, "lng": -0.4543},
    "JFK": {"lat": 40.6397, "lng": -73.7789},
    "Singapore": {"lat": 1.2640, "lng": 103.8400},
    "Shanghai": {"lat": 31.2198, "lng": 121.4870},
    "Rotterdam": {"lat": 51.8850, "lng": 4.2867},
    "Dubai": {"lat": 25.2532, "lng": 55.3657},
    "Sydney": {"lat": -33.9473, "lng": 151.1794},
    "Frankfurt": {"lat": 50.0333, "lng": 8.5706},
    "Los Angeles": {"lat": 33.7292, "lng": -118.2620},
    "Moscow": {"lat": 55.7558, "lng": 37.6173},
    "St. Petersburg": {"lat": 59.9311, "lng": 30.3609},
    "Vladivostok": {"lat": 43.1198, "lng": 131.8869}
}

# Base Edges (source, target, distance_km, mode)
# modes: ROAD, AIR, WATER
EDGES = [
    # Domestic Road connections
    ("Mumbai", "Pune", 150, "ROAD"),
    ("Mumbai", "Ahmedabad", 530, "ROAD"),
    ("Mumbai", "Bangalore", 980, "ROAD"),
    ("Pune", "Hyderabad", 560, "ROAD"),
    ("Pune", "Bangalore", 840, "ROAD"),
    ("Ahmedabad", "Delhi", 950, "ROAD"),
    ("Delhi", "Kolkata", 1530, "ROAD"),
    ("Kolkata", "Chennai", 1670, "ROAD"),
    ("Kolkata", "Hyderabad", 1500, "ROAD"),
    ("Chennai", "Bangalore", 350, "ROAD"),
    ("Chennai", "Hyderabad", 630, "ROAD"),
    ("Ahmedabad", "Pune", 660, "ROAD"),
    ("Delhi", "Hyderabad", 1580, "ROAD"),
    
    # Global Air connections
    ("Mumbai", "London", 7200, "AIR"),
    ("London", "JFK", 5500, "AIR"),
    ("JFK", "Los Angeles", 4000, "AIR"),
    ("Mumbai", "Singapore", 3900, "AIR"),
    ("Singapore", "Sydney", 6300, "AIR"),
    ("Dubai", "Frankfurt", 4800, "AIR"),
    ("Delhi", "Dubai", 2200, "AIR"),
    ("Frankfurt", "London", 650, "AIR"),
    
    # Global Water (Sea) connections
    ("Mumbai", "Singapore", 3900, "WATER"),
    ("Singapore", "Shanghai", 4200, "WATER"),
    ("Shanghai", "Los Angeles", 10500, "WATER"),
    ("Rotterdam", "JFK", 6300, "WATER"),
    ("Mumbai", "Dubai", 1900, "WATER"),
    ("Dubai", "Rotterdam", 12000, "WATER"),
    ("Singapore", "Sydney", 6300, "WATER"),
    
    # Local Hub connections
    ("Rotterdam", "Frankfurt", 450, "ROAD"),

    # Russia connections
    ("Frankfurt", "Moscow", 2300, "ROAD"),
    ("Moscow", "St. Petersburg", 700, "ROAD"),
    ("Moscow", "Vladivostok", 9000, "ROAD"),
    ("Moscow", "London", 2500, "AIR"),
    ("Moscow", "Dubai", 3700, "AIR"),
    ("Moscow", "Shanghai", 6800, "AIR"),
    ("St. Petersburg", "Rotterdam", 2000, "WATER"),
    ("Vladivostok", "Shanghai", 1600, "WATER")
]

# Build Multimodal Graphs per mode
G_ROAD = nx.Graph()
G_AIR = nx.Graph()
G_WATER = nx.Graph()

for node, coords in NODES.items():
    G_ROAD.add_node(node, lat=coords["lat"], lng=coords["lng"])
    G_AIR.add_node(node, lat=coords["lat"], lng=coords["lng"])
    G_WATER.add_node(node, lat=coords["lat"], lng=coords["lng"])

for u, v, d, mode in EDGES:
    if mode == "ROAD": G_ROAD.add_edge(u, v, distance=d)
    if mode == "AIR": G_AIR.add_edge(u, v, distance=d)
    if mode == "WATER": G_WATER.add_edge(u, v, distance=d)

# Unit Costs in Rupee (₹) per km
UNIT_COSTS = {
    "AIR": 450.0,
    "ROAD": 85.0,
    "WATER": 18.0
}


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
    standard_polyline: List[Location]
    total_distance: float
    total_risk: float
    total_cost_inr: float
    selected_mode: str
    mode_justification: str
    status: str
    carbon_emissions_kg: float
    alerts: List[str]
    alternatives: List[Dict[str, Any]]

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
    
    # 4. Customs & Compliance (Static zone near Mumbai port)
    customs_lat = 18.9438
    customs_lng = 72.8389
    customs_intensity = 55 + math.sin(t / 30.0) * 15 # Pulses 40-70

    base_maps = [
        {"id": "storm_01", "type": "WEATHER", "lat": weather_lat, "lng": weather_lng, "radius_km": 300, "intensity": weather_intensity},
        {"id": "traffic_01", "type": "TRAFFIC", "lat": traffic_lat, "lng": traffic_lng, "radius_km": 100, "intensity": traffic_intensity},
        {"id": "news_01", "type": "GEOPOLITICAL", "lat": news_lat, "lng": news_lng, "radius_km": 250, "intensity": news_intensity},
        {"id": "customs_01", "type": "CUSTOMS", "lat": customs_lat, "lng": customs_lng, "radius_km": 150, "intensity": customs_intensity}
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
    # Use Haversine for real global scale
    lat1, lng1, lat2, lng2 = map(math.radians, [lat1, lng1, lat2, lng2])
    dlat = lat2 - lat1
    dlng = lng2 - lng1
    a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlng/2)**2
    c = 2 * math.asin(math.sqrt(a))
    return c * 6371.0 # Radius of Earth in km

def generate_dynamic_risk(u, v, mode):
    """Calculates risk on an edge based on proximity to live heat zones."""
    u_lat, u_lng = NODES[u]["lat"], NODES[u]["lng"]
    v_lat, v_lng = NODES[v]["lat"], NODES[v]["lng"]
    mid_lat, mid_lng = (u_lat+v_lat)/2.0, (u_lng+v_lng)/2.0
    
    max_risk = 5.0 # Baseline
    for zone in get_active_heatmaps():
        # Mode sensitivity
        if mode == "AIR" and zone["type"] != "WEATHER": continue
        if mode == "ROAD" and zone["type"] == "WEATHER": continue
        
        # Distance from edge midpoint to risk zone
        dist = get_distance(mid_lat, mid_lng, float(zone["lat"]), float(zone["lng"]))
        rad = float(zone["radius_km"])
        if dist < rad:
            risk_factor = float(zone["intensity"]) * (1.0 - (dist / rad))
            max_risk = max(max_risk, risk_factor)
            
    return float(max_risk)

@app.post("/calculate_route", response_model=RouteResponse)
def calculate_route(req: RouteRequest):
    if req.origin not in NODES or req.destination not in NODES:
        raise HTTPException(status_code=400, detail="Invalid origin or destination.")
    
    best_option = None
    all_alerts = []
    alternatives = []
    
    # Try each mode
    for mode_name, graph in [("ROAD", G_ROAD), ("AIR", G_AIR), ("WATER", G_WATER)]:
        if not graph.has_node(req.origin) or not graph.has_node(req.destination):
            continue
            
        # Update dynamic risk weights for this mode
        for u, v, data in graph.edges(data=True):
            risk = generate_dynamic_risk(u, v, mode_name)
            data['current_risk'] = risk
            # Penalty: risk above 50 skyrockets effective weight
            risk_penalty = math.exp(risk / 15.0) 
            data['effective_weight'] = data['distance'] * risk_penalty
        
        try:
            # Optimized Path
            path = nx.shortest_path(graph, source=req.origin, target=req.destination, weight="effective_weight")
            # Standard Shortest Path 
            std_path = nx.shortest_path(graph, source=req.origin, target=req.destination, weight="distance")
            
            # Distance and Risk for optimized path
            total_dist = 0.0
            total_risk = 0.0
            for i in range(len(path) - 1):
                u, v = path[i], path[i+1]
                data = graph.get_edge_data(u, v)
                total_dist += data['distance']
                total_risk += data['current_risk']
            
            avg_risk = total_risk / (len(path) - 1)
            base_cost = total_dist * UNIT_COSTS[mode_name]
            # Effective cost includes risk-adjusted insurance/delay overhead (Rupee ₹)
            risk_multiplier = 1.0 + (avg_risk / 100.0) ** 2
            final_cost = base_cost * risk_multiplier
            
            # Polylines
            polyline = [Location(lat=NODES[n]["lat"], lng=NODES[n]["lng"], name=n) for n in path]
            std_polyline = [Location(lat=NODES[n]["lat"], lng=NODES[n]["lng"], name=n) for n in std_path]
            
            carbon_emissions_kg = total_dist * (3.0 if mode_name == "ROAD" else 1.2 if mode_name == "WATER" else 15.0)
            status = "SAFE"
            if avg_risk > 60: status = "HIGH_RISK"
            elif avg_risk > 30: status = "MEDIUM_RISK"

            option = {
                "path": path,
                "polyline": polyline,
                "standard_polyline": std_polyline,
                "total_distance": total_dist,
                "total_risk": avg_risk,
                "total_cost_inr": final_cost,
                "selected_mode": mode_name,
                "base_cost": base_cost,
                "carbon_emissions_kg": carbon_emissions_kg,
                "status": status
            }
            
            alternatives.append({
                "mode": mode_name,
                "path": path,
                "polyline": [{'lat': p.lat, 'lng': p.lng, 'name': p.name} for p in polyline],
                "total_distance": total_dist,
                "total_risk": avg_risk,
                "total_cost_inr": final_cost,
                "carbon_emissions_kg": carbon_emissions_kg,
                "status": status
            })
            
            if best_option is None or final_cost < best_option["total_cost_inr"]:
                best_option = option
                
        except nx.NetworkXNoPath:
            continue

    if not best_option:
        raise HTTPException(status_code=404, detail="No path found for any mode.")

    justification = f"{best_option['selected_mode']} selected for efficiency. Total cost: ₹{int(best_option['total_cost_inr']):,}."
    if best_option['selected_mode'] == 'AIR' and best_option['total_distance'] > 2000:
        justification += " Optimized for long-range global transit."

    return RouteResponse(
        path=best_option["path"],
        polyline=best_option["polyline"],
        standard_polyline=best_option["standard_polyline"],
        total_distance=best_option["total_distance"],
        total_risk=best_option["total_risk"],
        total_cost_inr=best_option["total_cost_inr"],
        selected_mode=best_option["selected_mode"],
        mode_justification=justification,
        status=best_option["status"],
        carbon_emissions_kg=best_option["carbon_emissions_kg"],
        alerts=all_alerts,
        alternatives=alternatives
    )


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
            "weather": int(risk * 0.30),
            "news": int(risk * 0.25),
            "geopolitics": int(risk * 0.25),
            "customs": int(risk * 0.20)
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
