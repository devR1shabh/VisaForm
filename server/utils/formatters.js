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

  const date = new Date(`${cleanedValue}T00:00:00Z`);

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

function safeFallback(value = "", fallback = fallbackText) {
  const cleanedValue = cleanupField(value);

  return cleanedValue || fallback;
}

function normalizePassportDetails(passportDetails = {}) {
  const rawSex = cleanupField(passportDetails.sex || passportDetails.gender);
  const gender = titleCase(
    rawSex === "F"
      ? "Female"
      : rawSex === "M"
        ? "Male"
        : rawSex === "X"
          ? "Other"
          : rawSex
  );

  return {
    name: titleCase(passportDetails.name || passportDetails.fullName || ""),
    passportNumber: cleanupField(passportDetails.passportNumber).toUpperCase(),
    nationality: titleCase(passportDetails.nationality),
    issuingCountry: titleCase(passportDetails.issuingCountry),
    sex: ["Male", "Female", "Other"].includes(gender)
      ? gender
      : "",
    dateOfBirth: cleanupField(passportDetails.dateOfBirth),
    expiryDate: cleanupField(passportDetails.expiryDate),
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
