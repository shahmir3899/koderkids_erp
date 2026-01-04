// ============================================
// LEAD STATUS BADGE - Status Display Component
// ============================================

import React from 'react';
import { LEAD_STATUS } from '../../utils/constants';

export const LeadStatusBadge = ({ status }) => {
  const getStatusStyles = (status) => {
    switch (status) {
      case LEAD_STATUS.NEW:
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case LEAD_STATUS.CONTACTED:
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case LEAD_STATUS.INTERESTED:
        return 'bg-green-100 text-green-800 border-green-200';
      case LEAD_STATUS.NOT_INTERESTED:
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case LEAD_STATUS.CONVERTED:
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case LEAD_STATUS.LOST:
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getStatusStyles(status)}`}
    >
      {status}
    </span>
  );
};

export default LeadStatusBadge;
