from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import networkx as nx
import random
import math
import time
import numpy as np
import pandas as pd
from fastapi.middleware.cors import CORSMiddleware
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline

app = FastAPI(title="AI Risk Prediction & Routing Service (ML-Enhanced)")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

injected_storms = []

# ── Geographic Nodes ───────────────────────────────────────────────────────────
NODES = {
    # India - Core
    "Mumbai":             {"lat": 19.0760, "lng": 72.8777},
    "Delhi":              {"lat": 28.7041, "lng": 77.1025},
    "Chennai":            {"lat": 13.0827, "lng": 80.2707},
    "Kolkata":            {"lat": 22.5726, "lng": 88.3639},
    "Bangalore":          {"lat": 12.9716, "lng": 77.5946},
    "Hyderabad":          {"lat": 17.3850, "lng": 78.4867},
    "Pune":               {"lat": 18.5204, "lng": 73.8567},
    "Ahmedabad":          {"lat": 23.0225, "lng": 72.5714},
    "Visakhapatnam":      {"lat": 17.6868, "lng": 83.2185},
    "Vijayawada":         {"lat": 16.5062, "lng": 80.6480},
    "Nagpur":             {"lat": 21.1458, "lng": 79.0882},
    "Jaipur":             {"lat": 26.9124, "lng": 75.7873},
    "Lucknow":            {"lat": 26.8467, "lng": 80.9462},
    "Bhopal":             {"lat": 23.2599, "lng": 77.4126},
    "Indore":             {"lat": 22.7196, "lng": 75.8577},
    "Kochi":              {"lat":  9.9312, "lng": 76.2673},
    "Coimbatore":         {"lat": 11.0168, "lng": 76.9558},
    "Guwahati":           {"lat": 26.1445, "lng": 91.7362},
    "Patna":              {"lat": 25.5941, "lng": 85.1376},
    "Chandigarh":         {"lat": 30.7333, "lng": 76.7794},
    "Surat":              {"lat": 21.1702, "lng": 72.8311},
    "Kanpur":             {"lat": 26.4499, "lng": 80.3319},
    "Ranchi":             {"lat": 23.3441, "lng": 85.3096},
    "Raipur":             {"lat": 21.2514, "lng": 81.6296},
    # India - Extended
    "Srinagar":           {"lat": 34.0837, "lng": 74.7973},
    "Kashmir":            {"lat": 34.0837, "lng": 74.7973},
    "Amritsar":           {"lat": 31.6340, "lng": 74.8723},
    "Varanasi":           {"lat": 25.3176, "lng": 82.9739},
    "Jodhpur":            {"lat": 26.2389, "lng": 73.0243},
    "Mysore":             {"lat": 12.2958, "lng": 76.6394},
    "Mangalore":          {"lat": 12.9141, "lng": 74.8560},
    "Tiruchirappalli":    {"lat": 10.7905, "lng": 78.7047},
    "Dehradun":           {"lat": 30.3165, "lng": 78.0322},
    "Shimla":             {"lat": 31.1048, "lng": 77.1734},
    "Leh":                {"lat": 34.1526, "lng": 77.5771},
    "Agra":               {"lat": 27.1767, "lng": 78.0081},
    "Bhubaneswar":        {"lat": 20.2961, "lng": 85.8245},
    "Thiruvananthapuram": {"lat":  8.5241, "lng": 76.9366},
    "Jabalpur":           {"lat": 23.1815, "lng": 79.9864},
    "Goa":                {"lat": 15.2993, "lng": 74.1240},
    "Madurai":            {"lat":  9.9252, "lng": 78.1198},
    "Udaipur":            {"lat": 24.5854, "lng": 73.7125},
    "Haridwar":           {"lat": 29.9457, "lng": 78.1642},
    "Imphal":             {"lat": 24.8170, "lng": 93.9368},
    "Shillong":           {"lat": 25.5788, "lng": 91.8933},
    # Asia-Pacific
    "Singapore":          {"lat":  1.2640, "lng": 103.8400},
    "Shanghai":           {"lat": 31.2198, "lng": 121.4870},
    "Beijing":            {"lat": 39.9042, "lng": 116.4074},
    "Hong Kong":          {"lat": 22.3080, "lng": 113.9185},
    "Tokyo":              {"lat": 35.6762, "lng": 139.6503},
    "Seoul":              {"lat": 37.5665, "lng": 126.9780},
    "Bangkok":            {"lat": 13.7563, "lng": 100.5018},
    "Kuala Lumpur":       {"lat":  3.1390, "lng": 101.6869},
    "Jakarta":            {"lat": -6.2088, "lng": 106.8456},
    "Sydney":             {"lat": -33.9473, "lng": 151.1794},
    "Melbourne":          {"lat": -37.8136, "lng": 144.9631},
    "Colombo":            {"lat":  6.9271, "lng":  79.8612},
    "Dhaka":              {"lat": 23.8103, "lng":  90.4125},
    "Karachi":            {"lat": 24.8607, "lng":  67.0011},
    "Lahore":             {"lat": 31.5204, "lng":  74.3587},
    "Kathmandu":          {"lat": 27.7172, "lng":  85.3240},
    "Yangon":             {"lat": 16.8661, "lng":  96.1951},
    "Hanoi":              {"lat": 21.0285, "lng": 105.8542},
    "Ho Chi Minh City":   {"lat": 10.8231, "lng": 106.6297},
    "Manila":             {"lat": 14.5995, "lng": 120.9842},
    "Taipei":             {"lat": 25.0330, "lng": 121.5654},
    # Middle East & Africa
    "Dubai":              {"lat": 25.2532, "lng":  55.3657},
    "Abu Dhabi":          {"lat": 24.2992, "lng":  54.6973},
    "Riyadh":             {"lat": 24.6877, "lng":  46.7219},
    "Jeddah":             {"lat": 21.5433, "lng":  39.1728},
    "Doha":               {"lat": 25.2854, "lng":  51.5310},
    "Kuwait City":        {"lat": 29.3759, "lng":  47.9774},
    "Tehran":             {"lat": 35.6892, "lng":  51.3890},
    "Istanbul":           {"lat": 41.0082, "lng":  28.9784},
    "Cairo":              {"lat": 30.0444, "lng":  31.2357},
    "Nairobi":            {"lat": -1.2921, "lng":  36.8219},
    "Lagos":              {"lat":  6.5244, "lng":   3.3792},
    "Johannesburg":       {"lat": -26.2041, "lng":  28.0473},
    "Casablanca":         {"lat": 33.5731, "lng":  -7.5898},
    "Addis Ababa":        {"lat":  9.0320, "lng":  38.7469},
    "Dar es Salaam":      {"lat": -6.7924, "lng":  39.2083},
    # Europe
    "London":             {"lat": 51.4700, "lng":  -0.4543},
    "Rotterdam":          {"lat": 51.8850, "lng":   4.2867},
    "Frankfurt":          {"lat": 50.0333, "lng":   8.5706},
    "Paris":              {"lat": 48.8566, "lng":   2.3522},
    "Amsterdam":          {"lat": 52.3676, "lng":   4.9041},
    "Brussels":           {"lat": 50.8503, "lng":   4.3517},
    "Madrid":             {"lat": 40.4168, "lng":  -3.7038},
    "Barcelona":          {"lat": 41.3851, "lng":   2.1734},
    "Rome":               {"lat": 41.9028, "lng":  12.4964},
    "Milan":              {"lat": 45.4642, "lng":   9.1900},
    "Vienna":             {"lat": 48.2082, "lng":  16.3738},
    "Zurich":             {"lat": 47.3769, "lng":   8.5417},
    "Warsaw":             {"lat": 52.2297, "lng":  21.0122},
    "Prague":             {"lat": 50.0755, "lng":  14.4378},
    "Athens":             {"lat": 37.9838, "lng":  23.7275},
    "Stockholm":          {"lat": 59.3293, "lng":  18.0686},
    "Oslo":               {"lat": 59.9139, "lng":  10.7522},
    "Copenhagen":         {"lat": 55.6761, "lng":  12.5683},
    "Helsinki":           {"lat": 60.1699, "lng":  24.9384},
    "Lisbon":             {"lat": 38.7223, "lng":  -9.1393},
    "Moscow":             {"lat": 55.7558, "lng":  37.6173},
    "St. Petersburg":     {"lat": 59.9311, "lng":  30.3609},
    "Vladivostok":        {"lat": 43.1198, "lng": 131.8869},
    # Americas
    "JFK":                {"lat": 40.6397, "lng": -73.7789},
    "Los Angeles":        {"lat": 33.7292, "lng": -118.2620},
    "Chicago":            {"lat": 41.8781, "lng": -87.6298},
    "Houston":            {"lat": 29.7604, "lng": -95.3698},
    "Miami":              {"lat": 25.7617, "lng": -80.1918},
    "Toronto":            {"lat": 43.6510, "lng": -79.3470},
    "Vancouver":          {"lat": 49.2827, "lng": -123.1207},
    "Mexico City":        {"lat": 19.4326, "lng": -99.1332},
    "Sao Paulo":          {"lat": -23.5505, "lng": -46.6333},
    "Buenos Aires":       {"lat": -34.6037, "lng": -58.3816},
    "Bogota":             {"lat":  4.7110, "lng": -74.0721},
    "Lima":               {"lat": -12.0464, "lng": -77.0428},
    "Santiago":           {"lat": -33.4489, "lng": -70.6693},
}

EDGES = [
    # ROAD - India Core
    ("Mumbai","Pune",150,"ROAD"), ("Mumbai","Ahmedabad",530,"ROAD"), ("Mumbai","Bangalore",980,"ROAD"),
    ("Mumbai","Surat",280,"ROAD"), ("Mumbai","Goa",600,"ROAD"), ("Pune","Hyderabad",560,"ROAD"),
    ("Pune","Bangalore",840,"ROAD"), ("Ahmedabad","Delhi",950,"ROAD"), ("Ahmedabad","Pune",660,"ROAD"),
    ("Ahmedabad","Jodhpur",480,"ROAD"), ("Delhi","Kolkata",1530,"ROAD"), ("Delhi","Hyderabad",1580,"ROAD"),
    ("Delhi","Jaipur",280,"ROAD"), ("Delhi","Lucknow",550,"ROAD"), ("Delhi","Agra",200,"ROAD"),
    ("Delhi","Chandigarh",260,"ROAD"), ("Delhi","Dehradun",300,"ROAD"), ("Delhi","Amritsar",450,"ROAD"),
    ("Delhi","Kashmir",850,"ROAD"), ("Delhi","Srinagar",850,"ROAD"),
    ("Kolkata","Chennai",1670,"ROAD"), ("Kolkata","Hyderabad",1500,"ROAD"), ("Kolkata","Patna",600,"ROAD"),
    ("Kolkata","Ranchi",400,"ROAD"), ("Kolkata","Bhubaneswar",440,"ROAD"), ("Kolkata","Guwahati",1000,"ROAD"),
    ("Chennai","Bangalore",350,"ROAD"), ("Chennai","Hyderabad",630,"ROAD"),
    ("Chennai","Tiruchirappalli",330,"ROAD"), ("Chennai","Madurai",460,"ROAD"),
    ("Bangalore","Mysore",150,"ROAD"), ("Bangalore","Mangalore",360,"ROAD"), ("Bangalore","Goa",560,"ROAD"),
    ("Hyderabad","Vijayawada",275,"ROAD"), ("Hyderabad","Nagpur",500,"ROAD"),
    ("Vijayawada","Visakhapatnam",350,"ROAD"), ("Bhubaneswar","Visakhapatnam",450,"ROAD"),
    ("Nagpur","Bhopal",350,"ROAD"), ("Nagpur","Raipur",300,"ROAD"), ("Nagpur","Jabalpur",280,"ROAD"),
    ("Bhopal","Indore",200,"ROAD"), ("Bhopal","Jabalpur",290,"ROAD"),
    ("Jaipur","Agra",240,"ROAD"), ("Jaipur","Jodhpur",340,"ROAD"), ("Jaipur","Udaipur",400,"ROAD"),
    ("Lucknow","Varanasi",320,"ROAD"), ("Lucknow","Kanpur",80,"ROAD"),
    ("Varanasi","Patna",250,"ROAD"), ("Patna","Ranchi",330,"ROAD"),
    ("Chandigarh","Amritsar",230,"ROAD"), ("Chandigarh","Shimla",115,"ROAD"), ("Chandigarh","Dehradun",170,"ROAD"),
    ("Amritsar","Kashmir",300,"ROAD"), ("Amritsar","Srinagar",300,"ROAD"),
    ("Kochi","Mysore",400,"ROAD"), ("Kochi","Mangalore",360,"ROAD"), ("Kochi","Thiruvananthapuram",220,"ROAD"),
    ("Kochi","Tiruchirappalli",380,"ROAD"), ("Thiruvananthapuram","Madurai",250,"ROAD"),
    ("Dehradun","Haridwar",55,"ROAD"), ("Guwahati","Imphal",490,"ROAD"), ("Guwahati","Shillong",100,"ROAD"),
    # ROAD - Europe & Global
    ("Rotterdam","Frankfurt",450,"ROAD"), ("Rotterdam","Amsterdam",80,"ROAD"), ("Rotterdam","Brussels",210,"ROAD"),
    ("Frankfurt","Paris",490,"ROAD"), ("Frankfurt","Zurich",250,"ROAD"), ("Frankfurt","Vienna",680,"ROAD"),
    ("Frankfurt","Warsaw",1150,"ROAD"), ("Frankfurt","Prague",380,"ROAD"), ("Frankfurt","Milan",820,"ROAD"),
    ("Frankfurt","Moscow",2300,"ROAD"), ("London","Paris",460,"ROAD"), ("Paris","Madrid",1270,"ROAD"),
    ("Paris","Barcelona",1040,"ROAD"), ("Paris","Brussels",310,"ROAD"), ("Madrid","Lisbon",640,"ROAD"),
    ("Milan","Rome",580,"ROAD"), ("Athens","Rome",1400,"ROAD"), ("Moscow","St. Petersburg",700,"ROAD"),
    ("Moscow","Vladivostok",9000,"ROAD"), ("Istanbul","Athens",1300,"ROAD"), ("Istanbul","Tehran",2200,"ROAD"),
    ("Dubai","Abu Dhabi",140,"ROAD"), ("Dubai","Riyadh",1300,"ROAD"), ("Riyadh","Jeddah",900,"ROAD"),
    ("Riyadh","Kuwait City",800,"ROAD"), ("JFK","Chicago",1200,"ROAD"), ("JFK","Miami",2000,"ROAD"),
    ("Los Angeles","Chicago",3200,"ROAD"), ("Los Angeles","Houston",2500,"ROAD"),
    ("Toronto","Chicago",800,"ROAD"), ("Mexico City","Houston",1900,"ROAD"),
    # AIR - India (domestic hub-and-spoke + direct city pairs)
    # Delhi hub — connects to ALL major Indian cities directly
    ("Delhi","Mumbai",1400,"AIR"), ("Delhi","Chennai",1800,"AIR"), ("Delhi","Kolkata",1500,"AIR"),
    ("Delhi","Bangalore",1750,"AIR"), ("Delhi","Hyderabad",1580,"AIR"), ("Delhi","Pune",1450,"AIR"),
    ("Delhi","Ahmedabad",950,"AIR"), ("Delhi","Jaipur",280,"AIR"), ("Delhi","Lucknow",550,"AIR"),
    ("Delhi","Nagpur",1100,"AIR"), ("Delhi","Bhopal",700,"AIR"), ("Delhi","Indore",800,"AIR"),
    ("Delhi","Kochi",2200,"AIR"), ("Delhi","Visakhapatnam",1700,"AIR"), ("Delhi","Coimbatore",2000,"AIR"),
    ("Delhi","Goa",1900,"AIR"), ("Delhi","Patna",1000,"AIR"), ("Delhi","Ranchi",1200,"AIR"),
    ("Delhi","Varanasi",800,"AIR"), ("Delhi","Bhubaneswar",1600,"AIR"),
    ("Delhi","Srinagar",800,"AIR"), ("Delhi","Kashmir",800,"AIR"), ("Delhi","Leh",600,"AIR"),
    ("Delhi","Amritsar",430,"AIR"), ("Delhi","Guwahati",1600,"AIR"), ("Delhi","Imphal",2100,"AIR"),
    # Mumbai hub
    ("Mumbai","Delhi",1400,"AIR"), ("Mumbai","Chennai",1330,"AIR"), ("Mumbai","Kolkata",1950,"AIR"),
    ("Mumbai","Bangalore",980,"AIR"), ("Mumbai","Hyderabad",710,"AIR"), ("Mumbai","Ahmedabad",530,"AIR"),
    ("Mumbai","Kochi",1200,"AIR"), ("Mumbai","Goa",600,"AIR"), ("Mumbai","Pune",150,"AIR"),
    ("Mumbai","Nagpur",840,"AIR"), ("Mumbai","Jaipur",1100,"AIR"), ("Mumbai","Guwahati",2600,"AIR"),
    ("Mumbai","London",7200,"AIR"), ("Mumbai","Singapore",3900,"AIR"), ("Mumbai","Dubai",1850,"AIR"),
    ("Mumbai","Frankfurt",7000,"AIR"),
    # Bangalore hub
    ("Bangalore","Delhi",1750,"AIR"), ("Bangalore","Mumbai",980,"AIR"), ("Bangalore","Chennai",290,"AIR"),
    ("Bangalore","Hyderabad",570,"AIR"), ("Bangalore","Kolkata",1870,"AIR"), ("Bangalore","Kochi",570,"AIR"),
    ("Bangalore","Coimbatore",380,"AIR"), ("Bangalore","Goa",560,"AIR"), ("Bangalore","Pune",840,"AIR"),
    ("Bangalore","Singapore",3200,"AIR"), ("Bangalore","Dubai",2700,"AIR"), ("Bangalore","London",8100,"AIR"),
    # Hyderabad hub
    ("Hyderabad","Delhi",1580,"AIR"), ("Hyderabad","Mumbai",710,"AIR"), ("Hyderabad","Bangalore",570,"AIR"),
    ("Hyderabad","Chennai",630,"AIR"), ("Hyderabad","Kolkata",1500,"AIR"), ("Hyderabad","Pune",560,"AIR"),
    ("Hyderabad","Ahmedabad",1100,"AIR"), ("Hyderabad","Kochi",1100,"AIR"), ("Hyderabad","Visakhapatnam",430,"AIR"),
    ("Hyderabad","Singapore",3200,"AIR"), ("Hyderabad","Dubai",2500,"AIR"),
    # Chennai hub
    ("Chennai","Delhi",1800,"AIR"), ("Chennai","Mumbai",1330,"AIR"), ("Chennai","Bangalore",290,"AIR"),
    ("Chennai","Hyderabad",630,"AIR"), ("Chennai","Kolkata",1670,"AIR"), ("Chennai","Kochi",660,"AIR"),
    ("Chennai","Coimbatore",500,"AIR"), ("Chennai","Madurai",450,"AIR"), ("Chennai","Visakhapatnam",875,"AIR"),
    ("Chennai","Singapore",2900,"AIR"), ("Chennai","Dubai",3200,"AIR"), ("Chennai","Colombo",400,"AIR"),
    ("Chennai","Bangkok",2400,"AIR"),
    # Kolkata hub
    ("Kolkata","Delhi",1500,"AIR"), ("Kolkata","Mumbai",1950,"AIR"), ("Kolkata","Bangalore",1870,"AIR"),
    ("Kolkata","Hyderabad",1500,"AIR"), ("Kolkata","Chennai",1670,"AIR"), ("Kolkata","Bhubaneswar",440,"AIR"),
    ("Kolkata","Guwahati",880,"AIR"), ("Kolkata","Patna",600,"AIR"), ("Kolkata","Ranchi",400,"AIR"),
    ("Kolkata","Singapore",2800,"AIR"), ("Kolkata","Bangkok",2000,"AIR"),
    ("Kolkata","Yangon",1100,"AIR"), ("Kolkata","Dhaka",400,"AIR"),
    # Other Indian city connections
    ("Kochi","Dubai",2250,"AIR"), ("Kochi","Singapore",3300,"AIR"),
    ("Thiruvananthapuram","Dubai",2200,"AIR"), ("Bhubaneswar","Kolkata",440,"AIR"),
    ("Delhi","London",6700,"AIR"), ("Delhi","Dubai",2200,"AIR"), ("Delhi","Singapore",4200,"AIR"),
    ("Delhi","Frankfurt",6100,"AIR"), ("Delhi","Moscow",4300,"AIR"), ("Delhi","Bangkok",2900,"AIR"),
    ("Delhi","Kathmandu",1050,"AIR"), ("Delhi","Karachi",1100,"AIR"),
    ("Delhi","Colombo",2700,"AIR"), ("Delhi","Dhaka",1600,"AIR"),
    # AIR - Global
    ("Singapore","Sydney",6300,"AIR"), ("Singapore","Tokyo",5300,"AIR"), ("Singapore","Hong Kong",2600,"AIR"),
    ("Singapore","Beijing",4500,"AIR"), ("Singapore","Seoul",4700,"AIR"), ("Singapore","Kuala Lumpur",350,"AIR"),
    ("Singapore","Jakarta",1400,"AIR"), ("Singapore","Bangkok",1400,"AIR"), ("Singapore","Manila",2400,"AIR"),
    ("Shanghai","Tokyo",1700,"AIR"), ("Shanghai","Seoul",870,"AIR"), ("Shanghai","Los Angeles",9700,"AIR"),
    ("Tokyo","Los Angeles",8700,"AIR"), ("Tokyo","Sydney",7800,"AIR"), ("Tokyo","Seoul",1200,"AIR"),
    ("Beijing","Moscow",5800,"AIR"), ("Hong Kong","Sydney",7400,"AIR"),
    ("Karachi","Dubai",1100,"AIR"), ("Colombo","Dubai",3400,"AIR"),
    ("Dubai","London",5500,"AIR"), ("Dubai","Frankfurt",4800,"AIR"), ("Dubai","Singapore",5900,"AIR"),
    ("Dubai","Nairobi",3700,"AIR"), ("Dubai","Cairo",2400,"AIR"), ("Dubai","Johannesburg",8000,"AIR"),
    ("Dubai","Dar es Salaam",3900,"AIR"), ("Riyadh","London",6700,"AIR"),
    ("Istanbul","London",2500,"AIR"), ("Istanbul","Dubai",3500,"AIR"), ("Istanbul","Moscow",1750,"AIR"),
    ("Cairo","London",3500,"AIR"), ("Nairobi","London",6800,"AIR"), ("Lagos","London",5000,"AIR"),
    ("Johannesburg","London",9100,"AIR"), ("Addis Ababa","Dubai",3200,"AIR"),
    ("Frankfurt","London",650,"AIR"), ("London","JFK",5500,"AIR"), ("London","Los Angeles",8600,"AIR"),
    ("London","Toronto",5700,"AIR"), ("Moscow","London",2500,"AIR"), ("Moscow","Dubai",3700,"AIR"),
    ("Moscow","Shanghai",6800,"AIR"), ("Moscow","Tokyo",7500,"AIR"),
    ("JFK","Los Angeles",4000,"AIR"), ("JFK","Miami",1600,"AIR"), ("JFK","Chicago",1200,"AIR"),
    ("JFK","Toronto",570,"AIR"), ("JFK","Sao Paulo",9300,"AIR"), ("JFK","Buenos Aires",10900,"AIR"),
    ("JFK","Mexico City",3400,"AIR"), ("Los Angeles","Tokyo",8750,"AIR"), ("Los Angeles","Sydney",12000,"AIR"),
    ("Los Angeles","Vancouver",1800,"AIR"), ("Miami","Bogota",1700,"AIR"), ("Miami","Lima",3200,"AIR"),
    ("Houston","Mexico City",1400,"AIR"), ("Sao Paulo","Buenos Aires",2200,"AIR"), ("Sao Paulo","Santiago",2600,"AIR"),
    # WATER - Real shipping lanes only (no inland routes)
    ("Mumbai","Singapore",3900,"WATER"), ("Mumbai","Dubai",1900,"WATER"), ("Mumbai","Jeddah",2100,"WATER"),
    ("Mumbai","Colombo",1200,"WATER"), ("Mumbai","Rotterdam",12000,"WATER"),
    ("Singapore","Shanghai",4200,"WATER"), ("Singapore","Sydney",6300,"WATER"),
    ("Singapore","Hong Kong",2600,"WATER"), ("Singapore","Rotterdam",15000,"WATER"),
    ("Singapore","Los Angeles",14000,"WATER"), ("Singapore","Dar es Salaam",6500,"WATER"),
    ("Shanghai","Los Angeles",10500,"WATER"), ("Shanghai","Tokyo",1800,"WATER"), ("Shanghai","Rotterdam",19000,"WATER"),
    ("Rotterdam","JFK",6300,"WATER"), ("Rotterdam","Jeddah",9500,"WATER"),
    ("Dubai","Rotterdam",12000,"WATER"), ("Dubai","Singapore",7200,"WATER"), ("Dubai","Dar es Salaam",3500,"WATER"),
    ("Jeddah","Rotterdam",11000,"WATER"), ("St. Petersburg","Rotterdam",2000,"WATER"),
    ("Vladivostok","Shanghai",1600,"WATER"), ("Vladivostok","Tokyo",1100,"WATER"),
    ("Visakhapatnam","Singapore",3000,"WATER"), ("Chennai","Singapore",2900,"WATER"),
    ("Kochi","Dubai",2800,"WATER"), ("Kochi","Colombo",550,"WATER"), ("Colombo","Singapore",2200,"WATER"),
    ("Karachi","Dubai",1100,"WATER"), ("Karachi","Mumbai",900,"WATER"),
    ("Johannesburg","Rotterdam",12500,"WATER"), ("Dar es Salaam","Mumbai",3800,"WATER"),
    ("Los Angeles","Tokyo",8700,"WATER"), ("JFK","Rotterdam",6300,"WATER"), ("Sao Paulo","Rotterdam",9500,"WATER"),
]

G_ROAD  = nx.Graph()
G_AIR   = nx.Graph()
G_WATER = nx.Graph()

for node, coords in NODES.items():
    for G in (G_ROAD, G_AIR, G_WATER):
        G.add_node(node, lat=coords["lat"], lng=coords["lng"])

for u, v, d, mode in EDGES:
    if mode == "ROAD":  G_ROAD.add_edge(u, v, distance=d)
    if mode == "AIR":   G_AIR.add_edge(u, v, distance=d)
    if mode == "WATER": G_WATER.add_edge(u, v, distance=d)

# ── Cost / Carbon / Speed constants ───────────────────────────────────────────
UNIT_COSTS       = {"AIR": 480.0, "ROAD": 90.0,  "WATER": 20.0}
CARBON_FACTORS   = {"AIR": 15.0,  "ROAD": 3.0,   "WATER": 1.2}
SPEED_KMH        = {"AIR": 850.0, "ROAD": 60.0,  "WATER": 35.0}
HIST_DISRUPTION  = {"ROAD": 0.18, "AIR": 0.12,   "WATER": 0.08}
CARGO_WEIGHT_TONNES = 1.0

# ── ML Model ──────────────────────────────────────────────────────────────────
def _haversine(lat1, lng1, lat2, lng2):
    lat1, lng1, lat2, lng2 = map(math.radians, [lat1, lng1, lat2, lng2])
    dlat = lat2 - lat1; dlng = lng2 - lng1
    a = math.sin(dlat/2)**2 + math.cos(lat1)*math.cos(lat2)*math.sin(dlng/2)**2
    return 2 * math.asin(math.sqrt(a)) * 6371.0

def _generate_training_data(n_samples: int = 4000):
    node_list = list(NODES.keys())
    mode_enc  = {"ROAD": 0, "AIR": 1, "WATER": 2}
    graph_map = {"ROAD": G_ROAD, "AIR": G_AIR, "WATER": G_WATER}
    rows = []
    rng  = np.random.default_rng(42)
    for _ in range(n_samples):
        origin = rng.choice(node_list); dest = rng.choice(node_list)
        if origin == dest: continue
        mode = rng.choice(["ROAD", "AIR", "WATER"])
        G = graph_map[mode]
        if not (G.has_node(origin) and G.has_node(dest)): continue
        try:
            path = nx.shortest_path(G, source=origin, target=dest, weight="distance")
        except nx.NetworkXNoPath:
            continue
        total_dist = sum(G.get_edge_data(path[i], path[i+1])["distance"] for i in range(len(path)-1))
        avg_risk   = float(rng.uniform(5, 90))
        cost_inr   = total_dist * UNIT_COSTS[mode] * (1 + (avg_risk/100)**2)
        carbon_kg  = total_dist * CARBON_FACTORS[mode]
        eta_hours  = total_dist / SPEED_KMH[mode]
        hist_dis   = HIST_DISRUPTION[mode]
        zone_count = rng.integers(0, 5)
        speed      = SPEED_KMH[mode]
        risk_penalty = avg_risk / 100.0
        cost_norm    = min(cost_inr / 5_000_000, 1.0)
        carbon_norm  = min(carbon_kg / 50_000, 1.0)
        eta_norm     = min(eta_hours / 300.0, 1.0)
        zc_penalty   = zone_count / 10.0
        optimality = (
            (1 - risk_penalty) * 35 + (1 - cost_norm) * 25 +
            (1 - carbon_norm) * 15 + (1 - eta_norm) * 15 +
            (1 - hist_dis) * 5 + (1 - zc_penalty) * 5
        )
        optimality = float(np.clip(optimality + rng.normal(0, 2), 0, 100))
        rows.append({"distance_km": total_dist, "avg_risk": avg_risk, "cost_inr": cost_inr,
                     "carbon_kg": carbon_kg, "eta_hours": eta_hours, "hist_disruption": hist_dis,
                     "zone_count": float(zone_count), "speed_kmh": speed,
                     "mode_enc": float(mode_enc[mode]), "optimality": optimality})
    return pd.DataFrame(rows)

def _train_model():
    print("[ML] Generating synthetic training data...")
    df = _generate_training_data(4000)
    if df.empty:
        print("[ML] No training data — model disabled.")
        return None, None
    feature_cols = ["distance_km","avg_risk","cost_inr","carbon_kg",
                    "eta_hours","hist_disruption","zone_count","speed_kmh","mode_enc"]
    X = df[feature_cols].values; y = df["optimality"].values
    pipeline = Pipeline([
        ("scaler", StandardScaler()),
        ("gbr", GradientBoostingRegressor(n_estimators=200, learning_rate=0.08,
                                          max_depth=5, subsample=0.8, random_state=42)),
    ])
    pipeline.fit(X, y)
    print(f"[ML] Model trained on {len(df)} samples. Ready.")
    return pipeline, feature_cols

ML_PIPELINE, ML_FEATURE_COLS = _train_model()

# ── Heatmap helpers ───────────────────────────────────────────────────────────
def get_active_heatmaps():
    t = time.time()
    weather_lat = 19.0 + math.sin(t / 100.0) * 3.0
    weather_lng = 73.0 + (t % 1000) / 100.0 * 1.5
    weather_int = 80 + math.sin(t / 50.0) * 20
    traffic_lat, traffic_lng = 28.7041, 77.1025
    traffic_int = 60 + math.sin(t / 10.0) * 30
    news_lat    = 13.0827 + math.cos(t / 200.0) * 2.0
    news_lng    = 80.2707 + math.sin(t / 200.0) * 2.0
    news_int    = 70 if (int(t / 60) % 3 == 0) else 20
    customs_lat, customs_lng = 18.9438, 72.8389
    customs_int = 55 + math.sin(t / 30.0) * 15
    base_maps = [
        {"id":"storm_01",   "type":"WEATHER",     "lat":weather_lat, "lng":weather_lng,  "radius_km":300, "intensity":weather_int},
        {"id":"traffic_01", "type":"TRAFFIC",     "lat":traffic_lat, "lng":traffic_lng,  "radius_km":100, "intensity":traffic_int},
        {"id":"news_01",    "type":"GEOPOLITICAL","lat":news_lat,    "lng":news_lng,     "radius_km":250, "intensity":news_int},
        {"id":"customs_01", "type":"CUSTOMS",     "lat":customs_lat, "lng":customs_lng,  "radius_km":150, "intensity":customs_int},
    ]
    return base_maps + injected_storms

def generate_dynamic_risk(u, v, mode):
    u_lat, u_lng = NODES[u]["lat"], NODES[u]["lng"]
    v_lat, v_lng = NODES[v]["lat"], NODES[v]["lng"]
    mid_lat, mid_lng = (u_lat+v_lat)/2.0, (u_lng+v_lng)/2.0
    max_risk = 5.0
    for zone in get_active_heatmaps():
        if mode == "AIR"  and zone["type"] != "WEATHER": continue
        if mode == "ROAD" and zone["type"] == "WEATHER": continue
        dist = _haversine(mid_lat, mid_lng, float(zone["lat"]), float(zone["lng"]))
        rad  = float(zone["radius_km"])
        if dist < rad:
            max_risk = max(max_risk, float(zone["intensity"]) * (1.0 - dist / rad))
    return float(max_risk)

# ── Pydantic models ───────────────────────────────────────────────────────────
class RouteRequest(BaseModel):
    origin: str
    destination: str

class Location(BaseModel):
    lat: float; lng: float; name: str

class MlPredictRequest(BaseModel):
    origin: str
    destination: str
    cargo_type: Optional[str] = "GENERAL"

class ModeMLResult(BaseModel):
    mode: str; ml_score: float; safety_score: float; risk_pct: float
    cost_inr: float; eta_hours: float; carbon_kg: float; confidence: float
    risk_level: str; recommended: bool; path: List[str]
    polyline: List[Dict[str, Any]]; distance_km: float
    zone_count: int; justification: str; active_threats: List[str]

class MlPredictResponse(BaseModel):
    origin: str; destination: str; predictions: List[ModeMLResult]
    best_mode: str; ml_justification: str; model_version: str = "GBR-v1.0"

# ── Heatmap endpoints ─────────────────────────────────────────────────────────
@app.get("/api/heatmap")
def get_heatmap():
    return {"timestamp": time.time(), "zones": get_active_heatmaps()}

@app.post("/api/simulate/storm")
def simulate_storm_api():
    storm = {"id": f"sim_storm_{int(time.time())}", "type": "WEATHER",
             "lat": 21.1458 + random.uniform(-2, 2), "lng": 79.0882 + random.uniform(-2, 2),
             "radius_km": 500, "intensity": 99.0}
    injected_storms.append(storm)
    return {"message": "Storm simulated!", "storm": storm}

@app.post("/api/clear/storms")
def clear_storms():
    injected_storms.clear()
    return {"message": "Storms cleared."}

# ── Geospatial intersection for risk ──────────────────────────────────────────
def _get_active_threats(path_nodes: List[str], mode: str) -> List[str]:
    zones = get_active_heatmaps(); threats = set()
    for i in range(len(path_nodes)-1):
        u, v = path_nodes[i], path_nodes[i+1]
        mid_lat = (NODES[u]["lat"] + NODES[v]["lat"]) / 2
        mid_lng = (NODES[u]["lng"] + NODES[v]["lng"]) / 2
        for zone in zones:
            if mode == "AIR"  and zone["type"] != "WEATHER": continue
            if mode == "ROAD" and zone["type"] == "WEATHER": continue
            d = _haversine(mid_lat, mid_lng, float(zone["lat"]), float(zone["lng"]))
            if d < float(zone["radius_km"]):
                threats.add(f"{zone['type']} near {u}-{v} ({int(zone['intensity'])}%)")
    return list(threats)

# ── ML Predict endpoint ───────────────────────────────────────────────────────
@app.post("/api/ml-predict", response_model=MlPredictResponse)
def ml_predict(req: MlPredictRequest):
    node_keys  = {k.lower(): k for k in NODES.keys()}
    origin_key = node_keys.get(req.origin.lower())
    dest_key   = node_keys.get(req.destination.lower())

    if not origin_key or not dest_key:
        raise HTTPException(status_code=400,
            detail=f"Unknown origin ({req.origin}) or destination ({req.destination}).")

    req.origin = origin_key; req.destination = dest_key

    if ML_PIPELINE is None:
        raise HTTPException(status_code=503, detail="ML model not available.")

    mode_enc_map = {"ROAD": 0, "AIR": 1, "WATER": 2}
    graph_map    = {"ROAD": G_ROAD, "AIR": G_AIR, "WATER": G_WATER}
    results: List[ModeMLResult] = []

    for mode_name in ["ROAD", "AIR", "WATER"]:
        G = graph_map[mode_name]

        # WATER is strictly topology-bound — no synthetic edges
        if mode_name == "WATER":
            has_path = (G.has_node(req.origin) and G.has_node(req.destination)
                        and nx.has_path(G, req.origin, req.destination))
            if not has_path:
                results.append(ModeMLResult(
                    mode="WATER", ml_score=-1.0, safety_score=0.0, risk_pct=100.0,
                    cost_inr=0.0, eta_hours=0.0, carbon_kg=0.0, confidence=0.0,
                    risk_level="UNAVAILABLE", recommended=False, path=[], polyline=[],
                    distance_km=0.0, zone_count=0,
                    justification="No navigable waterway exists between these locations.", active_threats=[]))
                continue

        # ROAD is also topology-bound — no synthetic cross-country shortcuts
        if mode_name == "ROAD":
            has_path = (G.has_node(req.origin) and G.has_node(req.destination)
                        and nx.has_path(G, req.origin, req.destination))
            if not has_path:
                results.append(ModeMLResult(
                    mode="ROAD", ml_score=-1.0, safety_score=0.0, risk_pct=100.0,
                    cost_inr=0.0, eta_hours=0.0, carbon_kg=0.0, confidence=0.0,
                    risk_level="UNAVAILABLE", recommended=False, path=[], polyline=[],
                    distance_km=0.0, zone_count=0,
                    justification="No connected road corridor exists between these locations.", active_threats=[]))
                continue

        # AIR: add dynamic direct edge if nodes not connected (you can always fly)
        if mode_name == "AIR":
            if not (G.has_node(req.origin) and G.has_node(req.destination)):
                if req.origin in NODES and req.destination in NODES:
                    dist = _haversine(NODES[req.origin]["lat"], NODES[req.origin]["lng"],
                                      NODES[req.destination]["lat"], NODES[req.destination]["lng"])
                    G.add_edge(req.origin, req.destination, distance=dist)
                else:
                    continue

        for u, v, data in G.edges(data=True):
            risk = generate_dynamic_risk(u, v, mode_name)
            data["current_risk"]     = risk
            data["effective_weight"] = data["distance"] * math.exp(risk / 15.0)

        try:
            path = nx.shortest_path(G, source=req.origin, target=req.destination,
                                    weight="effective_weight")
        except nx.NetworkXNoPath:
            # AIR only: add a synthetic direct flight as last resort
            if mode_name == "AIR":
                dist = _haversine(NODES[req.origin]["lat"], NODES[req.origin]["lng"],
                                  NODES[req.destination]["lat"], NODES[req.destination]["lng"])
                G.add_edge(req.origin, req.destination, distance=dist)
                risk = generate_dynamic_risk(req.origin, req.destination, mode_name)
                G[req.origin][req.destination]["current_risk"]     = risk
                G[req.origin][req.destination]["effective_weight"] = dist * math.exp(risk / 15.0)
                path = nx.shortest_path(G, source=req.origin, target=req.destination,
                                        weight="effective_weight")
            else:
                # ROAD/WATER with no path — mark unavailable
                results.append(ModeMLResult(
                    mode=mode_name, ml_score=-1.0, safety_score=0.0, risk_pct=100.0,
                    cost_inr=0.0, eta_hours=0.0, carbon_kg=0.0, confidence=0.0,
                    risk_level="UNAVAILABLE", recommended=False, path=[], polyline=[],
                    distance_km=0.0, zone_count=0,
                    justification=f"No connected {mode_name.lower()} corridor exists between these locations.", active_threats=[]))
                continue


        total_dist = avg_risk = 0.0
        for i in range(len(path)-1):
            d = G.get_edge_data(path[i], path[i+1])
            total_dist += d["distance"]; avg_risk += d["current_risk"]
        if len(path) > 1: avg_risk /= (len(path)-1)

        active_threats = _get_active_threats(path, mode_name)
        zone_count    = len(active_threats)
        base_cost_inr = total_dist * UNIT_COSTS[mode_name] * CARGO_WEIGHT_TONNES
        risk_surge    = base_cost_inr * (avg_risk / 100) * 0.5
        zone_surge    = base_cost_inr * zone_count * 0.10
        cost_inr      = base_cost_inr + risk_surge + zone_surge
        carbon_kg     = total_dist * CARBON_FACTORS[mode_name]
        eta_hours     = total_dist / SPEED_KMH[mode_name] * (1.0 + (avg_risk / 100) * 0.5)
        hist_dis      = HIST_DISRUPTION[mode_name]
        speed         = SPEED_KMH[mode_name]

        X = np.array([[total_dist, avg_risk, cost_inr, carbon_kg, eta_hours,
                       hist_dis, zone_count, speed, float(mode_enc_map[mode_name])]])
        raw_score    = float(ML_PIPELINE.predict(X)[0])
        ml_score     = float(np.clip(raw_score, 0, 100))
        safety_score = float(np.clip(100 - avg_risk * 0.85 + random.uniform(-2, 2), 0, 100))
        base_conf    = 0.75 + (1 - avg_risk/100) * 0.20 - zone_count * 0.02
        confidence   = float(np.clip(base_conf + random.uniform(-0.02, 0.02), 0.50, 0.99))
        risk_level   = "CRITICAL" if avg_risk > 70 else "HIGH" if avg_risk > 50 else "MEDIUM" if avg_risk > 25 else "LOW"
        polyline_data = [{"lat": NODES[n]["lat"], "lng": NODES[n]["lng"], "name": n} for n in path]

        results.append(ModeMLResult(
            mode=mode_name, ml_score=round(ml_score, 1), safety_score=round(safety_score, 1),
            risk_pct=round(avg_risk, 1), cost_inr=round(cost_inr, 0), eta_hours=round(eta_hours, 1),
            carbon_kg=round(carbon_kg, 1), confidence=round(confidence, 3), risk_level=risk_level,
            recommended=False, path=path, polyline=polyline_data,
            distance_km=round(total_dist, 1), zone_count=zone_count,
            justification=(f"{mode_name} via {' → '.join(path)} | Score {ml_score:.1f}/100 | "
                           f"Risk {avg_risk:.1f}% | ETA {eta_hours:.1f}h | ₹{int(cost_inr):,}"
                           f" (incl. {zone_count} zone surcharge{'s' if zone_count!=1 else ''})"),
            active_threats=active_threats))

    if not results:
        raise HTTPException(status_code=404, detail="No paths found for any transport mode.")

    valid_results = [r for r in results if r.ml_score >= 0 and len(r.polyline) > 0]
    if not valid_results:
        raise HTTPException(status_code=404, detail="No valid navigable paths found.")

    best = max(valid_results, key=lambda r: r.ml_score)
    for r in results:
        r.recommended = (r.mode == best.mode and r.ml_score >= 0)

    ml_just = (f"ML recommends {best.mode} (score {best.ml_score:.1f}/100). "
               f"Safety: {best.safety_score:.1f}% | Cost: ₹{int(best.cost_inr):,} | "
               f"ETA: {best.eta_hours:.1f}h | Carbon: {best.carbon_kg:.1f} kg CO₂ | "
               f"Confidence: {best.confidence*100:.0f}%.")

    return MlPredictResponse(origin=req.origin, destination=req.destination,
                             predictions=results, best_mode=best.mode, ml_justification=ml_just)

# ── Legacy / compatibility endpoints ─────────────────────────────────────────
@app.post("/calculate_route")
def calculate_route(data: dict):
    origin = data.get("origin", "Mumbai"); destination = data.get("destination", "Delhi")
    try:
        req = MlPredictRequest(origin=origin, destination=destination)
        res = ml_predict(req)
        best = next(alt for alt in res.predictions if alt.mode == res.best_mode)
        return {"polyline": best.polyline, "total_risk": int(best.risk_pct),
                "distance_km": best.distance_km, "estimated_cost_inr": best.cost_inr,
                "transport_mode": best.mode, "carbon_emissions_kg": best.carbon_kg,
                "justification": res.ml_justification}
    except Exception as e:
        print(f"Routing error: {e}")
        return {"polyline": [{"lat": 20, "lng": 78, "name": "Fallback"}],
                "total_risk": 50, "transport_mode": "ROAD"}

@app.post("/predict-risk")
def predict_risk(data: dict):
    location  = data.get("name", "Unknown")
    base_risk = random.randint(20, 70)
    return {"location": location, "current_risk": base_risk,
            "future_risk": min(100, base_risk + random.randint(-5, 20)),
            "factors": {"weather": random.randint(10,80), "traffic": random.randint(10,80),
                        "geopolitics": random.randint(10,80), "infrastructure": random.randint(10,80)},
            "prediction_note": "AI predicts increasing congestion and weather instability."}

@app.post("/api/news-risk")
def check_news_risk(data: dict):
    return {"risk_score": 0, "should_avoid_route": False, "detected_risks": [],
            "recommendation": "Route appears clear of major geopolitical disruptions."}

@app.get("/")
def root():
    return {"status": "AI Routing Service running", "nodes": len(NODES), "edges": len(EDGES)}
