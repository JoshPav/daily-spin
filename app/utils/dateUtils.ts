import {
  getDaysInMonth as dfnsGetDaysInMonth,
  format,
  getDate,
} from 'date-fns';

// Note: month is 1-indexed (1=January, 2=February, etc.)
export const getDaysInMonth = (year: number, month: number) =>
  dfnsGetDaysInMonth(new Date(year, month - 1));

const getOrdinalSuffix = (day: number): string => {
  if (day > 3 && day < 21) return 'th';
  switch (day % 10) {
    case 1:
      return 'st';
    case 2:
      return 'nd';
    case 3:
      return 'rd';
    default:
      return 'th';
  }
};

export const formatDate = (date: Date): string => {
  const day = getDate(date);
  const ordinal = getOrdinalSuffix(day);
  return format(date, `MMMM d'${ordinal}' yyyy`);
};

/** Converts a Date or ISO string to YYYY-MM-DD format for Map keys */
export const toDateKey = (date: Date | string): string => {
  if (typeof date === 'string') {
    return date.split('T')[0] ?? date;
  }
  return format(date, 'yyyy-MM-dd');
};
