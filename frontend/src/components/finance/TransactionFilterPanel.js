// ============================================
// TRANSACTION FILTER PANEL COMPONENT
// ============================================

import React, { useState, useMemo } from 'react';
import Select from 'react-select';
import Slider from 'rc-slider';
import 'rc-slider/assets/index.css';
import { format } from 'date-fns';

export const TransactionFilterPanel = ({ schools, categories, onSearch, loading }) => {
  // Filter States
  const [selectedSchools, setSelectedSchools] = useState([]);
  const [transactionType, setTransactionType] = useState('Income');
  const [selectedCategories, setSelectedCategories] = useState([]);
  
  const dateMin = new Date(2024, 0, 1); // Jan 2024
  const dateMax = new Date(2025, 11, 31); // Dec 2025
  const [sliderRange, setSliderRange] = useState([dateMin.getTime(), dateMax.getTime()]);

  // School options for react-select
  const schoolOptions = useMemo(
    () => schools.map((school) => ({
      value: String(school.id),
      label: school.name,
    })),
    [schools]
  );

  // Category options based on transaction type
  const categoryOptions = useMemo(() => {
    if (transactionType === 'Income') {
      return categories.income || [];
    } else if (transactionType === 'Expense') {
      return categories.expense || [];
    }
    return [];
  }, [transactionType, categories]);

  // Handle transaction type change
  const handleTransactionTypeChange = (type) => {
    setTransactionType(type);
    setSelectedCategories([]); // Reset categories when type changes
  };

  // Handle category toggle
  const toggleCategory = (category) => {
    setSelectedCategories((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category]
    );
  };

  // Handle search
  const handleSearch = () => {
    onSearch({
      selectedSchools,
      transactionType,
      selectedCategories,
      startDate: format(new Date(sliderRange[0]), 'yyyy-MM-dd'),
      endDate: format(new Date(sliderRange[1]), 'yyyy-MM-dd'),
    });
  };

  return (
    <div style={{ marginBottom: '2rem' }}>
      {/* Filter Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '1.5rem',
        marginBottom: '1.5rem',
      }}>
        {/* School Multi-Select */}
        <div>
          <label style={{
            display: 'block',
            marginBottom: '0.5rem',
            fontWeight: '500',
            color: '#374151',
            fontSize: '0.875rem',
          }}>
            Schools
          </label>
          <Select
            isMulti
            options={schoolOptions}
            onChange={(selected) => setSelectedSchools(selected.map((s) => s.value))}
            placeholder="Select schools..."
            styles={{
              control: (base) => ({
                ...base,
                borderColor: '#D1D5DB',
                '&:hover': { borderColor: '#9CA3AF' },
              }),
            }}
          />
        </div>

        {/* Date Range Slider */}
        <div>
          <label style={{
            display: 'block',
            marginBottom: '0.5rem',
            fontWeight: '500',
            color: '#374151',
            fontSize: '0.875rem',
          }}>
            Date Range
          </label>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            paddingTop: '0.5rem',
          }}>
            <span style={{ fontSize: '0.875rem', color: '#6B7280', minWidth: '70px' }}>
              {format(new Date(sliderRange[0]), 'MMM yyyy')}
            </span>
            <Slider
              range
              min={dateMin.getTime()}
              max={dateMax.getTime()}
              step={30 * 24 * 60 * 60 * 1000} // ~1 month
              value={sliderRange}
              onChange={setSliderRange}
              allowCross={false}
              trackStyle={[{ backgroundColor: '#3B82F6' }]}
              handleStyle={[
                { borderColor: '#3B82F6', backgroundColor: '#3B82F6' },
                { borderColor: '#3B82F6', backgroundColor: '#3B82F6' },
              ]}
              railStyle={{ backgroundColor: '#E5E7EB' }}
              style={{ flex: 1 }}
            />
            <span style={{ fontSize: '0.875rem', color: '#6B7280', minWidth: '70px' }}>
              {format(new Date(sliderRange[1]), 'MMM yyyy')}
            </span>
          </div>
        </div>
      </div>

      {/* Transaction Type Buttons */}
      <div style={{ marginBottom: '1.5rem' }}>
        <label style={{
          display: 'block',
          marginBottom: '0.5rem',
          fontWeight: '500',
          color: '#374151',
          fontSize: '0.875rem',
        }}>
          Transaction Type
        </label>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          {['Income', 'Expense'].map((type) => (
            <button
              key={type}
              onClick={() => handleTransactionTypeChange(type)}
              style={{
                padding: '0.5rem 1.5rem',
                borderRadius: '6px',
                border: 'none',
                fontWeight: '500',
                cursor: 'pointer',
                backgroundColor: transactionType === type ? '#3B82F6' : '#E5E7EB',
                color: transactionType === type ? 'white' : '#374151',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                if (transactionType !== type) {
                  e.target.style.backgroundColor = '#D1D5DB';
                }
              }}
              onMouseLeave={(e) => {
                if (transactionType !== type) {
                  e.target.style.backgroundColor = '#E5E7EB';
                }
              }}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* Category Chips */}
      <div style={{ marginBottom: '1.5rem' }}>
        <label style={{
          display: 'block',
          marginBottom: '0.5rem',
          fontWeight: '500',
          color: '#374151',
          fontSize: '0.875rem',
        }}>
          Categories
        </label>
        {categoryOptions.length > 0 ? (
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.75rem',
          }}>
            {categoryOptions.map((category) => (
              <div
                key={category}
                onClick={() => toggleCategory(category)}
                style={{
                  cursor: 'pointer',
                  padding: '0.5rem 1rem',
                  borderRadius: '6px',
                  border: '1px solid',
                  borderColor: selectedCategories.includes(category) ? '#3B82F6' : '#D1D5DB',
                  backgroundColor: selectedCategories.includes(category) ? '#3B82F6' : 'white',
                  color: selectedCategories.includes(category) ? 'white' : '#374151',
                  fontWeight: '500',
                  fontSize: '0.875rem',
                  transition: 'all 0.2s',
                  boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
                }}
                onMouseEnter={(e) => {
                  if (!selectedCategories.includes(category)) {
                    e.target.style.backgroundColor = '#F3F4F6';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!selectedCategories.includes(category)) {
                    e.target.style.backgroundColor = 'white';
                  }
                }}
              >
                {category}
              </div>
            ))}
          </div>
        ) : (
          <p style={{ color: '#9CA3AF', fontSize: '0.875rem', margin: 0 }}>
            No categories available for this transaction type.
          </p>
        )}
      </div>

      {/* Search Button */}
      <button
        onClick={handleSearch}
        disabled={loading}
        style={{
          width: '100%',
          padding: '0.75rem 1.5rem',
          backgroundColor: loading ? '#9CA3AF' : '#3B82F6',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          fontWeight: '600',
          fontSize: '1rem',
          cursor: loading ? 'not-allowed' : 'pointer',
          transition: 'background-color 0.2s',
        }}
        onMouseEnter={(e) => {
          if (!loading) e.target.style.backgroundColor = '#2563EB';
        }}
        onMouseLeave={(e) => {
          if (!loading) e.target.style.backgroundColor = '#3B82F6';
        }}
      >
        {loading ? 'Searching...' : 'Search Transactions'}
      </button>
    </div>
  );
};