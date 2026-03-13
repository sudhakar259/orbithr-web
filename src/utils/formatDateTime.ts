/**
 * Formats a date, time, or both — safely and timezone-aware.
 *
 * @param date - ISO date string (e.g. "2025-10-18T00:00:00.000000Z")
 * @param time - Time string (e.g. "21:36")
 * @param timeOnly - If true, format only the time (ignores date)
 * @param tz - Timezone (default: 'Asia/Kolkata')
 */
export const formatDateTime = (
  date?: string,
  time?: string,
  timeOnly = false,
  tz = (typeof Intl !== 'undefined' && Intl.DateTimeFormat().resolvedOptions().timeZone) || 'UTC'
): string => {
  // 🧩 handle missing inputs
  if (!date && !time) return '—';

  const datePart = date ? date.split('T')[0] : '1970-01-01';

  // 📅 if only date (no time)
  if (date && !time) {
    const d = new Date(date);
    if (isNaN(d.getTime())) return '—';
    return new Intl.DateTimeFormat('en-IN', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      timeZone: tz,
    }).format(d);
  }

  // ⏰ if only time (timeOnly = true)
  if (timeOnly) {
    const d = new Date(`1970-01-01T${time}:00`);
    if (isNaN(d.getTime())) return '—';
    return new Intl.DateTimeFormat('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone: tz,
    }).format(d);
  }

  // 🕒 full date + time
  const d = new Date(`${datePart}T${time}:00`);
  if (isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: tz,
  }).format(d);
};
