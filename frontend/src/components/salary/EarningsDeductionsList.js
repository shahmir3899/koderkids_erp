import React from 'react';
import { Button } from '../common/ui/Button';

export function EarningsDeductionsList({ 
  items, 
  type, // 'earning' or 'deduction'
  onAdd, 
  onUpdate, 
  onRemove 
}) {
  const isEarning = type === 'earning';
  const label = isEarning ? 'Additional Earnings' : 'Deductions';
  const placeholder = isEarning ? 'Category (e.g., Bonus)' : 'Category (e.g., Loan)';

  return (
    <div style={{ marginBottom: '1rem' }}>
      <label style={{ fontWeight: 'bold', marginBottom: '0.5rem', display: 'block', color: '#374151' }}>
        {label}:
      </label>
      
      {items.map((item, index) => (
        <div key={index} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <input
            type="text"
            value={item.category}
            onChange={(e) => onUpdate(index, 'category', e.target.value)}
            placeholder={placeholder}
            style={{ flex: 1, padding: '0.5rem', border: '1px solid #D1D5DB', borderRadius: '0.5rem' }}
          />
          <input
            type="number"
            value={item.amount}
            onChange={(e) => onUpdate(index, 'amount', e.target.value)}
            placeholder="Amount"
            style={{ flex: 1, padding: '0.5rem', border: '1px solid #D1D5DB', borderRadius: '0.5rem' }}
          />
          <Button onClick={() => onRemove(index)} variant="danger" size="small">
            Remove
          </Button>
        </div>
      ))}
      
      <Button onClick={onAdd} variant="success" size="small">
        Add {isEarning ? 'Earning' : 'Deduction'}
      </Button>
    </div>
  );
}