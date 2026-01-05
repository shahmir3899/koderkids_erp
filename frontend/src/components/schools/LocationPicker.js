// ============================================
// LOCATION PICKER - Enhanced with Geocoding & Interactive Map
// ============================================

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default marker icon issue with webpack
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;

/**
 * Map Click Handler Component
 * Handles click events on the map to update marker position
 */
const MapClickHandler = ({ onMapClick }) => {
  useMapEvents({
    click: (e) => {
      onMapClick(e.latlng);
    },
  });
  return null;
};

/**
 * LocationPicker Component
 * Enhanced with address search, reverse geocoding, Pakistan validation, and interactive map
 *
 * @param {Object} props
 * @param {number} props.initialLat - Initial latitude
 * @param {number} props.initialLng - Initial longitude
 * @param {Function} props.onLocationChange - Callback when location changes
 */
export const LocationPicker = ({
  initialLat = 33.5651,
  initialLng = 73.0169,
  onLocationChange,
}) => {
  const [latitude, setLatitude] = useState(initialLat || '');
  const [longitude, setLongitude] = useState(initialLng || '');
  const [error, setError] = useState(null);
  const [addressSearch, setAddressSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedAddress, setSelectedAddress] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [isLoadingReverse, setIsLoadingReverse] = useState(false);
  const [warning, setWarning] = useState(null);
  const [lastReverseGeocodedCoords, setLastReverseGeocodedCoords] = useState(null);
  const [markerPosition, setMarkerPosition] = useState([initialLat || 33.5651, initialLng || 73.0169]);
  const markerRef = useRef(null);

  // Pakistan boundary constants
  const PAKISTAN_BOUNDS = {
    minLat: 23.5,
    maxLat: 37.5,
    minLng: 60.5,
    maxLng: 77.5,
  };

  // Validate if coordinates are within Pakistan
  const isWithinPakistan = useCallback((lat, lng) => {
    return (
      lat >= PAKISTAN_BOUNDS.minLat &&
      lat <= PAKISTAN_BOUNDS.maxLat &&
      lng >= PAKISTAN_BOUNDS.minLng &&
      lng <= PAKISTAN_BOUNDS.maxLng
    );
  }, []);

  // Reverse geocode coordinates to get address (with throttling)
  const reverseGeocode = useCallback(async (lat, lng) => {
    // Check if we already geocoded these exact coordinates
    const coordsKey = `${lat.toFixed(4)},${lng.toFixed(4)}`; // Round to 4 decimals for cache key
    if (lastReverseGeocodedCoords === coordsKey) {
      return; // Skip if coordinates haven't changed significantly
    }

    setIsLoadingReverse(true);
    setLastReverseGeocodedCoords(coordsKey);

    // Add delay to respect rate limits (1 request per second)
    await new Promise(resolve => setTimeout(resolve, 1000));

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`,
        {
          headers: {
            'Accept-Language': 'en',
            'User-Agent': 'SchoolManagementSystem/1.0', // Required by Nominatim
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.display_name) {
          setSelectedAddress(data.display_name);
        }
      } else if (response.status === 429) {
        // Rate limit exceeded
        console.warn('Rate limit exceeded, skipping reverse geocoding');
        setSelectedAddress('Address lookup temporarily unavailable (rate limit)');
      }
    } catch (err) {
      console.error('Reverse geocoding error:', err);
      // Don't show error to user, just skip the address display
      setSelectedAddress('');
    } finally {
      setIsLoadingReverse(false);
    }
  }, [lastReverseGeocodedCoords]);

  // Update parent when location changes (with debouncing for reverse geocoding)
  useEffect(() => {
    if (latitude && longitude) {
      const lat = parseFloat(latitude);
      const lng = parseFloat(longitude);

      // Validate coordinates
      if (isNaN(lat) || isNaN(lng)) {
        setError('Invalid coordinates');
        return;
      }

      if (lat < -90 || lat > 90) {
        setError('Latitude must be between -90 and 90');
        return;
      }

      if (lng < -180 || lng > 180) {
        setError('Longitude must be between -180 and 180');
        return;
      }

      setError(null);

      // Check Pakistan boundaries
      if (!isWithinPakistan(lat, lng)) {
        setWarning('⚠️ Warning: These coordinates appear to be outside Pakistan');
      } else {
        setWarning(null);
      }

      if (onLocationChange) {
        onLocationChange(lat, lng);
      }

      // Debounce reverse geocoding to avoid rapid API calls
      const timer = setTimeout(() => {
        reverseGeocode(lat, lng);
      }, 1500); // Wait 1.5 seconds after user stops changing coordinates

      return () => clearTimeout(timer);
    }
  }, [latitude, longitude, onLocationChange, isWithinPakistan, reverseGeocode]);

  // Search address using Nominatim (with proper headers)
  const searchAddress = useCallback(async (query) => {
    if (!query || query.length < 3) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    setError(null);

    // Respect rate limits
    await new Promise(resolve => setTimeout(resolve, 1000));

    try {
      // Add Pakistan to search query for better results
      const searchQuery = query.includes('Pakistan') ? query : `${query}, Pakistan`;

      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
          searchQuery
        )}&format=json&addressdetails=1&limit=5&countrycodes=pk`,
        {
          headers: {
            'Accept-Language': 'en',
            'User-Agent': 'SchoolManagementSystem/1.0', // Required by Nominatim
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setSearchResults(data);
      } else if (response.status === 429) {
        setError('⚠️ Too many requests. Please wait a moment and try again.');
      } else {
        setError('Failed to search address. Please try again.');
      }
    } catch (err) {
      console.error('Address search error:', err);
      setError('Network error. Please check your connection.');
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Handle address search input
  const handleAddressSearchChange = (e) => {
    const value = e.target.value;
    setAddressSearch(value);
  };

  // Debounced search effect
  useEffect(() => {
    const timer = setTimeout(() => {
      if (addressSearch) {
        searchAddress(addressSearch);
      } else {
        setSearchResults([]); // Clear results when search is cleared
      }
    }, 800); // Wait 800ms after user stops typing (increased to reduce API calls)

    return () => clearTimeout(timer);
  }, [addressSearch, searchAddress]);

  // Handle selecting a search result
  const handleSelectAddress = (result) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);

    setLatitude(lat.toFixed(7));
    setLongitude(lng.toFixed(7));
    setMarkerPosition([lat, lng]);
    setSelectedAddress(result.display_name);
    setSearchResults([]);
    setAddressSearch('');
  };

  // Handle map click
  const handleMapClick = useCallback((latlng) => {
    const lat = latlng.lat;
    const lng = latlng.lng;

    setLatitude(lat.toFixed(7));
    setLongitude(lng.toFixed(7));
    setMarkerPosition([lat, lng]);
  }, []);

  // Handle marker drag
  const handleMarkerDrag = useCallback(() => {
    const marker = markerRef.current;
    if (marker != null) {
      const latlng = marker.getLatLng();
      setLatitude(latlng.lat.toFixed(7));
      setLongitude(latlng.lng.toFixed(7));
      setMarkerPosition([latlng.lat, latlng.lng]);
    }
  }, []);

  // Update marker position when coordinates change
  useEffect(() => {
    if (latitude && longitude) {
      const lat = parseFloat(latitude);
      const lng = parseFloat(longitude);

      if (!isNaN(lat) && !isNaN(lng)) {
        setMarkerPosition([lat, lng]);
      }
    }
  }, [latitude, longitude]);

  // Handle latitude change
  const handleLatitudeChange = (e) => {
    const value = e.target.value;
    setLatitude(value);
  };

  // Handle longitude change
  const handleLongitudeChange = (e) => {
    const value = e.target.value;
    setLongitude(value);
  };

  // Get current location from browser
  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError('❌ Geolocation is not supported by your browser');
      return;
    }

    setIsLoadingLocation(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;

        setLatitude(lat.toFixed(7));
        setLongitude(lng.toFixed(7));
        setMarkerPosition([lat, lng]);
        setError(null);
        setIsLoadingLocation(false);
      },
      (error) => {
        setIsLoadingLocation(false);

        // Specific error messages
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setError('❌ Location permission denied. Please enable location access in your browser settings.');
            break;
          case error.POSITION_UNAVAILABLE:
            setError('❌ Location information is unavailable. Please try again.');
            break;
          case error.TIMEOUT:
            setError('❌ Location request timed out. Please try again.');
            break;
          default:
            setError('❌ Unable to get current location. Please try again.');
            break;
        }
        console.error('Geolocation error:', error);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  // Styles
  const containerStyle = {
    marginBottom: '1.5rem',
  };

  const labelStyle = {
    fontSize: '0.875rem',
    fontWeight: '500',
    color: '#374151',
    marginBottom: '0.5rem',
    display: 'block',
  };

  const infoBoxStyle = {
    padding: '0.75rem',
    backgroundColor: '#EFF6FF',
    border: '1px solid #BFDBFE',
    borderRadius: '0.5rem',
    marginBottom: '1rem',
  };

  const infoTextStyle = {
    fontSize: '0.875rem',
    color: '#1E40AF',
    marginBottom: '0.5rem',
  };

  const currentLocationButtonStyle = {
    padding: '0.5rem 1rem',
    backgroundColor: '#3B82F6',
    color: '#FFFFFF',
    borderRadius: '0.375rem',
    fontSize: '0.875rem',
    fontWeight: '500',
    cursor: 'pointer',
    border: 'none',
    transition: 'background-color 0.15s ease',
  };

  const inputsContainerStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '1rem',
    marginBottom: '1rem',
  };

  const inputGroupStyle = {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  };

  const inputLabelStyle = {
    fontSize: '0.875rem',
    fontWeight: '500',
    color: '#374151',
  };

  const inputStyle = {
    padding: '0.625rem 0.75rem',
    border: '1px solid #D1D5DB',
    borderRadius: '0.5rem',
    fontSize: '0.875rem',
    color: '#374151',
    transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
  };

  const errorStyle = {
    fontSize: '0.875rem',
    color: '#EF4444',
    marginTop: '0.5rem',
  };

  const hintStyle = {
    fontSize: '0.75rem',
    color: '#6B7280',
    marginTop: '0.5rem',
  };

  const warningStyle = {
    fontSize: '0.875rem',
    color: '#F59E0B',
    backgroundColor: '#FEF3C7',
    padding: '0.75rem',
    borderRadius: '0.5rem',
    marginTop: '0.75rem',
    border: '1px solid #FCD34D',
  };

  const addressDisplayStyle = {
    fontSize: '0.875rem',
    color: '#059669',
    backgroundColor: '#D1FAE5',
    padding: '0.75rem',
    borderRadius: '0.5rem',
    marginTop: '0.75rem',
    border: '1px solid #6EE7B7',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  };

  const searchContainerStyle = {
    marginBottom: '1rem',
    position: 'relative',
  };

  const searchInputStyle = {
    width: '100%',
    padding: '0.625rem 0.75rem',
    border: '1px solid #D1D5DB',
    borderRadius: '0.5rem',
    fontSize: '0.875rem',
    color: '#374151',
    transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
  };

  const searchResultsStyle = {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    border: '1px solid #D1D5DB',
    borderRadius: '0.5rem',
    marginTop: '0.25rem',
    maxHeight: '200px',
    overflowY: 'auto',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
    zIndex: 1000,
  };

  const searchResultItemStyle = {
    padding: '0.75rem',
    cursor: 'pointer',
    borderBottom: '1px solid #F3F4F6',
    fontSize: '0.875rem',
    color: '#374151',
    transition: 'background-color 0.15s ease',
  };

  const loadingSpinnerStyle = {
    display: 'inline-block',
    width: '14px',
    height: '14px',
    border: '2px solid #E5E7EB',
    borderTopColor: '#3B82F6',
    borderRadius: '50%',
    animation: 'spin 0.6s linear infinite',
  };

  const mapContainerStyle = {
    width: '100%',
    height: '300px',
    borderRadius: '0.5rem',
    marginBottom: '1rem',
    border: '2px solid #D1D5DB',
    overflow: 'hidden',
  };

  const mapHintStyle = {
    fontSize: '0.75rem',
    color: '#6B7280',
    marginTop: '-0.5rem',
    marginBottom: '1rem',
    fontStyle: 'italic',
  };

  return (
    <div style={containerStyle}>
      <label style={labelStyle}>📍 School Location</label>

      {/* Address Search */}
      <div style={searchContainerStyle}>
        <label style={inputLabelStyle}>Search by Address or School Name</label>
        <input
          type="text"
          placeholder="e.g., Murree Road Rawalpindi, or School Name..."
          value={addressSearch}
          onChange={handleAddressSearchChange}
          style={searchInputStyle}
          onFocus={(e) => {
            e.target.style.borderColor = '#3B82F6';
            e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
          }}
          onBlur={(e) => {
            // Delay to allow click on search result
            setTimeout(() => {
              e.target.style.borderColor = '#D1D5DB';
              e.target.style.boxShadow = 'none';
            }, 200);
          }}
        />

        {/* Loading indicator for search */}
        {isSearching && (
          <div style={{ position: 'absolute', right: '0.75rem', top: '2rem' }}>
            <div style={loadingSpinnerStyle}></div>
          </div>
        )}

        {/* Search Results Dropdown */}
        {searchResults.length > 0 && (
          <div style={searchResultsStyle}>
            {searchResults.map((result, index) => (
              <div
                key={index}
                style={searchResultItemStyle}
                onClick={() => handleSelectAddress(result)}
                onMouseEnter={(e) => (e.target.style.backgroundColor = '#F3F4F6')}
                onMouseLeave={(e) => (e.target.style.backgroundColor = '#FFFFFF')}
              >
                📍 {result.display_name}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Info Box */}
      <div style={infoBoxStyle}>
        <div style={infoTextStyle}>
          💡 Tip: Search by address above, use your current location, or enter coordinates manually
        </div>
        <button
          type="button"
          style={currentLocationButtonStyle}
          onClick={handleGetCurrentLocation}
          disabled={isLoadingLocation}
          onMouseEnter={(e) => !isLoadingLocation && (e.target.style.backgroundColor = '#2563EB')}
          onMouseLeave={(e) => !isLoadingLocation && (e.target.style.backgroundColor = '#3B82F6')}
        >
          {isLoadingLocation ? (
            <>
              <span style={loadingSpinnerStyle}></span> Getting Location...
            </>
          ) : (
            '📍 Use My Current Location'
          )}
        </button>
      </div>

      {/* Interactive Map */}
      <div style={mapContainerStyle}>
        <MapContainer
          center={markerPosition}
          zoom={13}
          style={{ height: '100%', width: '100%' }}
          key={`${markerPosition[0]}-${markerPosition[1]}`}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <Marker
            position={markerPosition}
            draggable={true}
            ref={markerRef}
            eventHandlers={{
              dragend: handleMarkerDrag,
            }}
          />
          <MapClickHandler onMapClick={handleMapClick} />
        </MapContainer>
      </div>
      <div style={mapHintStyle}>
        💡 Click on the map to place marker, or drag the marker to adjust location
      </div>

      {/* Coordinate Inputs */}
      <div style={inputsContainerStyle}>
        <div style={inputGroupStyle}>
          <label style={inputLabelStyle}>Latitude *</label>
          <input
            type="number"
            step="0.0000001"
            value={latitude}
            onChange={handleLatitudeChange}
            placeholder="33.5651"
            style={inputStyle}
            onFocus={(e) => {
              e.target.style.borderColor = '#3B82F6';
              e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = '#D1D5DB';
              e.target.style.boxShadow = 'none';
            }}
          />
        </div>

        <div style={inputGroupStyle}>
          <label style={inputLabelStyle}>Longitude *</label>
          <input
            type="number"
            step="0.0000001"
            value={longitude}
            onChange={handleLongitudeChange}
            placeholder="73.0169"
            style={inputStyle}
            onFocus={(e) => {
              e.target.style.borderColor = '#3B82F6';
              e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = '#D1D5DB';
              e.target.style.boxShadow = 'none';
            }}
          />
        </div>
      </div>

      {/* Selected Address Display */}
      {selectedAddress && !isLoadingReverse && (
        <div style={addressDisplayStyle}>
          <span>✅</span>
          <div>
            <strong>Selected Location:</strong>
            <br />
            {selectedAddress}
          </div>
        </div>
      )}

      {/* Loading Reverse Geocoding */}
      {isLoadingReverse && (
        <div style={addressDisplayStyle}>
          <span style={loadingSpinnerStyle}></span>
          <span>Loading address information...</span>
        </div>
      )}

      {/* Error Message */}
      {error && <div style={errorStyle}>{error}</div>}

      {/* Warning Message */}
      {warning && <div style={warningStyle}>{warning}</div>}

      {/* Hint */}
      <div style={hintStyle}>
        Example: Rawalpindi, Pakistan (Lat: 33.5651, Lng: 73.0169)
      </div>
    </div>
  );
};

// Add CSS animation for spinner
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = `
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `;
  if (!document.head.querySelector('style[data-location-picker-animations]')) {
    styleSheet.setAttribute('data-location-picker-animations', 'true');
    document.head.appendChild(styleSheet);
  }
}

export default LocationPicker;