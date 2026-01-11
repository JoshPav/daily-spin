export const getDaysInMonth = (year: number, month: number) =>
  new Date(year, month, 0).getDate();

export const formatDate = (date: Date) =>
  date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
