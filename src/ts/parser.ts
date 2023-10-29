import * as fs from "fs";
import * as path from "path";
import { parse as papaparse } from "papaparse";
import { ResultData, ContactData, FileHeaders } from "./types";
import { db } from "./firestore";
import { CollectionReference } from "@google-cloud/firestore";
import { convertPhoneNumber } from "./helpers";
import { mapHeaders, validateMappedHeaders } from "./headersMapper";

// This functions gets the data and parameters,
// then saves the data and returns the result.
async function saveParsedFileData(
  data: Array<Array<string>>,
  updateBasedOnPhone: boolean,
  headers: FileHeaders,
  importTags?: string[]
): Promise<ResultData> {
  let contactsData: Array<ContactData> = [];
  let result: ResultData = {
    contactsData: contactsData,
    errors: [],
    imported: 0,
    skipped: 0,
    updated: 0,
  };
  const batch: FirebaseFirestore.WriteBatch = db.batch();
  const contactsDocRef: CollectionReference<FirebaseFirestore.DocumentData> =
    db.collection("contacts");

  const mappedHeadersResult = validateMappedHeaders(headers);
  if (mappedHeadersResult.length > 0) {
    result.errors.push(...mappedHeadersResult);
  }

  console.log("update contacts based on phone: ", updateBasedOnPhone);

  for (let index = 1; index <= data.length; index++) {
    const contactData: string[] = data[index];

    if (contactData.length !== headers.length) {
      result.skipped++;
      result.errors.push(`contact ${index} is invalid`);
      break;
    }

    const userPhoneNumber: number | null = convertPhoneNumber(
      contactData[headers.phone_number!]
    );

    if (userPhoneNumber !== null) {
      let contactModel: ContactData = {
        email: contactData[headers.email!],
        first_name: contactData[headers.first_name!],
        last_name: contactData[headers.last_name!],
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
          email: contactData[headers.email!],
          first_name: contactData[headers.first_name!],
          last_name: contactData[headers.last_name!],
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
async function parse(
  csvFilePath: string,
  updateBasedOnPhone: boolean,
  tags?: string[]
): Promise<ResultData> {
  const csvData = fs.readFileSync(path.resolve(__dirname, csvFilePath), {
    encoding: "utf-8",
  });

  const parserResult = papaparse<Array<string>>(csvData, { delimiter: "," });

  const headers: FileHeaders = mapHeaders(parserResult.data[0]);

  const result = await saveParsedFileData(
    parserResult.data,
    updateBasedOnPhone,
    headers,
    tags
  );

  return result;
}

function parseCsvFileUsingPath(csvFilePath: string): string[][] | null {
  const csvData = fs.readFileSync(path.resolve(__dirname, csvFilePath), {
    encoding: "utf-8",
  });

  const parserResult = papaparse<Array<string>>(csvData, { delimiter: "," });

  if (parserResult.errors.length === 0) return parserResult.data;
  else return null;
}

async function parseUsingCustomHeader(
  csvFileData: string[][],
  updateBasedOnPhone: boolean,
  headers: FileHeaders,
  tags?: string[]
): Promise<ResultData> {
  const mappedHeadersResult: string[] = validateMappedHeaders(headers);

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

export {
  parse,
  parseUsingCustomHeader,
  parseCsvFileUsingPath,
  mapHeaders,
  validateMappedHeaders,
};
