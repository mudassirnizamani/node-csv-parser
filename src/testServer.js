const fs = require("fs");
const path = require("path");
const express = require("express");
const papaparse = require("papaparse");
const { cert, initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

initializeApp({
  credential: cert(require("../key.json")),
});

const db = getFirestore();

function convertPhoneNumber(phoneNumber) {
  if (
    phoneNumber === null ||
    phoneNumber === undefined ||
    phoneNumber.length < 5
  )
    return null;

  return Number(phoneNumber);
}

function validateMappedHeaders(parsedHeaders) {
  let errors = [];

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

// This function map the first row of file and then returns the headers automatically
// the position of headers.
function mapHeaders(row) {
  let result = {
    first_name: null,
    last_name: null,
    phone_number: null,
    email: null,
    length: row.length,
  };

  for (let index = 0; index < row.length; index++) {
    const element = row[index].replace(" ", "").toLowerCase();

    if (element.includes("email")) result.email = index;
    else if (element.includes("firstname") || element.includes("firs tname"))
      result.first_name = index;
    else if (element.includes("lastname") || element.includes("last name"))
      result.last_name = index;
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

function parseCsvFile(csvFileUrl) {
  const csvData = fs.readFileSync(path.resolve(__dirname, csvFileUrl), {
    encoding: "utf-8",
  });
  const parserResult = papaparse.parse(csvData, {
    download: false,
    delimiter: ",",
  });

  if (parserResult.errors.length === 0) return parserResult.data;
  else return null;
}

app.post("/importContacts", async function (req, res) {
  if (req.method !== "POST") {
    console.error("Method not allowed:", req.method);
    res.status(405).send("Method Not Allowed");
    return;
  }

  const csvFileUrl =
    req.body?.fileUrl !== undefined ? String(req.body.fileUrl) : null;

  if (csvFileUrl === null) {
    return res.status(400).send("Csv file url is required");
  } else if (csvFileUrl.includes(".csv") !== true) {
    return res.status(400).send("Invalid file type");
  }

  try {
    const parsedData = parseCsvFile("./patients.csv");

    if (parsedData === null) {
      return res
        .status(500)
        .json({ message: "Error occurred while parsing the file" });
    }

    const mappedHeaders = mapHeaders(parsedData[0]);
    const mappedHeadersResult = validateMappedHeaders(mappedHeaders);

    if (mappedHeadersResult.length > 0) {
      return res.status(400).json({
        message: "can't map required headers",
        errors: mappedHeadersResult,
      });
    }

    const result = await saveParsedFileData(parsedData, true, mappedHeaders);
    return res.status(200).json(result);
  } catch (e) {
    console.log(e)
    return res
      .status(500)
      .json({ message: "Something went wrong", error: JSON.stringify(e) });
  }
});

app.listen(port, () =>
  console.log(`Server running at http://localhost:${port}`)
);
