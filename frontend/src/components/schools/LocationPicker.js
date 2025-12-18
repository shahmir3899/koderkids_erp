// ============================================
// LOCATION PICKER - Lat/Lng Input Fields
// ============================================

import React, { useState, useEffect } from 'react';

/**
 * LocationPicker Component
 * Simple latitude/longitude input fields
 * TODO: Add interactive map integration (react-leaflet or react-map-gl)
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

  // Update parent when location changes
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
      
      if (onLocationChange) {
        onLocationChange(lat, lng);
      }
    }
  }, [latitude, longitude, onLocationChange]);

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
      setError('Geolocation is not supported by your browser');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(position.coords.latitude.toFixed(7));
        setLongitude(position.coords.longitude.toFixed(7));
        setError(null);
      },
      (error) => {
        setError('Unable to get current location');
        console.error('Geolocation error:', error);
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

  const mapPlaceholderStyle = {
    width: '100%',
    height: '200px',
    backgroundColor: '#F3F4F6',
    borderRadius: '0.5rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '2px dashed #D1D5DB',
    marginBottom: '1rem',
  };

  const mapPlaceholderTextStyle = {
    fontSize: '0.875rem',
    color: '#6B7280',
    textAlign: 'center',
  };

  return (
    <div style={containerStyle}>
      <label style={labelStyle}>📍 School Location</label>

      {/* Info Box */}
      <div style={infoBoxStyle}>
        <div style={infoTextStyle}>
          💡 Tip: You can use your current location or enter coordinates manually
        </div>
        <button
          type="button"
          style={currentLocationButtonStyle}
          onClick={handleGetCurrentLocation}
          onMouseEnter={(e) => (e.target.style.backgroundColor = '#2563EB')}
          onMouseLeave={(e) => (e.target.style.backgroundColor = '#3B82F6')}
        >
          📍 Use My Current Location
        </button>
      </div>

      {/* Map Placeholder (for future implementation) */}
      <div style={mapPlaceholderStyle}>
        <div style={mapPlaceholderTextStyle}>
          🗺️ Interactive map coming soon!<br />
          For now, enter coordinates manually below
        </div>
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

      {/* Error Message */}
      {error && <div style={errorStyle}>❌ {error}</div>}

      {/* Hint */}
      <div style={hintStyle}>
        Example: Rawalpindi, Pakistan (Lat: 33.5651, Lng: 73.0169)
      </div>
    </div>
  );
};

export default LocationPicker;