// Calculate actual number of days between two dates (inclusive)
export function calculateActualDays(fromDate, tillDate) {
  if (!fromDate || !tillDate) return 0;
  const from = new Date(fromDate);
  const till = new Date(tillDate);
  if (till < from) return 0;
  return Math.floor((till - from) / (1000 * 60 * 60 * 24)) + 1;
}

// Calculate prorated salary based on marked working days (present/total),
// derived from the union of the teacher's assigned schools' weekly class
// days rather than the calendar. E.g. 16 working days, 8 marked present ->
// half salary.
export function calculateProratedSalaryFromWorkingDays(basicSalary, presentDays, totalWorkingDays) {
  if (!totalWorkingDays) return 0;
  return (basicSalary * presentDays) / totalWorkingDays || 0;
}

// Calculate totals
export function calculateTotals(proratedSalary, earnings, deductions) {
  const additionalEarnings = earnings.reduce((sum, e) => sum + (e.amount || 0), 0);
  const totalEarning = proratedSalary + additionalEarnings;
  const totalDeduction = deductions.reduce((sum, d) => sum + (d.amount || 0), 0);
  const netPay = totalEarning - totalDeduction;
  
  return { totalEarning, totalDeduction, netPay };
}