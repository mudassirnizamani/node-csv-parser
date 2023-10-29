export function convertPhoneNumber(phoneNumber: string | null): number | null {
  if (
    phoneNumber === null ||
    phoneNumber === undefined ||
    phoneNumber.length < 5
  )
    return null;

  return Number(phoneNumber);
}
