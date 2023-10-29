const fs = require("fs");
const path = require("path");
const papaparse = require("papaparse");
const { db } = require("./firestore");
const { convertPhoneNumber } = require("./helpers");
const { mapHeaders, validateMappedHeaders } = require("./headersMapper");

// This functions gets the data and parameters,
// then saves the data and returns the result.
async function saveParsedFileData(
  data,
  updateBasedOnPhone,
  headers,
  importTags
) {
  let contactsData = [];
  let result = {
    contactsData: contactsData,
    errors: [],
    imported: 0,
    skipped: 0,
    updated: 0,
  };
  const batch = db.batch();
  const contactsDocRef = db.collection("contacts");

  const mappedHeadersResult = validateMappedHeaders(headers);
  if (mappedHeadersResult.length > 0) {
    result.errors.push(...mappedHeadersResult);
  }

  console.log("update contacts based on phone: ", updateBasedOnPhone);

  for (let index = 1; index <= data.length; index++) {
    const contactData = data[index];

    if (contactData.length !== headers.length) {
      result.skipped++;
      result.errors.push(`contact ${index} is invalid`);
      break;
    }

    const userPhoneNumber = convertPhoneNumber(
      contactData[headers.phone_number]
    );

    if (userPhoneNumber !== null) {
      let contactModel = {
        email: contactData[headers.email],
        first_name: contactData[headers.first_name],
        last_name: contactData[headers.last_name],
        phone_number: userPhoneNumber,
      };

      if (importTags !== undefined && importTags.length > 0) {
        contactModel.tags = importTags;
      }

      result.contactsData.push(contactModel);

      try {
        if (updateBasedOnPhone === true) {
          let snapshot = await contactsDocRef
            .where("phone_number", "==", contactModel?.phone_number)
            .get();

          if (snapshot.empty === false) {
            const docRef = contactsDocRef.doc(snapshot.docs[0].id);
            batch.update(docRef, contactModel);
            result.imported++;
            result.updated++;
          } else {
            batch.set(contactsDocRef.doc(), contactModel);
            result.imported++;
          }
        } else {
          batch.set(contactsDocRef.doc(), contactModel);
          result.imported++;
        }
      } catch (e) {
        result.skipped++;
        result.errors.push(e);
        continue;
      }
    } else {
      result.skipped++;
      result.errors.push(
        `Skipped contact due to missing phone number: ${JSON.stringify({
          email: contactData[headers.email],
          first_name: contactData[headers.first_name],
          last_name: contactData[headers.last_name],
          phone_number: userPhoneNumber,
        })}`
      );

      continue;
    }
  }

  await batch.commit();
  return result;
}

// This function will automatically map the headers of the csv file.
// Only use this func if you are sure about the headers of the file
async function parse(csvFilePath, updateBasedOnPhone, tags) {
  const csvData = fs.readFileSync(path.resolve(__dirname, csvFilePath), {
    encoding: "utf-8",
  });

  const parserResult = papaparse.parse(csvData, { delimiter: "," });

  const headers = mapHeaders(parserResult.data[0]);

  const result = await saveParsedFileData(
    parserResult.data,
    updateBasedOnPhone,
    headers,
    tags
  );

  return result;
}

function parseCsvFileUsingPath(csvFilePath) {
  const csvData = fs.readFileSync(path.resolve(__dirname, csvFilePath), {
    encoding: "utf-8",
  });

  const parserResult = papaparse.parse(csvData, { delimiter: "," });

  if (parserResult.errors.length === 0) return parserResult.data;
  else return null;
}

async function parseUsingCustomHeader(
  csvFileData,
  updateBasedOnPhone,
  headers,
  tags
) {
  const mappedHeadersResult = validateMappedHeaders(headers);

  if (mappedHeadersResult.length > 0) {
    throw new Error("Mapped headers are invalid");
  }

  const result = await saveParsedFileData(
    csvFileData,
    updateBasedOnPhone,
    headers,
    tags
  );

  return result;
}

module.exports = {
  parse,
  parseUsingCustomHeader,
  parseCsvFileUsingPath,
  mapHeaders,
  validateMappedHeaders,
};
