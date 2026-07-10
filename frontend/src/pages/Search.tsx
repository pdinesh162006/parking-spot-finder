import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import L from 'leaflet';
import SearchBar from '../components/SearchBar';
import LotDetailDrawer from '../components/LotDetailDrawer';
import AIAssistant from '../components/AIAssistant';
import { API_URL, useAuthStore } from '../store/authStore';
import { SlidersHorizontal, MapPin, Star, Zap, Info, Loader2, Map as MapIcon, Globe } from 'lucide-react';

// programmatically fix Leaflet icon assets
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

interface Lot {
  id: string;
  name: string;
  description: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  latitude: string;
  longitude: string;
  pricePerHour: number;
  isSurge: boolean;
  amenities: string[];
  imageUrls: string[];
  avgRating: number | null;
  distance: number | null;
}

export default function Search() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { accessToken } = useAuthStore();
  
  const lat = searchParams.get('lat');
  const lng = searchParams.get('lng');
  const address = searchParams.get('address') || '';
  const date = searchParams.get('date') || '';
  const startTime = searchParams.get('startTime') || '';
  const endTime = searchParams.get('endTime') || '';

  // Filter States
  const [minPrice] = useState(0);
  const [maxPrice, setMaxPrice] = useState(50);
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [lots, setLots] = useState<Lot[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedLot, setSelectedLot] = useState<Lot | null>(null);

  const [mapStyle, setMapStyle] = useState<'streets' | 'satellite'>('streets');

  // Map Refs
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);

  // Routing and Directions States
  const [routeInfo, setRouteInfo] = useState<{ distance: string; duration: string } | null>(null);
  const routePolylineRef = useRef<L.Polyline | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);

  // User current location coordinates state
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);

  // Retrieve user geolocation (laptop place) on load
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserCoords({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (err) => {
          console.warn('Geolocation access failed or rejected:', err);
          // If geolocation is blocked, set a simulated laptop location offset from destination lat/lng!
          if (lat && lng) {
            setUserCoords({
              lat: parseFloat(lat) + 0.015,
              lng: parseFloat(lng) + 0.015,
            });
          }
        },
        { enableHighAccuracy: true, timeout: 6000 }
      );
    } else {
      // Fallback if browser doesn't support geolocation at all
      if (lat && lng) {
        setUserCoords({
          lat: parseFloat(lat) + 0.015,
          lng: parseFloat(lng) + 0.015,
        });
      }
    }
  }, [lat, lng]);

  // Fetch lots depending on parameters & filters (searched destination + current user location)
  useEffect(() => {
    const fetchLotsData = async () => {
      setLoading(true);
      setError(null);

      try {
        // Fetch lots near searched location
        const queryParams = new URLSearchParams();
        if (lat) queryParams.append('lat', lat);
        if (lng) queryParams.append('lng', lng);
        if (address) queryParams.append('address', address);
        if (minPrice) queryParams.append('minPrice', minPrice.toString());
        if (maxPrice) queryParams.append('maxPrice', maxPrice.toString());
        if (selectedAmenities.length > 0) {
          queryParams.append('amenities', selectedAmenities.join(','));
        }

        const resPromise = fetch(`${API_URL}/lots?${queryParams.toString()}`, {
          headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
        });

        // Parallel fetch for lots near user coordinates (laptop place)
        let userResPromise = Promise.resolve<Response | null>(null);
        if (userCoords) {
          const userQueryParams = new URLSearchParams();
          userQueryParams.append('lat', userCoords.lat.toString());
          userQueryParams.append('lng', userCoords.lng.toString());
          if (minPrice) userQueryParams.append('minPrice', minPrice.toString());
          if (maxPrice) userQueryParams.append('maxPrice', maxPrice.toString());
          if (selectedAmenities.length > 0) {
            userQueryParams.append('amenities', selectedAmenities.join(','));
          }
          userResPromise = fetch(`${API_URL}/lots?${userQueryParams.toString()}`, {
            headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
          });
        }

        const [res, userRes] = await Promise.all([resPromise, userResPromise]);

        let combinedLots: Lot[] = [];

        if (res.ok) {
          const data = await res.json();
          combinedLots = [...data.lots];
        } else {
          setError('Failed to query parking lots.');
        }

        if (userRes && userRes.ok) {
          const userData = await userRes.json();
          const userLots = userData.lots || [];
          // Merge avoiding duplicates by id
          userLots.forEach((ul: Lot) => {
            if (!combinedLots.some((cl) => cl.id === ul.id)) {
              combinedLots.push(ul);
            }
          });
        }

        setLots(combinedLots);
      } catch (err) {
        console.error('Fetch lots error:', err);
        setError('Network error. Failed to load lots.');
      } finally {
        setLoading(false);
      }
    };

    fetchLotsData();
  }, [lat, lng, userCoords, minPrice, maxPrice, selectedAmenities, accessToken]);

  // Geocode address if lat/lng parameters are missing (e.g. typed query submitted directly)
  useEffect(() => {
    if ((!lat || !lng) && address.trim().length >= 3) {
      const geocode = async () => {
        setLoading(true);
        setError(null);
        
        // Clean query helper
        const cleanQuery = (q: string) => {
          return q
            .replace(/bus\s*stand/gi, '')
            .replace(/railway\s*station/gi, '')
            .replace(/airport/gi, '')
            .replace(/parking/gi, '')
            .replace(/spot/gi, '')
            .replace(/near/gi, '')
            .replace(/\s+/g, ' ')
            .trim();
        };

        const tryGeocode = async (q: string): Promise<{lat: string, lon: string} | null> => {
          try {
            const response = await fetch(
              `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
                q
              )}&limit=1`
            );
            if (response.ok) {
              const data = await response.json();
              if (data && data.length > 0) {
                return { lat: data[0].lat, lon: data[0].lon };
              }
            }
          } catch (e) {
            console.error('Nominatim query error for:', q, e);
          }
          return null;
        };

        // Try 1: Full raw address
        let coords = await tryGeocode(address);

        // Try 2: Cleaned address (removing "bus stand" etc)
        if (!coords) {
          const cleaned = cleanQuery(address);
          if (cleaned !== address && cleaned.length >= 3) {
            coords = await tryGeocode(cleaned);
          }
        }

        // Try 3: First and last word fallback (e.g. "pettavaithalai bus stand Trichy" -> "pettavaithalai Trichy")
        if (!coords) {
          const words = address.split(/\s+/).filter(Boolean);
          if (words.length > 2) {
            const fallbackQuery = `${words[0]} ${words[words.length - 1]}`;
            coords = await tryGeocode(fallbackQuery);
          }
        }

        // Try 4: First word
        if (!coords) {
          const words = address.split(/\s+/).filter(Boolean);
          if (words.length > 0 && words[0].length >= 3) {
            coords = await tryGeocode(words[0]);
          }
        }

        if (coords) {
          const params = new URLSearchParams(window.location.search);
          params.set('lat', coords.lat);
          params.set('lng', coords.lon);
          navigate(`/search?${params.toString()}`, { replace: true });
        } else {
          setError(`Could not resolve location for: "${address}"`);
        }
        setLoading(false);
      };

      geocode();
    }
  }, [lat, lng, address, navigate]);

  // Leaflet Map Initialization
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Default center coordinates (Chennai, India)
    const initialLat = lat ? parseFloat(lat) : 13.0827;
    const initialLng = lng ? parseFloat(lng) : 80.2707;

    if (!mapInstanceRef.current) {
      mapInstanceRef.current = L.map(mapContainerRef.current).setView([initialLat, initialLng], 13);
      
      const layerUrl = mapStyle === 'satellite'
        ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
        : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

      const attribution = mapStyle === 'satellite'
        ? 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
        : '&copy; OpenStreetMap contributors';

      tileLayerRef.current = L.tileLayer(layerUrl, { attribution }).addTo(mapInstanceRef.current);

      markersLayerRef.current = L.layerGroup().addTo(mapInstanceRef.current);
    } else {
      // Pan/Zoom map if coordinate parameters update
      mapInstanceRef.current.setView([initialLat, initialLng], 13);
    }
  }, [lat, lng]);

  // Update Map Tile Layer when Style changes
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    if (tileLayerRef.current) {
      mapInstanceRef.current.removeLayer(tileLayerRef.current);
    }

    const layerUrl = mapStyle === 'satellite'
      ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
      : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

    const attribution = mapStyle === 'satellite'
      ? 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
      : '&copy; OpenStreetMap contributors';

    tileLayerRef.current = L.tileLayer(layerUrl, { attribution }).addTo(mapInstanceRef.current);
  }, [mapStyle]);

  // Sync Markers to Lots state
  useEffect(() => {
    if (!mapInstanceRef.current || !markersLayerRef.current) return;

    // Clear old markers
    markersLayerRef.current.clearLayers();

    lots.forEach((lot) => {
      const lotLat = parseFloat(lot.latitude);
      const lotLng = parseFloat(lot.longitude);
      
      if (!isNaN(lotLat) && !isNaN(lotLng)) {
        const customIcon = L.divIcon({
          className: 'custom-leaflet-marker bg-transparent border-none',
          html: `
            <div class="flex flex-col items-center select-none cursor-pointer">
              <!-- Main Badge -->
              <div class="flex items-center bg-slate-950/95 text-white border border-slate-800/80 rounded-2xl shadow-premium px-3 py-2 whitespace-nowrap hover:scale-105 transition duration-200 relative">
                <!-- Parking Symbol (P) -->
                <div class="flex items-center justify-center bg-indigo-600 text-white rounded-xl w-6 h-6 mr-2 font-black text-xs shadow">
                  P
                </div>
                <!-- Lot Info -->
                <div class="flex flex-col text-left">
                  <span class="text-[10px] font-black tracking-tight leading-none text-slate-100">${lot.name}</span>
                  <span class="text-[9px] font-bold text-indigo-400 leading-none mt-1.5">₹${Number(lot.pricePerHour).toFixed(2)}/hr</span>
                </div>
                ${lot.isSurge ? `
                  <div class="absolute -top-1 -right-1 bg-amber-500 w-3 h-3 rounded-full border border-slate-950 shadow animate-pulse"></div>
                ` : ''}
              </div>
              <!-- Arrow Pin Point -->
              <div class="w-2 h-2 bg-slate-950/95 border-r border-b border-slate-800/80 transform rotate-45 -mt-1.5 shadow-md"></div>
            </div>
          `,
          iconSize: [200, 52],
          iconAnchor: [100, 48],
        });

        const marker = L.marker([lotLat, lotLng], { icon: customIcon });
        
        marker.on('click', () => {
          setSelectedLot(lot);
          mapInstanceRef.current?.setView([lotLat, lotLng], 15);
        });

        markersLayerRef.current?.addLayer(marker);
      }
    });

    // Draw search destination marker if lat/lng are provided
    if (lat && lng) {
      const destLat = parseFloat(lat);
      const destLng = parseFloat(lng);
      if (!isNaN(destLat) && !isNaN(destLng)) {
        const destIcon = L.divIcon({
          className: 'custom-leaflet-marker bg-transparent border-none',
          html: `
            <div class="flex flex-col items-center select-none">
              <div class="flex items-center bg-rose-600 text-white border border-rose-500 rounded-2xl shadow-lg px-3 py-1.5 whitespace-nowrap animate-bounce">
                <span class="text-xs font-black">📍 Destination</span>
              </div>
              <div class="w-2.5 h-2.5 bg-rose-600 transform rotate-45 -mt-1.5 shadow-md"></div>
            </div>
          `,
          iconSize: [150, 44],
          iconAnchor: [75, 40],
        });
        const destMarker = L.marker([destLat, destLng], { icon: destIcon });
        markersLayerRef.current?.addLayer(destMarker);
      }
    }

    // Draw user location marker if userCoords are available
    if (userCoords) {
      const userIcon = L.divIcon({
        className: 'custom-leaflet-marker bg-transparent border-none',
        html: `
          <div class="flex flex-col items-center select-none">
            <div class="flex items-center justify-center bg-indigo-600 text-white rounded-full w-8 h-8 border-2 border-white shadow-premium animate-pulse text-xs font-black">
              🚗
            </div>
            <div class="bg-indigo-950/90 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow mt-1 border border-indigo-800">
              My Location
            </div>
          </div>
        `,
        iconSize: [60, 48],
        iconAnchor: [30, 24],
      });
      const uMarker = L.marker([userCoords.lat, userCoords.lng], { icon: userIcon });
      markersLayerRef.current?.addLayer(uMarker);
    }

    // Fit map bounds to encompass markers if we have multiple lots
    if (lots.length > 0 && !lat && !lng) {
      const group = L.featureGroup(
        lots.map((l) => L.marker([parseFloat(l.latitude), parseFloat(l.longitude)]))
      );
      mapInstanceRef.current.fitBounds(group.getBounds().pad(0.1));
    }
  }, [lots, lat, lng, userCoords]);

  // Clean up routing layer when search query updates
  useEffect(() => {
    return () => {
      if (routePolylineRef.current) {
        mapInstanceRef.current?.removeLayer(routePolylineRef.current);
        routePolylineRef.current = null;
      }
      if (userMarkerRef.current) {
        mapInstanceRef.current?.removeLayer(userMarkerRef.current);
        userMarkerRef.current = null;
      }
      setRouteInfo(null);
    };
  }, [lat, lng]);

  // Automatically calculate route from user (laptop place) coordinates to search destination
  useEffect(() => {
    if (!userCoords || !lat || !lng || !mapInstanceRef.current) return;

    const startLat = userCoords.lat;
    const startLng = userCoords.lng;
    const destLat = parseFloat(lat);
    const destLng = parseFloat(lng);

    if (isNaN(destLat) || isNaN(destLng)) return;

    const autoFetchRoute = async () => {
      try {
        const response = await fetch(
          `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${destLng},${destLat}?overview=full&geometries=geojson`
        );
        if (response.ok) {
          const data = await response.json();
          if (data.routes && data.routes.length > 0) {
            const route = data.routes[0];
            const coordinates = route.geometry.coordinates.map((c: any) => [c[1], c[0]]);

            // Clear existing polyline route
            if (routePolylineRef.current) {
              mapInstanceRef.current?.removeLayer(routePolylineRef.current);
            }
            // Draw new polyline route
            if (mapInstanceRef.current) {
              const polyline = L.polyline(coordinates, {
                color: '#6366f1',
                weight: 6,
                opacity: 0.85,
                lineCap: 'round',
                lineJoin: 'round',
              }).addTo(mapInstanceRef.current);
              routePolylineRef.current = polyline;

              const distKm = (route.distance / 1000).toFixed(1);
              const durMin = Math.ceil(route.duration / 60);
              setRouteInfo({
                distance: `${distKm} km`,
                duration: `${durMin} mins`,
              });

              // Adjust bounds to encompass both user position and destination
              const bounds = L.latLngBounds([
                [startLat, startLng],
                [destLat, destLng],
              ]);
              mapInstanceRef.current.fitBounds(bounds.pad(0.25));
            }
          }
        }
      } catch (err) {
        console.error('Failed to auto fetch route:', err);
      }
    };

    autoFetchRoute();
  }, [userCoords, lat, lng]);

  const getDirections = (lotLat: number, lotLng: number) => {
    const fetchRoute = async (startLat: number, startLng: number, isFallback = false) => {
      try {
        const response = await fetch(
          `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${lotLng},${lotLat}?overview=full&geometries=geojson`
        );
        if (response.ok) {
          const data = await response.json();
          if (data.routes && data.routes.length > 0) {
            const route = data.routes[0];
            const coordinates = route.geometry.coordinates.map((c: any) => [c[1], c[0]]);

            // Clear existing route layers
            if (routePolylineRef.current) {
              mapInstanceRef.current?.removeLayer(routePolylineRef.current);
            }
            if (userMarkerRef.current) {
              mapInstanceRef.current?.removeLayer(userMarkerRef.current);
            }

            // Draw new polyline route
            const polyline = L.polyline(coordinates, {
              color: '#6366f1',
              weight: 6,
              opacity: 0.85,
              lineCap: 'round',
              lineJoin: 'round',
            });

            if (mapInstanceRef.current) {
              polyline.addTo(mapInstanceRef.current);
              routePolylineRef.current = polyline;

              // Pulsing user location marker
              const userIcon = L.divIcon({
                className: 'custom-leaflet-marker bg-transparent border-none',
                html: `
                  <div class="flex flex-col items-center select-none">
                    <div class="flex items-center justify-center bg-indigo-600 text-white rounded-full w-8 h-8 border-2 border-white shadow-premium animate-pulse text-xs font-black">
                      🚗
                    </div>
                  </div>
                `,
                iconSize: [32, 32],
                iconAnchor: [16, 16],
              });

              const userMarker = L.marker([startLat, startLng], { icon: userIcon }).addTo(mapInstanceRef.current);
              userMarkerRef.current = userMarker;

              // Fit map frame
              const bounds = L.latLngBounds([
                [startLat, startLng],
                [lotLat, lotLng],
              ]);
              mapInstanceRef.current.fitBounds(bounds.pad(0.25));

              const distKm = (route.distance / 1000).toFixed(1);
              const durMin = Math.ceil(route.duration / 60);
              setRouteInfo({
                distance: `${distKm} km`,
                duration: `${durMin} mins`,
              });

              if (isFallback) {
                console.info("Location permission blocked or unavailable. Used fallback start coordinate.");
              }
            }
          }
        } else {
          alert("Could not fetch route directions.");
        }
      } catch (error) {
        console.error("OSRM Route fetch error:", error);
        alert("Error calculating driving directions.");
      }
    };

    if (!navigator.geolocation) {
      // Direct fallback
      fetchRoute(lotLat + 0.015, lotLng + 0.015, true);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        fetchRoute(position.coords.latitude, position.coords.longitude, false);
      },
      () => {
        console.warn("Geolocation failed/blocked. Using fallback start coordinates.");
        // Fallback offset: ~2km north-east
        fetchRoute(lotLat + 0.012, lotLng + 0.012, true);
      },
      { timeout: 4000, enableHighAccuracy: true }
    );
  };

  const toggleAmenity = (amenity: string) => {
    setSelectedAmenities((prev) =>
      prev.includes(amenity) ? prev.filter((a) => a !== amenity) : [...prev, amenity]
    );
  };

  const handleLotCardClick = (lot: Lot) => {
    setSelectedLot(lot);
    const lotLat = parseFloat(lot.latitude);
    const lotLng = parseFloat(lot.longitude);
    if (!isNaN(lotLat) && !isNaN(lotLng)) {
      mapInstanceRef.current?.setView([lotLat, lotLng], 15);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Top Search bar details [Professional Dark Theme] */}
      <div className="bg-slate-950 border-b border-slate-800/80 p-4 shrink-0 flex justify-center shadow-sm">
        <SearchBar initialValues={{ lat: lat || undefined, lng: lng || undefined, address, date, startTime, endTime }} />
      </div>

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        {/* Left Column: Sidebar Filters + Lot Cards List [Professional Dark Theme] */}
        <div className="w-full md:w-[450px] border-r border-slate-800 flex flex-col bg-slate-950 overflow-hidden shrink-0">
          
          {/* Filters Bar */}
          <div className="p-4 border-b border-slate-800 bg-slate-900/40 backdrop-blur-md space-y-3 shrink-0">
            <div className="flex items-center space-x-2 text-slate-200 font-bold text-sm">
              <SlidersHorizontal className="h-4 w-4 text-indigo-400" />
              <span>Filters</span>
            </div>

            {/* Price slider */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-slate-400 font-semibold">
                <span>Max Price: ₹{maxPrice}/hr</span>
              </div>
              <input
                type="range"
                min="0"
                max="50"
                value={maxPrice}
                onChange={(e) => setMaxPrice(parseInt(e.target.value))}
                className="w-full accent-indigo-500 h-1 bg-slate-800 rounded-lg cursor-pointer"
              />
            </div>

            {/* Amenities filters */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {['EV_CHARGING', 'COVERED', 'CCTV', 'HANDICAP_ACCESS', 'VALET'].map((am) => {
                const isActive = selectedAmenities.includes(am);
                return (
                  <button
                    key={am}
                    type="button"
                    onClick={() => toggleAmenity(am)}
                    className={`text-[10px] font-extrabold px-2.5 py-1.5 rounded-full border transition ${
                      isActive
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-slate-200'
                    }`}
                  >
                    {am.replace('_', ' ')}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Cards List container */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20">
                <Loader2 className="h-8 w-8 text-indigo-400 animate-spin mb-2" />
                <p className="text-sm font-semibold text-slate-400">Querying parking lots...</p>
              </div>
            ) : error ? (
              <div className="p-4 bg-rose-950/30 border border-rose-900/50 text-rose-400 text-sm font-semibold text-center rounded-2xl">
                {error}
              </div>
            ) : lots.length === 0 ? (
              <div className="text-center py-20 space-y-2">
                <Info className="h-8 w-8 text-slate-600 mx-auto" />
                <p className="text-sm font-bold text-slate-400">No Parking Lots Found</p>
                <p className="text-xs text-slate-500 font-medium max-w-xs mx-auto">Try widening your search radius or modifying active filter tags.</p>
              </div>
            ) : (
              lots.map((lot) => (
                <div
                  key={lot.id}
                  onClick={() => handleLotCardClick(lot)}
                  className="bg-slate-900/60 border border-slate-800/80 p-4 rounded-2xl shadow-sm hover:shadow-premium hover:border-indigo-500/50 transition cursor-pointer hover-lift flex space-x-4 text-slate-100 animate-fade-in"
                >
                  {/* Card Thumbnail */}
                  <div className="h-24 w-24 rounded-xl overflow-hidden bg-slate-950 shrink-0 relative border border-slate-800">
                    {lot.imageUrls && lot.imageUrls.length > 0 ? (
                      <img src={lot.imageUrls[0]} alt={lot.name} className="w-full h-full object-cover opacity-90" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[10px] text-slate-500 font-bold">No Image</div>
                    )}
                    {lot.isSurge && (
                      <div className="absolute top-1 right-1 bg-amber-500 p-0.5 rounded-full shadow animate-pulse">
                        <Zap className="h-3.5 w-3.5 text-white fill-current" />
                      </div>
                    )}
                  </div>

                  {/* Card Body */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <h3 className="font-extrabold text-slate-200 text-base truncate tracking-tight">{lot.name}</h3>
                    
                    <div className="flex items-center text-xs text-slate-400 font-semibold space-x-1">
                      <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-500" />
                      <span className="truncate">{lot.address}, {lot.city}</span>
                    </div>

                    <div className="flex items-center space-x-2 text-xs font-bold text-indigo-400 bg-indigo-950/60 border border-indigo-900/50 rounded-lg px-2 py-0.5 w-fit">
                      <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
                      <span>{lot.avgRating ? lot.avgRating.toFixed(1) : 'New'}</span>
                      {lot.distance !== null && (
                        <>
                          <span className="text-indigo-800">•</span>
                          <span>{lot.distance.toFixed(1)} km away</span>
                        </>
                      )}
                    </div>

                    <div className="flex items-baseline space-x-0.5 pt-1.5 justify-end">
                      <span className="text-lg font-black text-indigo-400">₹{Number(lot.pricePerHour).toFixed(2)}</span>
                      <span className="text-[10px] font-semibold text-slate-500">/hr</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Column: Leaflet Map Container */}
        <div className="flex-1 h-full bg-slate-100 relative">
          <div ref={mapContainerRef} className="w-full h-full"></div>
          
          {/* Floating Map Style Switcher */}
          <div className="absolute top-4 right-4 z-[1000] flex space-x-1 bg-white/90 backdrop-blur-md border border-slate-200/50 p-1.5 rounded-2xl shadow-premium">
            <button
              onClick={() => setMapStyle('streets')}
              className={`flex items-center space-x-1.5 px-3.5 py-2.5 rounded-xl text-xs font-black transition duration-200 hover-lift ${
                mapStyle === 'streets'
                  ? 'bg-slate-950 text-white shadow'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <MapIcon className="w-4 h-4" />
              <span>Standard</span>
            </button>
            <button
              onClick={() => setMapStyle('satellite')}
              className={`flex items-center space-x-1.5 px-3.5 py-2.5 rounded-xl text-xs font-black transition duration-200 hover-lift ${
                mapStyle === 'satellite'
                  ? 'bg-slate-950 text-white shadow'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Globe className="w-4 h-4" />
              <span>Satellite</span>
            </button>
          </div>

          {/* Floating Route Info Panel */}
          {routeInfo && (
            <div className="absolute bottom-6 right-6 bg-slate-950/95 border border-slate-800 rounded-3xl shadow-premium p-4 z-[1000] w-64 text-slate-100 flex flex-col space-y-2.5 backdrop-blur-md animate-slide-up">
              <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                <span className="text-xs font-bold text-slate-400">Navigation Route</span>
                <button
                  onClick={() => {
                    if (routePolylineRef.current) mapInstanceRef.current?.removeLayer(routePolylineRef.current);
                    if (userMarkerRef.current) mapInstanceRef.current?.removeLayer(userMarkerRef.current);
                    routePolylineRef.current = null;
                    userMarkerRef.current = null;
                    setRouteInfo(null);
                  }}
                  className="text-[10px] bg-rose-600 hover:bg-rose-700 text-white font-extrabold px-2.5 py-1.5 rounded-xl shadow transition"
                >
                  Clear Route
                </button>
              </div>
              <div className="flex justify-around py-1">
                <div className="text-center">
                  <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">Distance</span>
                  <span className="text-lg font-black text-indigo-400">{routeInfo.distance}</span>
                </div>
                <div className="text-center border-l border-slate-800 pl-4">
                  <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">Est. Time</span>
                  <span className="text-lg font-black text-amber-400">{routeInfo.duration}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Lot Details Overlay Drawer */}
      <LotDetailDrawer
        lot={selectedLot}
        onClose={() => setSelectedLot(null)}
        startTime={`${date}T${startTime}:00Z`}
        endTime={`${date}T${endTime}:00Z`}
        onGetDirections={getDirections}
      />

      {/* Floating AI Assistant Guide */}
      <AIAssistant />
    </div>
  );
}
