/**
 * Formats a Date or raw date string (like YYYY-MM-DD or ISO string) to standard dd/mm/yyyy format.
 */
export function formatDateToDDMMYYYY(dateString: string | null | undefined): string {
  if (!dateString) return '';
  
  // If we have a full ISO string (e.g., 2026-03-15T08:00), strip time first
  const dateOnly = dateString.includes('T') ? dateString.split('T')[0] : dateString;
  
  // Handle YYYY-MM-DD format directly to avoid timezone shift issues
  const parts = dateOnly.split('-');
  if (parts.length === 3) {
    const year = parts[0];
    const month = parts[1].padStart(2, '0');
    const day = parts[2].padStart(2, '0');
    return `${day}/${month}/${year}`;
  }
  
  // Alternative fallback format DD/MM/YYYY or already formatted
  if (dateString.includes('/')) {
    return dateString;
  }

  // General fallback parsing with Date
  try {
    const parsed = new Date(dateString);
    if (!isNaN(parsed.getTime())) {
      const day = String(parsed.getDate()).padStart(2, '0');
      const month = String(parsed.getMonth() + 1).padStart(2, '0');
      const year = parsed.getFullYear();
      return `${day}/${month}/${year}`;
    }
  } catch {}
  
  return dateString;
}
