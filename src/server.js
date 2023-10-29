const express = require("express");
const multer = require("multer");
const os = require("os");
const {
  mapHeaders,
  parseUsingCustomHeader,
  parseCsvFileUsingPath,
  validateMappedHeaders,
} = require("./parser");
const {
  mapHeadersManually,
  validateManuallyMappedHeaders,
} = require("./headersMapper");

const app = express();
const port = process.env.PORT || 3000;

const upload = multer({ dest: os.tmpdir() });

app.get("/", (req, res) => {
  res.send("Hello, TypeScript Express!");
});

app.post("/parse", upload.single("file"), async function (req, res) {
  try {
    const file = req.file;

    if (file === undefined || file === null) {
      return res.status(400).json({ message: "Csv file is required" });
    }

    const tags =
      req.body.tags !== undefined ? JSON.parse(req.body.tags) : undefined;

    const manuallyMapHeaders =
      req.body.manuallyMapHeaders !== undefined
        ? Boolean(JSON.parse(req.body.manuallyMapHeaders))
        : false;
    const parsedData = parseCsvFileUsingPath(file.path);
    console.log("Manually Map Headers: ", manuallyMapHeaders);
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

      const keywords = {
        email: req.body.header_email,
        first_name: req.body.header_first_name,
        last_name: req.body.header_last_name,
        phone_number: req.body.header_phone_number,
      };

      const manuallyMappedHeaders = mapHeadersManually(parsedData[0], keywords);

      const manuallyMappedHeadersResult = validateManuallyMappedHeaders(
        manuallyMappedHeaders,
        keywords
      );

      if (manuallyMappedHeadersResult.length > 0) {
        return res.status(400).json({
          message: "can't map required headers",
          errors: manuallyMappedHeadersResult,
        });
      }

      const result = await parseUsingCustomHeader(
        parsedData,
        false,
        manuallyMappedHeaders,
        tags
      );

      return res.status(200).json(result);
    }

    const mappedHeaders = mapHeaders(parsedData[0]);
    const mappedHeadersResult = validateMappedHeaders(mappedHeaders);

    if (mappedHeadersResult.length > 0) {
      return res.status(400).json({
        message: "can't map required headers",
        errors: mappedHeadersResult,
      });
    }

    const result = await parseUsingCustomHeader(
      parsedData,
      false,
      mappedHeaders,
      tags
    );

    return res.status(200).json(result);
  } catch (e) {
    return res.status(500).json({ message: "Something went wrong", error: e });
  }
});

app.listen(port, () =>
  console.log(`Server running at http://localhost:${port}`)
);
