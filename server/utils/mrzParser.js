const countryNames = {
  AFG: "Afghanistan",
  AGO: "Angola",
  ALB: "Albania",
  ARE: "United Arab Emirates",
  ARG: "Argentina",
  ARM: "Armenia",
  AUS: "Australia",
  AUT: "Austria",
  AZE: "Azerbaijan",
  BEL: "Belgium",
  BGD: "Bangladesh",
  BGR: "Bulgaria",
  BHR: "Bahrain",
  BRA: "Brazil",
  CAN: "Canada",
  CHE: "Switzerland",
  CHL: "Chile",
  CHN: "China",
  COL: "Colombia",
  CZE: "Czech Republic",
  DEU: "Germany",
  DNK: "Denmark",
  EGY: "Egypt",
  ESP: "Spain",
  FIN: "Finland",
  FRA: "France",
  GBR: "United Kingdom",
  GRC: "Greece",
  HKG: "Hong Kong",
  HUN: "Hungary",
  IDN: "Indonesia",
  IND: "India",
  IRL: "Ireland",
  IRN: "Iran",
  IRQ: "Iraq",
  ISR: "Israel",
  ITA: "Italy",
  JPN: "Japan",
  KAZ: "Kazakhstan",
  KEN: "Kenya",
  KOR: "South Korea",
  KWT: "Kuwait",
  LBN: "Lebanon",
  LKA: "Sri Lanka",
  MEX: "Mexico",
  MYS: "Malaysia",
  NGA: "Nigeria",
  NLD: "Netherlands",
  NOR: "Norway",
  NPL: "Nepal",
  NZL: "New Zealand",
  OMN: "Oman",
  PAK: "Pakistan",
  PHL: "Philippines",
  POL: "Poland",
  PRT: "Portugal",
  QAT: "Qatar",
  ROU: "Romania",
  RUS: "Russia",
  SAU: "Saudi Arabia",
  SGP: "Singapore",
  SWE: "Sweden",
  THA: "Thailand",
  TUR: "Turkey",
  UKR: "Ukraine",
  USA: "United States",
  VNM: "Vietnam",
  ZAF: "South Africa",
};

function emptyPassportData() {
  return {
    fullName: "",
    passportNumber: "",
    nationality: "",
    issuingCountry: "",
    sex: "",
    dateOfBirth: "",
    expiryDate: "",
    name: "",
    gender: "",
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

function normalizeMrzLine(line = "") {
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

function hasMrzShape(line = "") {
  const fillerCount = (line.match(/</g) || []).length;

  return line.length >= 20 && (fillerCount >= 2 || /^[A-Z0-9<]{30,}$/.test(line));
}

function buildMrzCandidates(text = "") {
  const lines = getLines(text).map(normalizeMrzLine).filter(hasMrzShape);
  const candidates = [];

  for (let index = 0; index < lines.length - 1; index += 1) {
    const firstOptions = [lines[index], `${lines[index]}${lines[index + 1]}`];

    firstOptions.forEach((first) => {
      if (!first.startsWith("P<") || first.length < 30) return;

      for (let next = index + 1; next <= Math.min(index + 3, lines.length - 1); next += 1) {
        const second = lines[next];
        if (second.startsWith("P<") || second.length < 30) return;

        candidates.push([
          first.padEnd(44, "<").slice(0, 44),
          second.padEnd(44, "<").slice(0, 44),
        ]);
      }
    });
  }

  const compactText = normalizeMrzLine(text);
  const compactMatch = compactText.match(/(P<[A-Z0-9<]{42})([A-Z0-9<]{44})/);

  if (compactMatch) {
    candidates.push([compactMatch[1], compactMatch[2]]);
  }

  return candidates;
}

function countryName(code = "") {
  const normalizedCode = normalizeAlphaField(code).replace(/</g, "");

  return countryNames[normalizedCode] || normalizedCode;
}

function normalizeAlphaField(value = "") {
  return String(value)
    .replace(/0/g, "O")
    .replace(/1/g, "I")
    .replace(/2/g, "Z")
    .replace(/5/g, "S")
    .replace(/8/g, "B")
    .replace(/[^A-Z<]/g, "");
}

function normalizeDigitField(value = "") {
  return String(value)
    .replace(/[OQD]/g, "0")
    .replace(/[IL]/g, "1")
    .replace(/Z/g, "2")
    .replace(/S/g, "5")
    .replace(/G/g, "6")
    .replace(/B/g, "8")
    .replace(/[^0-9]/g, "");
}

function mrzCharValue(character) {
  if (character === "<") return 0;
  if (/[0-9]/.test(character)) return Number(character);
  if (/[A-Z]/.test(character)) return character.charCodeAt(0) - 55;
  return 0;
}

function checkDigit(value = "") {
  const weights = [7, 3, 1];
  const total = String(value)
    .split("")
    .reduce(
      (sum, character, index) =>
        sum + mrzCharValue(character) * weights[index % weights.length],
      0
    );

  return String(total % 10);
}

function isValidCheck(value = "", digit = "") {
  return /^\d$/.test(digit) && checkDigit(value) === digit;
}

function formatMrzDate(value = "", type = "past") {
  const digits = normalizeDigitField(value);

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

function normalizeSex(value = "") {
  const sex = normalizeAlphaField(value).charAt(0);

  if (sex === "M") return "M";
  if (sex === "F") return "F";
  if (sex === "X") return "X";
  return "";
}

function sexLabel(sex = "") {
  if (sex === "M") return "Male";
  if (sex === "F") return "Female";
  if (sex === "X") return "Other";
  return "";
}

function parseName(firstLine = "") {
  const nameSection = firstLine.slice(5).replace(/<+$/g, "");
  const [surname = "", given = ""] = nameSection.split("<<");

  return [surname, given]
    .join(" ")
    .replace(/</g, " ")
    .split(/\s+/)
    .map(normalizeAlphaField)
    .filter(Boolean)
    .join(" ");
}

function parseCandidate(firstLine, secondLine) {
  const passportRaw = secondLine.slice(0, 9);
  const passportNumber = passportRaw.replace(/</g, "");
  const issuingCode = firstLine.slice(2, 5);
  const nationalityCode = secondLine.slice(10, 13);
  const sex = normalizeSex(secondLine.slice(20, 21));
  const dateOfBirth = formatMrzDate(secondLine.slice(13, 19), "past");
  const expiryDate = formatMrzDate(secondLine.slice(21, 27), "future");

  const checks = {
    passportNumber: isValidCheck(passportRaw, secondLine.charAt(9)),
    dateOfBirth: isValidCheck(secondLine.slice(13, 19), secondLine.charAt(19)),
    expiryDate: isValidCheck(secondLine.slice(21, 27), secondLine.charAt(27)),
    composite: isValidCheck(
      `${secondLine.slice(0, 10)}${secondLine.slice(13, 20)}${secondLine.slice(21, 43)}`,
      secondLine.charAt(43)
    ),
  };

  const passportData = {
    fullName: parseName(firstLine),
    passportNumber,
    nationality: countryName(nationalityCode),
    issuingCountry: countryName(issuingCode),
    sex,
    dateOfBirth,
    expiryDate,
  };

  passportData.name = passportData.fullName;
  passportData.gender = sexLabel(passportData.sex);

  const fieldScore = [
    passportData.fullName,
    passportData.passportNumber,
    passportData.nationality,
    passportData.issuingCountry,
    passportData.sex,
    passportData.dateOfBirth,
    passportData.expiryDate,
  ].filter(Boolean).length;
  const checkScore = Object.values(checks).filter(Boolean).length;

  return {
    success: fieldScore >= 2,
    confidence: Math.round(((fieldScore / 7) * 0.55 + (checkScore / 4) * 0.45) * 100),
    checks,
    mrzLines: [firstLine, secondLine],
    passportData,
  };
}

function parseMrz(text = "") {
  const candidates = buildMrzCandidates(text).map(([firstLine, secondLine]) =>
    parseCandidate(firstLine, secondLine)
  );

  const best = candidates.sort((a, b) => b.confidence - a.confidence)[0];

  if (!best) {
    return {
      success: false,
      confidence: 0,
      mrzLines: [],
      passportData: emptyPassportData(),
    };
  }

  return best;
}

function findLabelValue(lines, labelPattern) {
  const index = lines.findIndex((line) => labelPattern.test(line));

  if (index === -1) return "";

  const sameLine = lines[index].replace(labelPattern, "").replace(/^[:/ .-]+/, "").trim();
  if (sameLine) return sameLine;

  return lines[index + 1] || "";
}

function normalizeFallbackSex(value = "") {
  const cleanedValue = cleanOcrLine(value);

  if (/\bFEMALE\b/.test(cleanedValue) || cleanedValue === "F") return "F";
  if (/\bMALE\b/.test(cleanedValue) || cleanedValue === "M") return "M";
  return "";
}

function parseOcrFallback(text = "") {
  const lines = getLines(text);
  const passportData = emptyPassportData();
  const passportLabelValue = findLabelValue(lines, /PASSPORT\s*(NO\.?|NUMBER)|DOCUMENT\s*(NO\.?|NUMBER)/);
  const passportMatch =
    passportLabelValue.match(/\b[A-Z0-9]{6,10}\b/) ||
    String(text).toUpperCase().match(/\b[A-Z][A-Z0-9]{5,9}\b/);

  passportData.passportNumber = passportMatch?.[0] || "";
  passportData.fullName = findLabelValue(lines, /SURNAME\s+GIVEN\s+NAMES?|GIVEN\s+NAMES?|FULL\s+NAME|NAME/)
    .replace(/[^A-Z ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  passportData.nationality = countryName(findLabelValue(lines, /NATIONALITY/).slice(0, 3));
  passportData.issuingCountry = countryName(findLabelValue(lines, /ISSUING\s+COUNTRY|AUTHORITY|CODE/).slice(0, 3));
  passportData.sex = normalizeFallbackSex(findLabelValue(lines, /^SEX\b|GENDER/));
  passportData.dateOfBirth = parseLooseDate(findLabelValue(lines, /DATE\s+OF\s+BIRTH|DOB|BIRTH\s+DATE/), "past");
  passportData.expiryDate = parseLooseDate(findLabelValue(lines, /DATE\s+OF\s+EXPIRY|EXPIRY\s+DATE|EXPIRES/), "future");
  passportData.name = passportData.fullName;
  passportData.gender = sexLabel(passportData.sex);

  const populated = Object.values({
    fullName: passportData.fullName,
    passportNumber: passportData.passportNumber,
    nationality: passportData.nationality,
    issuingCountry: passportData.issuingCountry,
    sex: passportData.sex,
    dateOfBirth: passportData.dateOfBirth,
    expiryDate: passportData.expiryDate,
  }).filter(Boolean).length;

  return {
    success: populated >= 2,
    confidence: Math.round((populated / 7) * 45),
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
  sexLabel,
};
