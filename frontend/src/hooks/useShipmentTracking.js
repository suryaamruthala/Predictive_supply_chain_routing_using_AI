import { useState, useEffect } from 'react';
import SockJS from 'sockjs-client';
import { Stomp } from '@stomp/stompjs';

export function useShipmentTracking() {
  const [shipments, setShipments] = useState([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const socket = new SockJS('http://localhost:8080/ws');
    const stompClient = Stomp.over(socket);
    
    // Disable debug logging in console for cleaner output
    stompClient.debug = () => {};

    stompClient.connect({}, (frame) => {
      setConnected(true);
      console.log('Connected to WebSocket:', frame);

      // Subscribe to shipment updates
      stompClient.subscribe('/topic/shipments', (message) => {
        if (message.body) {
          const data = JSON.parse(message.body);
          setShipments(data);
        }
      });
      
      // Do a quick fetch for initial data just in case ticker hasn't ticked yet
      fetch('http://localhost:8080/api/shipments')
        .then(res => res.json())
        .then(data => {
            if (data && data.length > 0) {
                setShipments(data);
            }
        }).catch(err => console.error(err));
        
    }, (error) => {
      console.error('WebSocket Error:', error);
      setConnected(false);
    });

    return () => {
      if (stompClient) {
        stompClient.disconnect();
      }
    };
  }, []);

  return { shipments, connected };
}
