export function formatDateToYmd(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function parseYmd(value = "") {
  const cleanedValue = String(value).trim();

  if (!cleanedValue || cleanedValue.toLowerCase() === "not sure") {
    return null;
  }

  const dateMatch = cleanedValue.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (!dateMatch) {
    return null;
  }

  const [, year, month, day] = dateMatch;
  const date = new Date(Number(year), Number(month) - 1, Number(day));

  if (
    Number.isNaN(date.getTime()) ||
    date.getFullYear() !== Number(year) ||
    date.getMonth() + 1 !== Number(month) ||
    date.getDate() !== Number(day)
  ) {
    return null;
  }

  return date;
}
