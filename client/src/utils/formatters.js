const fallbackText = "Not Provided";
const notDetectedText = "Not detected";

const smallWords = new Set(["and", "or", "of", "the", "a", "an", "in", "on", "at", "to", "for"]);

export function cleanupField(value = "") {
  const cleanedValue = String(value)
    .replace(/\s+/g, " ")
    .trim();

  if (
    !cleanedValue ||
    cleanedValue.toLowerCase() === "not detected" ||
    cleanedValue.toLowerCase() === "not provided" ||
    cleanedValue.toLowerCase() === "unknown"
  ) {
    return "";
  }

  return cleanedValue;
}

export function titleCase(value = "") {
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

export function formatDate(value = "") {
  const cleanedValue = cleanupField(value);

  if (!cleanedValue) return fallbackText;

  const dateMatch = cleanedValue.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (!dateMatch) return cleanedValue;

  const [, year, month, day] = dateMatch;
  const date = new Date(`${year}-${month}-${day}T00:00:00Z`);

  if (
    Number.isNaN(date.getTime()) ||
    date.getUTCFullYear() !== Number(year) ||
    date.getUTCMonth() + 1 !== Number(month) ||
    date.getUTCDate() !== Number(day)
  ) {
    return fallbackText;
  }

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function safeFallback(value = "", fallback = fallbackText) {
  const cleanedValue = cleanupField(value);

  return cleanedValue || fallback;
}

export function formatDetected(value = "") {
  return safeFallback(value, notDetectedText);
}

export function isValidHtmlDate(value = "") {
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

export function normalizePassportDetails(passportDetails = {}) {
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

export function normalizeVisaDetails(visaDetails = {}) {
  return {
    destinationCountry: titleCase(visaDetails.destinationCountry),
    visaType: titleCase(visaDetails.visaType),
    duration: titleCase(visaDetails.duration),
    travelDate: cleanupField(visaDetails.travelDate),
    additionalNotes: titleCase(visaDetails.additionalNotes),
  };
}

export function normalizeApplicationData(applicationData = {}) {
  return {
    visaDetails: normalizeVisaDetails(applicationData.visaDetails),
    passportDetails: normalizePassportDetails(applicationData.passportDetails),
    submittedAt: applicationData.submittedAt || new Date().toISOString(),
  };
}
