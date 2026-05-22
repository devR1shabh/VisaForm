const {
  normalizePassportDetails: normalizeBackendPassportDetails,
} = require("./passportNormalization");

const fallbackText = "Not Provided";

const smallWords = new Set([
  "and",
  "or",
  "of",
  "the",
  "a",
  "an",
  "in",
  "on",
  "at",
  "to",
  "for",
]);

function cleanupField(value = "") {
  return String(value)
    .replace(/\s+/g, " ")
    .trim();
}

function titleCase(value = "") {
  const cleanedValue = cleanupField(value).toLowerCase();

  if (!cleanedValue) return "";

  return cleanedValue
    .split(" ")
    .map((word, index) => {
      if (!word) return word;
      if (index > 0 && smallWords.has(word)) return word;

      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");
}

function isValidHtmlDate(value = "") {
  const cleanedValue = cleanupField(value);
  const dateMatch = cleanedValue.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (!dateMatch) return false;

  const [, year, month, day] = dateMatch;
  const date = new Date(`${year}-${month}-${day}T00:00:00Z`);

  return (
    !Number.isNaN(date.getTime()) &&
    date.getUTCFullYear() === Number(year) &&
    date.getUTCMonth() + 1 === Number(month) &&
    date.getUTCDate() === Number(day)
  );
}

function formatDate(value = "") {
  const cleanedValue = cleanupField(value);

  if (!cleanedValue) return fallbackText;
  if (!isValidHtmlDate(cleanedValue)) return cleanedValue;

  return cleanedValue;
}

function safeFallback(value = "", fallback = fallbackText) {
  const cleanedValue = cleanupField(value);

  return cleanedValue || fallback;
}

function normalizePassportDetails(passportDetails = {}) {
  const normalizedPassportDetails =
    normalizeBackendPassportDetails(passportDetails);

  return {
    name: titleCase(normalizedPassportDetails.fullName),
    fullName: titleCase(normalizedPassportDetails.fullName),
    passportNumber: normalizedPassportDetails.passportNumber,
    nationality: normalizedPassportDetails.nationality,
    issuingCountry: normalizedPassportDetails.issuingCountry,
    sex: normalizedPassportDetails.sex,
    dateOfBirth: normalizedPassportDetails.dateOfBirth,
    expiryDate: normalizedPassportDetails.expiryDate,
  };
}

function normalizeVisaDetails(visaDetails = {}, legacyData = {}) {
  return {
    destinationCountry: titleCase(
      visaDetails.destinationCountry || legacyData.country || ""
    ),
    visaType: titleCase(visaDetails.visaType || legacyData.visaType || ""),
    duration: titleCase(
      visaDetails.duration || visaDetails.durationOfStay || legacyData.duration || ""
    ),
    travelDate: cleanupField(visaDetails.travelDate || legacyData.travelDate || ""),
    additionalNotes: titleCase(
      visaDetails.additionalNotes || legacyData.additionalNotes || ""
    ),
  };
}

function normalizeApplicationData(applicationData = {}) {
  const passportDetails = normalizePassportDetails(
    applicationData.passportDetails || {}
  );
  const visaDetails = normalizeVisaDetails(
    applicationData.visaDetails || applicationData,
    applicationData
  );

  return {
    passportDetails,
    visaDetails,
    submittedAt: applicationData.submittedAt || new Date().toISOString(),
  };
}

module.exports = {
  cleanupField,
  titleCase,
  formatDate,
  safeFallback,
  isValidHtmlDate,
  normalizePassportDetails,
  normalizeVisaDetails,
  normalizeApplicationData,
};
