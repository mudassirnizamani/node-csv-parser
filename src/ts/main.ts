import { parseCsvFileUsingPath } from "./parser";

// This function expects 3 parameters.
// 1: Path of CSV file.
// 2: Weather the contact should be updated based on phone numbers if any already exists.
// 3: tags, for eg: parseFile("../patients.csv", true, ["promo", "promo 2"])
parseCsvFileUsingPath("../../patients.csv");
