export const getDaysInMonth = (year: number, month: number) =>
  new Date(year, month, 0).getDate();

const getOrdinalSuffix = (day: number): string => {
  if (day > 3 && day < 21) return 'th';
  switch (day % 10) {
    case 1: return 'st';
    case 2: return 'nd';
    case 3: return 'rd';
    default: return 'th';
  }
};

export const formatDate = (date: Date): string => {
  const day = date.getDate();
  const month = date.toLocaleDateString('en-US', { month: 'long' });
  const year = date.getFullYear();
  const ordinal = getOrdinalSuffix(day);

  return `${month} ${day}${ordinal} ${year}`;
};
