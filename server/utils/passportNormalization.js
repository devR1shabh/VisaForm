const {
  isValidMrzCountryCode,
  mrzCountryMap,
  normalizeMrzIssuingCountry,
  normalizeMrzNationality,
} = require("../constants/mrzCountryMap");

function cleanupField(value = "") {
  return String(value).replace(/\s+/g, " ").trim();
}

function titleCase(value = "") {
  const cleanedValue = cleanupField(value).toLowerCase();

  if (!cleanedValue) return "";

  return cleanedValue
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function normalizeSexDisplay(value = "") {
  const cleanedValue = cleanupField(value).toUpperCase();

  if (cleanedValue === "M" || cleanedValue === "MALE") return "Male";
  if (cleanedValue === "F" || cleanedValue === "FEMALE") return "Female";
  if (cleanedValue === "X" || cleanedValue === "OTHER") return "Other";
  return "";
}

function normalizeCountryDisplay(value = "", field = "issuingCountry") {
  const cleanedValue = cleanupField(value);
  const looksLikeMrzCode = /^[A-Z]{3}$/.test(cleanedValue.toUpperCase());

  if (!cleanedValue) return "";

  const normalized = looksLikeMrzCode
    ? field === "nationality"
      ? normalizeMrzNationality(cleanedValue)
      : normalizeMrzIssuingCountry(cleanedValue)
    : cleanedValue;

  if (normalized !== cleanedValue) return normalized;
  // Reject unrecognized three-letter MRZ-like values instead of displaying
  // OCR garbage such as RAM, ABC, AAA, or the unspecified placeholder XXX.
  if (looksLikeMrzCode && !isValidMrzCountryCode(cleanedValue)) return "";
  if (
    cleanedValue.length > 3 &&
    (cleanedValue === cleanedValue.toUpperCase() ||
      cleanedValue === cleanedValue.toLowerCase())
  ) {
    return titleCase(cleanedValue);
  }
  return cleanedValue;
}

function normalizeNationalityDisplay(value = "") {
  return normalizeCountryDisplay(value, "nationality");
}

function normalizeIssuingCountryDisplay(value = "") {
  return normalizeCountryDisplay(value, "issuingCountry");
}

function normalizePassportDetails(passportDetails = {}) {
  const fullName = cleanupField(
    passportDetails.fullName || passportDetails.name || ""
  );
  const sex = normalizeSexDisplay(passportDetails.sex);

  return {
    fullName,
    sex,
    nationality: normalizeNationalityDisplay(passportDetails.nationality),
    issuingCountry: normalizeIssuingCountryDisplay(passportDetails.issuingCountry),
    passportNumber: cleanupField(passportDetails.passportNumber).toUpperCase(),
    dateOfBirth: cleanupField(passportDetails.dateOfBirth),
    expiryDate: cleanupField(passportDetails.expiryDate),
    name: fullName,
  };
}

module.exports = {
  countryNames: Object.fromEntries(
    Object.entries(mrzCountryMap).map(([code, entry]) => [
      code,
      entry.issuingCountry,
    ])
  ),
  isValidMrzCountryCode,
  mrzCountryMap,
  normalizeCountryDisplay,
  normalizeIssuingCountryDisplay,
  normalizeNationalityDisplay,
  normalizePassportDetails,
  normalizeSexDisplay,
};
