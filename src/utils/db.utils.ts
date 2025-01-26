export function formatDbField(value: any): any {
  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === 'string') {
    const dateRegex =
      /^(\d{4}-\d{2}-\d{2}|\w{3} \w{3} \d{2} \d{4})( \d{2}:\d{2}:\d{2}(.\d{3})? GMT[+-]\d{4})?(\s*\([^)]+\))?$/;

    if (dateRegex.test(value)) {
      const cleanedValue = value.replace(/\s*\([^)]+\)$/, '').trim();

      try {
        const date = new Date(cleanedValue);
        if (!isNaN(date.getTime())) {
          return date.toISOString();
        }
      } catch (error) {
        console.warn(`Failed to parse date: ${value}`);
        return value;
      }
    }
  }

  // If it's not a recognized date format, return the original value
  return value;
}
