import axios from "axios";

// Local in-memory cache to reduce redundant API calls during a single session
const GEO_CACHE = new Map();

/**
 * Geocodes a city name into [latitude, longitude] using Nominatim OpenStreetMap API.
 * Includes rate-limiting safety and basic error handling.
 * 
 * @param {string} city - The name of the city to geocode.
 * @returns {Promise<[number, number]|null>} - Lat/Lng array or null if not found.
 */
export const geocodeCity = async (city) => {
    if (!city || typeof city !== 'string') return null;

    const query = city.trim().toLowerCase();
    
    // Check cache first
    if (GEO_CACHE.has(query)) {
        return GEO_CACHE.get(query);
    }

    try {
        // We use Nominatim's public API. 
        // Note: In a production app, you might want to use a private geocoding service or your own server to avoid rate limits.
        const response = await axios.get("https://nominatim.openstreetmap.org/search", {
            params: {
                q: city,
                format: "json",
                limit: 1,
                addressdetails: 0
            },
            headers: {
                // User-Agent is recommended by Nominatim's Usage Policy
                "User-Agent": "PredictiveSupplyChainApp/1.0"
            }
        });

        if (response.data && response.data.length > 0) {
            const { lat, lon } = response.data[0];
            const result = [parseFloat(lat), parseFloat(lon)];
            
            // Store in cache
            GEO_CACHE.set(query, result);
            return result;
        }

        // Fallback or no results
        console.warn(`Geocoding warning: No coordinates found for "${city}"`);
        return null;

    } catch (error) {
        console.error(`Geocoding error for "${city}":`, error.message);
        
        // Return null instead of crashing the UI
        return null;
    }
};
