/**
 * Format a number as Indian Rupees.
 * Usage: formatCurrency(45000) → "₹45,000"
 *        formatCurrency(45000.5) → "₹45,001"  (rounded)
 */
export function formatCurrency(amount: number | string | null | undefined): string {
  const num = Number(amount ?? 0)
  if (isNaN(num)) return '₹0'
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(num)
}
