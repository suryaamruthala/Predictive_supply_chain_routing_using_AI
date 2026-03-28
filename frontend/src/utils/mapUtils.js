import React, { useEffect, useRef } from 'react';
import { useMap, useMapEvents } from 'react-leaflet';

// Map Helper for Calm Camera
export const MapFocuser = ({ center, isFollowing, setIsFollowing, zoom = 8, bounds = null, targetId = null }) => {
    const map = useMap();
    const lastTargetRef = useRef(null);
    useMapEvents({ dragstart: () => { if (isFollowing) setIsFollowing(false); }, zoomstart: () => { if (isFollowing) setIsFollowing(false); } });
    useEffect(() => { 
        if (!isFollowing) return;
        const targetKey = targetId || (bounds ? JSON.stringify(bounds) : JSON.stringify(center));
        if (targetKey !== lastTargetRef.current) {
            if (bounds) map.fitBounds(bounds, { padding: [100, 100], animate: true, duration: 1.5 });
            else if (center) map.flyTo(center, zoom, { animate: true, duration: 1.8 }); 
            lastTargetRef.current = targetKey;
        }
    }, [center, isFollowing, map, zoom, bounds, targetId]);
    return null;
};

// Distance calculator (Haversine)
export const getDistance = (lat1, lon1, lat2, lon2) => {
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
    return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};
