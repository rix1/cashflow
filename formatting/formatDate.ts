function dateToYYYYMMDD(date: string) {
  return new Date(date).toISOString().split("T")[0];
}

export function formatDate(incoming: string) {
  if (!incoming.match(/\d/)) {
    // Some dates might not contain any numbers, e.g. "Reservert"
    return incoming;
  }
  const separator = /\.|\//.exec(incoming)?.[0] || "";

  switch (separator) {
    case ".": {
      const [day, month, year] = incoming.split(".");
      if (year.length === 2) {
        return dateToYYYYMMDD(`20${year}-${month}-${day}`);
      }
      return dateToYYYYMMDD(`${year}-${month}-${day}`);
    }
    case "/":
      return dateToYYYYMMDD(incoming.replaceAll("/", "-"));
    default:
      return dateToYYYYMMDD(incoming);
  }
}
