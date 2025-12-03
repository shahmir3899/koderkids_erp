// Format currency (PKR 20,000.00)
export function formatCurrency(amount) {
  if (isNaN(amount) || amount === null || amount === undefined) return "PKR 0.00";
  return `PKR ${parseFloat(amount).toFixed(2).replace(/\d(?=(\d{3})+\.)/g, "$&,")}`;
}