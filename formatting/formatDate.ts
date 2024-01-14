export function formatDate(incoming: string) {
  if (!incoming.match(/\d/)) {
    // Some dates might not contain any numbers, e.g. "Reservert"
    return incoming;
  }
  const separator = /\.|\//.exec(incoming)?.[0] || "";

  switch (separator) {
    case ".":
      return incoming.split(".").reverse().join("-");
    case "/":
      return incoming.replaceAll("/", "-");
    default:
      return incoming;
  }
}
