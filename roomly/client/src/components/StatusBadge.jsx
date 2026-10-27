import React from 'react';
import { STATUS_COLORS } from '../utils';

export default function StatusBadge({ status }) {
  if (!status) return null;
  return <span className={`badge text-bg-${STATUS_COLORS[status] || 'secondary'}`}>{status}</span>;
}
