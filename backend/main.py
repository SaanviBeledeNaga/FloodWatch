from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import random

app = FastAPI(title="FloodWatch API", description="AI-powered flood monitoring backend")

# Allow requests from frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"status": "System Online"}

@app.get("/system/status")
def get_system_status():
    return {
        "satellite": "Updated 1 hour ago",
        "rainfall_model": "Running",
        "flood_detection": "Active",
        "alert_system": "Online"
    }

@app.get("/flood/latest")
def get_latest_flood_data():
    return {
        "type": "FeatureCollection",
        "features": [
            {
                "type": "Feature",
                "properties": {
                    "risk_level": "Critical",
                    "region": "Hyderabad East",
                    "probability": 82,
                    "cause": "Heavy rainfall and low elevation terrain",
                    "action": "Evacuate residents in low-lying areas",
                    "infrastructure": "2 hospitals, 3 shelters",
                    "color": "#ef4444" # pulsing red
                },
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [[[78.47, 17.38], [78.49, 17.38], [78.49, 17.40], [78.47, 17.40], [78.47, 17.38]]]
                }
            },
            {
                "type": "Feature",
                "properties": {
                    "risk_level": "Moderate",
                    "region": "Hyderabad West",
                    "probability": 45,
                    "cause": "Rising river levels",
                    "action": "Stay alert",
                    "infrastructure": "5 schools, 1 hospital",
                    "color": "#eab308" # yellow
                },
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [[[78.40, 17.42], [78.43, 17.42], [78.43, 17.45], [78.40, 17.45], [78.40, 17.42]]]
                }
            }
        ]
    }

@app.get("/alerts")
def get_alerts():
    return [
        {
            "level": "CRITICAL",
            "message": "River overflow risk detected.",
            "affected_districts": 2,
            "population_at_risk": 15200,
            "issued": "15 minutes ago"
        },
        {
            "level": "WARNING",
            "message": "Heavy rainfall expected in next 24 hours.",
            "affected_districts": 5,
            "population_at_risk": 0,
            "issued": "1 hour ago"
        }
    ]

@app.get("/analytics/{region}")
def get_analytics(region: str):
    # Mock data for rainfall and flood spread over time
    return {
        "rainfall": [
            {"time": "0h", "amount": 10},
            {"time": "12h", "amount": 25},
            {"time": "24h", "amount": 45},
            {"time": "36h", "amount": 30},
            {"time": "48h", "amount": 15},
        ],
        "spread": [
            {"time": "0h", "area_km2": 5},
            {"time": "12h", "area_km2": 15},
            {"time": "24h", "area_km2": 28},
            {"time": "36h", "area_km2": 35},
            {"time": "48h", "area_km2": 30},
        ]
    }

@app.get("/population-impact/{region}")
def get_population_impact(region: str):
    return {
        "coverage_km2": 28.5,
        "population_risk": 11600,
        "critical_zones": 3,
        "impacted_infrastructure": "2 hospitals, 4 schools"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
