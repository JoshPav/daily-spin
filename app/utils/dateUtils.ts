export const getDaysInMonth = (year: number, month: number) =>
  new Date(year, month, 0).getDate();
