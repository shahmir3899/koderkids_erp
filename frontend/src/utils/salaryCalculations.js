// Calculate actual number of days between two dates (inclusive)
export function calculateActualDays(fromDate, tillDate) {
  if (!fromDate || !tillDate) return 0;
  const from = new Date(fromDate);
  const till = new Date(tillDate);
  if (till < from) return 0;
  return Math.floor((till - from) / (1000 * 60 * 60 * 24)) + 1;
}

// Calculate days normalized (30 or 31 becomes 30)
export function calculateNormalizedDays(fromDate, tillDate) {
  if (!fromDate || !tillDate) return 0;
  const from = new Date(fromDate);
  const till = new Date(tillDate);
  if (till < from) return 0;
  const days = Math.floor((till - from) / (1000 * 60 * 60 * 24)) + 1;
  return (days === 30 || days === 31) ? 30 : days;
}

// Calculate prorated salary
export function calculateProratedSalary(basicSalary, normalizedDays) {
  return (basicSalary / 30) * normalizedDays || 0;
}

// Calculate totals
export function calculateTotals(proratedSalary, earnings, deductions) {
  const additionalEarnings = earnings.reduce((sum, e) => sum + (e.amount || 0), 0);
  const totalEarning = proratedSalary + additionalEarnings;
  const totalDeduction = deductions.reduce((sum, d) => sum + (d.amount || 0), 0);
  const netPay = totalEarning - totalDeduction;
  
  return { totalEarning, totalDeduction, netPay };
}