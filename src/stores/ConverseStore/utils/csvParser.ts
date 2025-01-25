// CSV Parser utility
export function parseCSV(text: string): any[] {
    const lines = text.split('\n');
    const headers = lines[0].split(',').map(header => header.trim());
    const result = [];

    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;

      const obj: Record<string, any> = {};
      const currentLine = lines[i].split(',');

      for (let j = 0; j < headers.length; j++) {
        let value = currentLine[j]?.trim() || '' as string | number | boolean | any;

        // Try to parse numbers and booleans
        if (!isNaN(Number(value)) && value !== '') {
          value = Number(value);
        } else if (value.toLowerCase() === 'true') {
          value = true;
        } else if (value.toLowerCase() === 'false') {
          value = false;
        }

        obj[headers[j]] = value;
      }

      result.push(obj);
    }

    return result;
  }
