// Format date with ordinal suffix (e.g., 1st April 2025)
export function formatDateWithOrdinal(dateStr) {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  const day = date.getDate();
  const month = date.toLocaleString("en-US", { month: "long" });
  const year = date.getFullYear();
  const ordinal = (day % 10 === 1 && day !== 11) ? "st" :
                  (day % 10 === 2 && day !== 12) ? "nd" :
                  (day % 10 === 3 && day !== 13) ? "rd" : "th";
  return `${day}${ordinal} ${month} ${year}`;
}

// Get month and year from date (e.g., "April 2025")
export function getMonthYear(dateStr) {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  const month = date.toLocaleString("en-US", { month: "long" });
  const year = date.getFullYear();
  return `${month} ${year}`;
}