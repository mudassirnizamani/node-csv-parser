import * as fs from "fs";
import * as path from "path";
import { parse } from "papaparse";
import { ResultData, ContactData, FileHeaders } from "./types";
import { db } from "./firestore";
import { CollectionReference } from "@google-cloud/firestore";

function convertPhoneNumber(phoneNumber: string | null): number | null {
  if (
    phoneNumber === null ||
    phoneNumber === undefined ||
    phoneNumber.length < 5
  )
    return null;

  return Number(phoneNumber);
}

// This function get the first row of file and then returns
// the position of headers.
function parseHeaders(row: Array<string>): FileHeaders {
  let result: FileHeaders = {
    first_name: null,
    last_name: null,
    phone_number: null,
    email: null,
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

// This functions gets the data and parameters,
// then saves the data and returns the result.
async function saveParsedFileData(
  data: Array<Array<string>>,
  updateBasedOnPhone: boolean,
  importTags?: string[]
): Promise<ResultData> {
  const headers: FileHeaders = parseHeaders(data[0]);
  let contactsData: Array<ContactData> = [];
  const batch: FirebaseFirestore.WriteBatch = db.batch();
  const contactsDocRef: CollectionReference<FirebaseFirestore.DocumentData> =
    db.collection("contacts");

  let result: ResultData = {
    contactsData: contactsData,
    errors: [],
    imported: 0,
    skipped: 0,
    updated: 0,
  };

  for (let index = 1; index <= 5; index++) {
    const contactData: string[] = data[index];

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

async function parseFile(
  csvFilePath: string,
  updateBasedOnPhone: boolean,
  tags?: string[]
) {
  const csvData = fs.readFileSync(path.resolve(__dirname, csvFilePath), {
    encoding: "utf-8",
  });

  const parserResult = parse<Array<string>>(csvData, { delimiter: "," });
  const result = await saveParsedFileData(
    parserResult.data,
    updateBasedOnPhone,
    tags
  );

  console.log(result);
}

export { parseFile };
