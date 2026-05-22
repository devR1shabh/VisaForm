import { countries } from "../data/countries";
import { nationalities } from "../data/nationalities";
import { cleanupField, titleCase } from "./formatters";

const notSureValues = new Set(["not sure", "unsure", "unknown"]);

function findCanonicalOption(value, options) {
  const cleanedValue = cleanupField(value).toLowerCase();

  if (!cleanedValue) {
    return "";
  }

  return options.find((option) => option.toLowerCase() === cleanedValue) || "";
}

export function validateCountry(value = "") {
  const match = findCanonicalOption(value, countries);

  if (!match) {
    return {
      isValid: false,
      message: "Please select a valid country.",
    };
  }

  return {
    isValid: true,
    value: match,
  };
}

export function validateNationality(value = "") {
  const match = findCanonicalOption(value, nationalities);

  if (!match) {
    return {
      isValid: false,
      message: "Please select a valid nationality.",
    };
  }

  return {
    isValid: true,
    value: match,
  };
}

export function validateName(value = "") {
  const cleanedValue = cleanupField(value);

  if (!/^[a-zA-Z][a-zA-Z\s.'-]{1,}$/.test(cleanedValue)) {
    return {
      isValid: false,
      message: "Enter the full name as shown on the passport.",
    };
  }

  return {
    isValid: true,
    value: titleCase(cleanedValue),
  };
}

export function validatePassport(value = "") {
  const cleanedValue = cleanupField(value).toUpperCase();

  if (!/^[A-Z0-9]{5,15}$/.test(cleanedValue)) {
    return {
      isValid: false,
      message: "Enter a valid passport number.",
    };
  }

  return {
    isValid: true,
    value: cleanedValue,
  };
}

export function validateDuration(value = "") {
  const cleanedValue = cleanupField(value);
  const durationMatch = cleanedValue.match(/-?\d+/);
  const days = durationMatch ? Number(durationMatch[0]) : 0;

  if (!Number.isInteger(days) || days <= 0 || days > 3650) {
    return {
      isValid: false,
      message: "Enter a realistic stay duration in days.",
    };
  }

  return {
    isValid: true,
    value: `${days} days`,
  };
}

export function validateTravelDate(value = "") {
  const cleanedValue = cleanupField(value);

  if (notSureValues.has(cleanedValue.toLowerCase())) {
    return {
      isValid: true,
      value: "Not sure",
    };
  }

  const dateMatch = cleanedValue.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (!dateMatch) {
    return {
      isValid: false,
      message: 'Use YYYY-MM-DD format or type "Not sure".',
    };
  }

  const [, year, month, day] = dateMatch;
  const date = new Date(`${year}-${month}-${day}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (
    Number.isNaN(date.getTime()) ||
    date.getFullYear() !== Number(year) ||
    date.getMonth() + 1 !== Number(month) ||
    date.getDate() !== Number(day) ||
    date < today
  ) {
    return {
      isValid: false,
      message: "Enter a valid future travel date.",
    };
  }

  return {
    isValid: true,
    value: cleanedValue,
  };
}

export function validateDateOfBirth(value = "") {
  const cleanedValue = cleanupField(value);

  const dateMatch = cleanedValue.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (!dateMatch) {
    return {
      isValid: false,
      message: "Use YYYY-MM-DD format.",
    };
  }

  const [, year, month, day] = dateMatch;
  const date = new Date(`${year}-${month}-${day}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (
    Number.isNaN(date.getTime()) ||
    date.getFullYear() !== Number(year) ||
    date.getMonth() + 1 !== Number(month) ||
    date.getDate() !== Number(day)
  ) {
    return {
      isValid: false,
      message: "Enter a valid date of birth.",
    };
  }

  if (date >= today) {
    return {
      isValid: false,
      message: "Date of birth must be in the past.",
    };
  }

  return {
    isValid: true,
    value: cleanedValue,
  };
}

export function validateSex(value = "") {
  const cleanedValue = cleanupField(value).toLowerCase();

  const allowedValues = ["male", "female", "other"];

  if (!allowedValues.includes(cleanedValue)) {
    return {
      isValid: false,
      message:
        'Please enter a valid sex: Male, Female, or Other.',
    };
  }

  return {
    isValid: true,
    value:
      cleanedValue.charAt(0).toUpperCase() +
      cleanedValue.slice(1),
  };
}
