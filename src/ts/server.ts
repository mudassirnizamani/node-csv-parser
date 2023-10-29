import express, { Request, Response } from "express";
import multer from "multer";
import os from "os";
import {
  mapHeaders,
  parseUsingCustomHeader,
  parseCsvFileUsingPath,
  validateMappedHeaders,
} from "./parser";
import { FileHeaders, ManualMapHeadersData, ResultData } from "./types";
import {
  mapHeadersManually,
  validateManuallyMappedHeaders,
} from "./headersMapper";

const app = express();
const port = process.env.PORT || 3000;

const upload = multer({ dest: os.tmpdir() });

app.get("/", (req: Request, res: Response) => {
  res.send("Hello, TypeScript Express!");
});

// receive the file, first map the headers,
// if the headers are mapped, parse the file and send back the result
// if the headers are not mapped, send the headers to frontend.
// then receive the headers and use them, if the headers are certain, parse and return the result
// if not, repeat the process
app.post(
  "/parse",
  upload.single("file"),
  async function (req: Request, res: Response) {
    try {
      const file = req.file;

      if (file === undefined || file === null) {
        return res.status(400).json({ message: "Csv file is required" });
      }

      const tags: string[] | undefined =
        req.body.tags !== undefined ? JSON.parse(req.body.tags) : undefined;

      const manuallyMapHeaders: boolean =
        req.body.manuallyMapHeaders !== undefined
          ? Boolean(JSON.parse(req.body.manuallyMapHeaders))
          : false;
      const parsedData: string[][] | null = parseCsvFileUsingPath(file.path);
      console.log("Manually Map Headers: ", manuallyMapHeaders)
      if (parsedData === null || file === undefined) {
        return res
          .status(500)
          .json({ message: "Error occurred while parsing the file" });
      }

      if (manuallyMapHeaders === true) {
        if (
          !req.body.header_email ||
          !req.body.header_first_name ||
          !req.body.header_last_name ||
          !req.body.header_phone_number
        ) {
          return res.status(400).json({
            message: "required keywords for mapping header were not supplied",
            error:
              "required params: header_email, header_first_name, header_last_name, header_phone_number",
          });
        }

        const keywords: ManualMapHeadersData = {
          email: String(req.body.header_email),
          first_name: String(req.body.header_first_name),
          last_name: String(req.body.header_last_name),
          phone_number: String(req.body.header_phone_number),
        };

        const manuallyMappedHeaders: FileHeaders = mapHeadersManually(
          parsedData[0],
          keywords
        );

        const manuallyMappedHeadersResult: string[] =
          validateManuallyMappedHeaders(manuallyMappedHeaders, keywords);

        if (manuallyMappedHeadersResult.length > 0) {
          return res.status(400).json({
            message: "can't map required headers",
            errors: manuallyMappedHeadersResult,
          });
        }

        const result: ResultData = await parseUsingCustomHeader(
          parsedData,
          false,
          manuallyMappedHeaders,
          tags
        );

        return res.status(200).json(result);
      }

      const mappedHeaders: FileHeaders = mapHeaders(parsedData[0]);
      const mappedHeadersResult: string[] =
        validateMappedHeaders(mappedHeaders);

      if (mappedHeadersResult.length > 0) {
        return res.status(400).json({
          message: "can't map required headers",
          errors: mappedHeadersResult,
        });
      }

      const result: ResultData = await parseUsingCustomHeader(
        parsedData,
        false,
        mappedHeaders,
        tags
      );

      return res.status(200).json(result);
    } catch (e) {
      return res
        .status(500)
        .json({ message: "Something went wrong", error: String(e) });
    }
  }
);

app.listen(port, () =>
  console.log(`Server running at http://localhost:${port}`)
);
