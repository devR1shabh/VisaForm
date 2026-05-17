import { getNames } from "country-list";
import { cleanupField, titleCase } from "./formatters";

const countryNames = new Set(getNames().map((name) => name.toLowerCase()));
const notSureValues = new Set(["not sure", "unsure", "unknown"]);

export function validateCountry(value = "") {
  const cleanedValue = cleanupField(value);

  if (!cleanedValue || !countryNames.has(cleanedValue.toLowerCase())) {
    return {
      isValid: false,
      message: "Enter a valid country name.",
    };
  }

  return {
    isValid: true,
    value: titleCase(cleanedValue),
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
      value: "",
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
