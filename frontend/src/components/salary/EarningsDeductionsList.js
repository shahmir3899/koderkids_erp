import React from 'react';
import { Button } from '../common/ui/Button';

export function EarningsDeductionsList({
  items,
  type, // 'earning' or 'deduction'
  onAdd,
  onUpdate,
  onRemove,
  readOnly = false, // Self-service mode - view only
}) {
  const isEarning = type === 'earning';
  const label = isEarning ? 'Additional Earnings' : 'Deductions';
  const placeholder = isEarning ? 'Category (e.g., Bonus)' : 'Category (e.g., Loan)';

  const readOnlyStyle = readOnly ? {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    cursor: 'not-allowed',
    opacity: 0.8,
  } : {};

  return (
    <div style={{ marginBottom: '1rem' }}>
      <label style={{ fontWeight: 'bold', marginBottom: '0.5rem', display: 'block', color: '#374151' }}>
        {label}:
      </label>

      {items.length === 0 && readOnly && (
        <p style={{ color: 'rgba(255, 255, 255, 0.5)', fontStyle: 'italic', fontSize: '0.875rem' }}>
          No {isEarning ? 'additional earnings' : 'deductions'} configured.
        </p>
      )}

      {items.map((item, index) => (
        <div key={index} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <input
            type="text"
            value={item.category}
            onChange={(e) => !readOnly && onUpdate(index, 'category', e.target.value)}
            placeholder={placeholder}
            readOnly={readOnly}
            style={{
              flex: 1,
              padding: '0.5rem',
              border: '1px solid #D1D5DB',
              borderRadius: '0.5rem',
              ...readOnlyStyle,
            }}
          />
          <input
            type="number"
            value={item.amount}
            onChange={(e) => !readOnly && onUpdate(index, 'amount', e.target.value)}
            placeholder="Amount"
            readOnly={readOnly}
            style={{
              flex: 1,
              padding: '0.5rem',
              border: '1px solid #D1D5DB',
              borderRadius: '0.5rem',
              ...readOnlyStyle,
            }}
          />
          {!readOnly && (
            <Button onClick={() => onRemove(index)} variant="danger" size="small">
              Remove
            </Button>
          )}
        </div>
      ))}

      {!readOnly && (
        <Button onClick={onAdd} variant="success" size="small">
          Add {isEarning ? 'Earning' : 'Deduction'}
        </Button>
      )}
    </div>
  );
}