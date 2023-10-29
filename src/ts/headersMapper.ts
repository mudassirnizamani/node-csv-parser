
import { FileHeaders, ManualMapHeadersData } from "./types";

// This function map the first row of file and then returns the headers automatically
// the position of headers.
function mapHeaders(row: Array<string>): FileHeaders {
  let result: FileHeaders = {
    first_name: null,
    last_name: null,
    phone_number: null,
    email: null,
    length: row.length,
  };

  for (let index = 0; index < row.length; index++) {
    const element = row[index].replace(" ", "").toLowerCase();

    if (element.includes("email")) result.email = index;
    else if (element.includes("firstname")) result.first_name = index;
    else if (element.includes("lastname")) result.last_name = index;
    else if (
      element.includes("phone") ||
      element.includes("mobile") ||
      element.includes("tel") ||
      element.includes("cell")
    )
      result.phone_number = index;
  }

  return result;
}

// This function will map the headers manually from the csv file based on given keywords
function mapHeadersManually(
  row: string[],
  keywords: ManualMapHeadersData
): FileHeaders {
  let result: FileHeaders = {
    first_name: null,
    last_name: null,
    phone_number: null,
    email: null,
    length: row.length,
  };

  for (let index = 0; index < row.length; index++) {
    const element = row[index].replace(" ", "").toLowerCase();

    if (element.includes(keywords.email.replace(" ", "").toLowerCase()))
      result.email = index;
    else if (
      element.includes(keywords.first_name.replace(" ", "").toLowerCase())
    )
      result.first_name = index;
    else if (
      element.includes(keywords.last_name.replace(" ", "").toLowerCase())
    )
      result.last_name = index;
    else if (
      element.includes(keywords.phone_number.replace(" ", "").toLowerCase())
    )
      result.phone_number = index;
  }

  return result;
}

function validateManuallyMappedHeaders(
  parsedHeaders: FileHeaders,
  keywords: ManualMapHeadersData
): string[] {
  let errors: string[] = [];

  if (parsedHeaders.email === null)
    errors.push(`${keywords.email} header doesn't exist in the file`);
  else if (parsedHeaders.first_name === null)
    errors.push(`${keywords.first_name} header doesn't exist in the file`);
  else if (parsedHeaders.last_name === null)
    errors.push(`${keywords.last_name} header doesn't exist in the file`);
  else if (parsedHeaders.phone_number === null)
    errors.push(`${keywords.phone_number} header doesn't exist in the file`);

  return errors;
}

function validateMappedHeaders(parsedHeaders: FileHeaders): string[] {
  let errors: string[] = [];

  if (parsedHeaders.email === null)
    errors.push("email header doesn't exist in the file");
  else if (parsedHeaders.first_name === null)
    errors.push("first name header doesn't exist in the file");
  else if (parsedHeaders.last_name === null)
    errors.push("last name header doesn't exist in the file");
  else if (parsedHeaders.phone_number === null)
    errors.push("phone number header doesn't exist in the file");

  return errors;
}

export {
  validateMappedHeaders,
  mapHeaders,
  mapHeadersManually,
  validateManuallyMappedHeaders,
};
