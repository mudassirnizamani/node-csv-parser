function convertPhoneNumber(phoneNumber) {
  if (
    phoneNumber === null ||
    phoneNumber === undefined ||
    phoneNumber.length < 5
  )
    return null;

  return Number(phoneNumber);
}

module.exports = { convertPhoneNumber };
