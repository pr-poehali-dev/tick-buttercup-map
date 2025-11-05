import { useEffect, useRef } from 'react';

interface Mark {
  id: number;
  type: 'tick' | 'hogweed';
  lat: number;
  lng: number;
  verified: boolean;
  description?: string;
}

interface Zone {
  id: number;
  type: 'tick' | 'hogweed';
  coordinates: { lat: number; lng: number };
  area?: string;
  color?: string;
}

interface YandexMapProps {
  marks?: Mark[];
  zones?: Zone[];
  center?: [number, number];
  zoom?: number;
  onMapClick?: (coords: [number, number]) => void;
  showUserLocation?: boolean;
}

declare global {
  interface Window {
    ymaps: any;
  }
}

const YandexMap = ({
  marks = [],
  zones = [],
  center = [55.7558, 37.6173],
  zoom = 10,
  onMapClick,
  showUserLocation = false
}: YandexMapProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);

  useEffect(() => {
    if (!mapRef.current || !window.ymaps) return;

    const initMap = () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.destroy();
      }

      window.ymaps.ready(() => {
        const map = new window.ymaps.Map(mapRef.current, {
          center: center,
          zoom: zoom,
          controls: ['zoomControl', 'fullscreenControl', 'geolocationControl']
        });

        mapInstanceRef.current = map;

        if (onMapClick) {
          map.events.add('click', (e: any) => {
            const coords = e.get('coords');
            onMapClick(coords);
          });
        }

        marks.forEach((mark) => {
          const placemark = new window.ymaps.Placemark(
            [mark.lat, mark.lng],
            {
              balloonContent: `
                <div style="padding: 10px;">
                  <strong>${mark.type === 'tick' ? 'Клещ' : 'Борщевик'}</strong><br/>
                  ${mark.description || ''}<br/>
                  <small>${mark.verified ? '✓ Проверено' : '⏳ На проверке'}</small>
                </div>
              `
            },
            {
              preset: mark.type === 'tick' ? 'islands#redDotIcon' : 'islands#greenDotIcon',
              iconColor: mark.type === 'tick' ? '#78350f' : '#15803d'
            }
          );
          map.geoObjects.add(placemark);
        });

        zones.forEach((zone) => {
          const circle = new window.ymaps.Circle(
            [
              [zone.coordinates.lat, zone.coordinates.lng],
              2000
            ],
            {
              balloonContent: `
                <div style="padding: 10px;">
                  <strong>${zone.area || 'Зона обработки'}</strong><br/>
                  <small>${zone.type === 'tick' ? 'От клещей' : 'От борщевика'}</small>
                </div>
              `
            },
            {
              fillColor: zone.color || (zone.type === 'tick' ? '#78350f' : '#15803d'),
              fillOpacity: 0.3,
              strokeColor: zone.color || (zone.type === 'tick' ? '#78350f' : '#15803d'),
              strokeOpacity: 0.8,
              strokeWidth: 2
            }
          );
          map.geoObjects.add(circle);
        });

        if (showUserLocation && navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              const userCoords = [position.coords.latitude, position.coords.longitude];
              const userPlacemark = new window.ymaps.Placemark(
                userCoords,
                { balloonContent: 'Вы здесь' },
                { preset: 'islands#blueDotIcon' }
              );
              map.geoObjects.add(userPlacemark);
            },
            (error) => {
              console.error('Ошибка геолокации:', error);
            }
          );
        }
      });
    };

    initMap();

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.destroy();
      }
    };
  }, [marks, zones, center, zoom, onMapClick, showUserLocation]);

  return (
    <div
      ref={mapRef}
      className="w-full h-full rounded-lg"
      style={{ minHeight: '400px' }}
    />
  );
};

export default YandexMap;
