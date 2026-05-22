const nationalityNames = {
  IND: "Indian",
  USA: "American",
  GBR: "British",
  CAN: "Canadian",
  AUS: "Australian",
  NZL: "New Zealander",
  IDN: "Indonesian",
  PHL: "Filipino",
  SGP: "Singaporean",
  MYS: "Malaysian",
  THA: "Thai",
  VNM: "Vietnamese",
  CHN: "Chinese",
  JPN: "Japanese",
  KOR: "South Korean",
  FRA: "French",
  DEU: "German",
  ESP: "Spanish",
  ITA: "Italian",
  NLD: "Dutch",
  IRL: "Irish",
  PRT: "Portuguese",
  BRA: "Brazilian",
  MEX: "Mexican",
  ZAF: "South African",
  ARE: "Emirati",
  SAU: "Saudi",
};

function emptyPassportData() {
  return {
    passportNumber: "",
    fullName: "",
    nationality: "",
    gender: "",
    dateOfBirth: "",
    expiryDate: "",
    name: "",
    sex: "",
  };
}

function cleanOcrLine(line = "") {
  return String(line)
    .toUpperCase()
    .replace(/[«‹〈＜]/g, "<")
    .replace(/[|]/g, "I")
    .replace(/[^\w< /:.,-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeMrzCandidate(line = "") {
  return cleanOcrLine(line)
    .replace(/\s/g, "")
    .replace(/[^A-Z0-9<]/g, "");
}

function getLines(text = "") {
  return String(text)
    .split(/\r?\n/)
    .map(cleanOcrLine)
    .filter(Boolean);
}

function hasMrzShape(line) {
  const fillerCount = (line.match(/</g) || []).length;

  return (
    line.length >= 25 &&
    (fillerCount >= 2 || line.startsWith("P<") || /^[A-Z0-9<]{35,}$/.test(line))
  );
}

function findMrzLines(text = "") {
  const normalized = getLines(text).map(normalizeMrzCandidate).filter(hasMrzShape);
  const pairs = [];

  for (let index = 0; index < normalized.length - 1; index += 1) {
    const first = normalized[index];
    const second = normalized[index + 1];

    if (first.startsWith("P<") && second.length >= 35) {
      pairs.push([first.padEnd(44, "<").slice(0, 44), second.padEnd(44, "<").slice(0, 44)]);
    }
  }

  return pairs[0] || [];
}

function normalizeMrzText(value = "") {
  return String(value)
    .replace(/0/g, "O")
    .replace(/1/g, "I")
    .replace(/2/g, "Z")
    .replace(/5/g, "S")
    .replace(/8/g, "B");
}

function normalizeMrzDigits(value = "") {
  return String(value)
    .replace(/[OQ]/g, "0")
    .replace(/[IL]/g, "1")
    .replace(/S/g, "5")
    .replace(/B/g, "8")
    .replace(/Z/g, "2");
}

function formatMrzDate(value = "", type = "past") {
  const digits = normalizeMrzDigits(value);

  if (!/^\d{6}$/.test(digits)) return "";

  const yy = Number(digits.slice(0, 2));
  const month = Number(digits.slice(2, 4));
  const day = Number(digits.slice(4, 6));
  const currentYear = new Date().getFullYear();
  const currentYY = currentYear % 100;
  const century = type === "future" || yy <= currentYY + 10 ? 2000 : 1900;
  const year = century + yy;
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31 ||
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() + 1 !== month ||
    date.getUTCDate() !== day
  ) {
    return "";
  }

  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function normalizeGender(value = "") {
  const gender = normalizeMrzText(value).charAt(0);

  if (gender === "M") return "Male";
  if (gender === "F") return "Female";
  if (gender === "X") return "Other";
  return "";
}

function parseName(firstLine = "") {
  const nameSection = firstLine.slice(5).replace(/<+$/g, "");
  const [surname = "", given = ""] = nameSection.split("<<");
  const parts = [surname, given]
    .join(" ")
    .replace(/</g, " ")
    .split(/\s+/)
    .map(normalizeMrzText)
    .filter(Boolean);

  return parts.join(" ");
}

function parseMrz(text = "") {
  const [firstLine, secondLine] = findMrzLines(text);

  if (!firstLine || !secondLine) {
    return {
      success: false,
      mrzLines: [],
      passportData: emptyPassportData(),
    };
  }

  const passportNumber = secondLine.slice(0, 9).replace(/</g, "");
  const nationalityCode = normalizeMrzText(secondLine.slice(10, 13)).replace(/</g, "");
  const gender = normalizeGender(secondLine.slice(20, 21));
  const fullName = parseName(firstLine);

  const passportData = {
    passportNumber,
    fullName,
    nationality: nationalityNames[nationalityCode] || nationalityCode,
    gender,
    dateOfBirth: formatMrzDate(secondLine.slice(13, 19), "past"),
    expiryDate: formatMrzDate(secondLine.slice(21, 27), "future"),
  };

  passportData.name = passportData.fullName;
  passportData.sex = passportData.gender;

  return {
    success: Boolean(
      passportData.passportNumber &&
        passportData.fullName &&
        passportData.dateOfBirth &&
        passportData.expiryDate
    ),
    mrzLines: [firstLine, secondLine],
    passportData,
  };
}

function findLabelValue(lines, labelPattern) {
  const index = lines.findIndex((line) => labelPattern.test(line));

  if (index === -1) return "";

  const sameLine = lines[index].replace(labelPattern, "").replace(/^[:/ .-]+/, "").trim();
  if (sameLine) return sameLine;

  return lines[index + 1] || "";
}

function parseOcrFallback(text = "") {
  const lines = getLines(text);
  const passportData = emptyPassportData();
  const passportLabelValue = findLabelValue(lines, /PASSPORT\s*(NO\.?|NUMBER)|DOCUMENT\s*(NO\.?|NUMBER)/);
  const passportMatch =
    passportLabelValue.match(/\b[A-Z0-9]{7,10}\b/) ||
    text.toUpperCase().match(/\b[A-Z][A-Z0-9]{6,9}\b/);

  passportData.passportNumber = passportMatch?.[0] || "";
  passportData.fullName = findLabelValue(lines, /SURNAME\s+GIVEN\s+NAMES?|GIVEN\s+NAMES?|FULL\s+NAME|NAME/).replace(/[^A-Z ]/g, " ");
  passportData.nationality = findLabelValue(lines, /NATIONALITY/).replace(/[^A-Z ]/g, " ");
  passportData.gender = normalizeGender(findLabelValue(lines, /^SEX\b|GENDER/));
  passportData.dateOfBirth = parseLooseDate(findLabelValue(lines, /DATE\s+OF\s+BIRTH|DOB|BIRTH\s+DATE/), "past");
  passportData.expiryDate = parseLooseDate(findLabelValue(lines, /DATE\s+OF\s+EXPIRY|EXPIRY\s+DATE|EXPIRES/), "future");
  passportData.name = passportData.fullName;
  passportData.sex = passportData.gender;

  const populated = Object.values({
    passportNumber: passportData.passportNumber,
    fullName: passportData.fullName,
    nationality: passportData.nationality,
    gender: passportData.gender,
    dateOfBirth: passportData.dateOfBirth,
    expiryDate: passportData.expiryDate,
  }).filter(Boolean).length;

  return {
    success: populated >= 3,
    passportData,
  };
}

function parseLooseDate(value = "", type = "past") {
  const match = String(value).match(/\b(\d{1,4})[ ./-](\d{1,2})[ ./-](\d{1,4})\b/);

  if (!match) return "";

  let first = match[1];
  const month = match[2];
  let last = match[3];

  if (first.length === 4) {
    return validateDate(first, month, last);
  }

  if (last.length === 2) {
    const yy = Number(last);
    const currentYY = new Date().getFullYear() % 100;
    last = `${type === "future" || yy <= currentYY + 10 ? "20" : "19"}${last}`;
  }

  return validateDate(last, month, first);
}

function validateDate(year, month, day) {
  const formatted = `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  const date = new Date(`${formatted}T00:00:00Z`);

  if (
    Number.isNaN(date.getTime()) ||
    date.getUTCFullYear() !== Number(year) ||
    date.getUTCMonth() + 1 !== Number(month) ||
    date.getUTCDate() !== Number(day)
  ) {
    return "";
  }

  return formatted;
}

module.exports = {
  emptyPassportData,
  parseMrz,
  parseOcrFallback,
};
