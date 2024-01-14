export function formatDate(date: string) {
  try {
    return new Date(date).toISOString().split("T")[0];
  } catch (error) {
    return date;
  }
}
