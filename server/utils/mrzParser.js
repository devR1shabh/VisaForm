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
    .replace(/[\u00ab\u2039\u3008\uff1c]/g, "<")
    .replace(/[({\[]/g, "<")
    .replace(/[)}\]]/g, "<")
    .replace(/[|!]/g, "I")
    .replace(/[^\w< /:.,;-]/g, " ")
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

function normalizePassportNumber(value = "") {
  return String(value).replace(/[^A-Z0-9<]/g, "<");
}

function hasMrzShape(line = "") {
  const fillerCount = (line.match(/</g) || []).length;

  return (
    line.length >= 20 &&
    line.length <= 60 &&
    (fillerCount >= 1 || /^[A-Z0-9<]{30,}$/.test(line))
  );
}

function normalizeFirstLine(line = "") {
  const padded = normalizeMrzLine(line).padEnd(44, "<").slice(0, 44);
  const issuingCountry = normalizeAlphaField(padded.slice(2, 5)).padEnd(3, "<");
  const names = normalizeAlphaField(padded.slice(5)).padEnd(39, "<");

  return `P<${issuingCountry}${names}`.slice(0, 44);
}

function normalizeSecondLine(line = "") {
  const padded = normalizeMrzLine(line).padEnd(44, "<").slice(0, 44);
  const passportNumber = normalizePassportNumber(padded.slice(0, 9));
  const passportCheck = normalizeDigitField(padded.charAt(9)) || padded.charAt(9);
  const nationality = normalizeAlphaField(padded.slice(10, 13)).padEnd(3, "<");
  const birthDate = normalizeDigitField(padded.slice(13, 19)).padEnd(6, "0");
  const birthCheck = normalizeDigitField(padded.charAt(19)) || padded.charAt(19);
  const sex = normalizeAlphaField(padded.charAt(20)).charAt(0) || "<";
  const expiryDate = normalizeDigitField(padded.slice(21, 27)).padEnd(6, "0");
  const expiryCheck = normalizeDigitField(padded.charAt(27)) || padded.charAt(27);
  const optionalData = padded.slice(28, 43).replace(/[^A-Z0-9<]/g, "<");
  const compositeCheck = normalizeDigitField(padded.charAt(43)) || padded.charAt(43);

  return [
    passportNumber,
    passportCheck,
    nationality,
    birthDate,
    birthCheck,
    sex,
    expiryDate,
    expiryCheck,
    optionalData,
    compositeCheck,
  ].join("").slice(0, 44);
}

function splitLongMrzLine(line = "") {
  const start = line.indexOf("P<");

  if (start === -1) return [];

  const compact = line.slice(start);
  if (compact.length < 80) return [];

  return [compact.slice(0, 44), compact.slice(44, 88)];
}

function addCandidate(candidates, first, second) {
  if (!first || !second) return;

  const firstStart = first.indexOf("P<");
  if (firstStart === -1) return;

  const firstLine = first.slice(firstStart);
  if (firstLine.length < 30 || second.length < 30 || second.startsWith("P<")) {
    return;
  }

  candidates.push([
    normalizeFirstLine(firstLine),
    normalizeSecondLine(second),
  ]);
}

function buildMrzCandidates(text = "") {
  const normalizedLines = getLines(text).map(normalizeMrzLine).filter(Boolean);
  const lines = [];

  normalizedLines.forEach((line) => {
    const split = splitLongMrzLine(line);

    if (split.length) {
      lines.push(...split);
    } else if (hasMrzShape(line)) {
      lines.push(line);
    }
  });

  const candidates = [];

  for (let index = 0; index < lines.length; index += 1) {
    const firstOptions = [
      lines[index],
      `${lines[index]}${lines[index + 1] || ""}`,
      `${lines[index]}${lines[index + 1] || ""}${lines[index + 2] || ""}`,
    ];

    firstOptions.forEach((first) => {
      for (
        let next = index + 1;
        next <= Math.min(index + 4, lines.length - 1);
        next += 1
      ) {
        [
          lines[next],
          `${lines[next]}${lines[next + 1] || ""}`,
          `${lines[next]}${lines[next + 1] || ""}${lines[next + 2] || ""}`,
        ].forEach((second) => addCandidate(candidates, first, second));
      }
    });
  }

  const compactText = normalizeMrzLine(text);
  const compactMatch = compactText.match(/(P<[A-Z0-9<]{42})([A-Z0-9<]{44})/);

  if (compactMatch) {
    candidates.push([
      normalizeFirstLine(compactMatch[1]),
      normalizeSecondLine(compactMatch[2]),
    ]);
  }

  return candidates;
}

function countryName(code = "") {
  return normalizeAlphaField(code).replace(/</g, "");
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

  return [given, surname]
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
  const hasRequiredMrzFields =
    passportData.fullName &&
    passportData.passportNumber &&
    /^[A-Z]{3}$/.test(passportData.nationality) &&
    /^[A-Z]{3}$/.test(passportData.issuingCountry) &&
    passportData.sex &&
    passportData.dateOfBirth &&
    passportData.expiryDate;

  return {
    success: Boolean(hasRequiredMrzFields),
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

module.exports = {
  emptyPassportData,
  parseMrz,
  sexLabel,
};
