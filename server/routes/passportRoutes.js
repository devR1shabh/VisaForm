const express = require("express");
const sharp = require("sharp");
const { recognize } = require("tesseract.js");

const router = express.Router();

const emptyPassportData = {
  name: "",
  fullName: "",
  passportNumber: "",
  nationality: "",
  sex: "",
  dateOfBirth: "",
};

const rejectedCandidates = [];
const acceptedCandidates = [];

const noisePattern =
  /(ALAMY|SHUTTERSTOCK|LOREM|IPSUM|CONSECTETUR|ADIPISCING|INTERNATIONAL PASSPORT|PASSPORT TEMPLATE|REPUBLIC|WATERMARK|SIGNATURE|IMPORTANT INFORMATION|BIOMETRIC|MINISTRY|GOVERNMENT)/;

const placeholderPattern =
  /(DD[-/ ]?MM[-/ ]?YYYY|YYYY|LOREM|IPSUM|DUMMY|WORLD CITIZEN|WORLDWIDE CITIZEN|INTERNATIONAL|PASSPORT TEMPLATE|\bABC\b)/;

const nationalityMap = {
  IND: "INDIAN",
  INDIA: "INDIAN",
  INDIAN: "INDIAN",
  USA: "AMERICAN",
  AMERICAN: "AMERICAN",
  IDN: "INDONESIAN",
  INDONESIA: "INDONESIAN",
  INDONESIAN: "INDONESIAN",
  GBR: "BRITISH",
  BRITISH: "BRITISH",
  CAN: "CANADIAN",
  CANADA: "CANADIAN",
  CANADIAN: "CANADIAN",
};

function cleanOcrLine(line) {
  return (line || "")
    .replace(/[|]/g, "I")
    .replace(/[^\w< /:.-]/g, " ")
    .replace(/[CLIJ]{5,}/g, " ")
    .replace(/([A-Z])\1{4,}/g, "$1")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

function getOcrLines(text) {
  return (text || "")
    .split(/\r?\n/)
    .map(cleanOcrLine)
    .filter(Boolean);
}

function rejectCandidate(field, value, source, reason) {
  rejectedCandidates.push({
    field,
    value: value || "",
    source,
    reason,
  });
}

function addCandidate(candidates, field, value, score, source, validator) {
  const cleanedValue = (value || "")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleanedValue || placeholderPattern.test(cleanedValue)) {
    rejectCandidate(field, cleanedValue, source, "empty or placeholder");
    return;
  }

  if (validator && !validator(cleanedValue)) {
    rejectCandidate(field, cleanedValue, source, "failed validation");
    return;
  }

  const candidate = {
    field,
    value: cleanedValue,
    score,
    source,
  };

  acceptedCandidates.push(candidate);
  candidates.push(candidate);
}

function pickBest(candidates, minScore = 80) {
  const sortedCandidates = [...candidates].sort(
    (a, b) => b.score - a.score
  );

  if (!sortedCandidates[0] || sortedCandidates[0].score < minScore) {
    return "";
  }

  return sortedCandidates[0].value;
}

async function preprocessImage(imageBuffer) {
  const image = sharp(imageBuffer, {
    failOn: "none",
  });

  const metadata = await image.metadata();
  const width = metadata.width || 0;
  const height = metadata.height || 0;
  const warnings = [];

  if (width < 700 || height < 400) {
    warnings.push("low resolution image");
  }

  if (width > 1800 && height > 1200) {
    warnings.push("possible screenshot upload");
  }

  const processedImage = await sharp(imageBuffer, {
    failOn: "none",
  })
    .rotate()
    .grayscale()
    .normalize()
    .sharpen()
    .resize({
      width: width ? width * 2 : undefined,
      withoutEnlargement: false,
    })
    .threshold(155)
    .png()
    .toBuffer();

  const processedMetadata = await sharp(processedImage).metadata();
  const processedWidth = processedMetadata.width || 0;
  const processedHeight = processedMetadata.height || 0;

  const cropRegion = async (topRatio, heightRatio) => {
    const top = Math.floor(processedHeight * topRatio);
    const cropHeight = Math.max(
      1,
      Math.min(
        processedHeight - top,
        Math.floor(processedHeight * heightRatio)
      )
    );

    if (processedWidth <= 0 || processedHeight <= 0 || cropHeight <= 20) {
      return processedImage;
    }

    return sharp(processedImage)
      .extract({
        left: 0,
        top,
        width: processedWidth,
        height: cropHeight,
      })
      .png()
      .toBuffer();
  };

  return {
    fullImage: processedImage,
    centerImage: await cropRegion(0.2, 0.58),
    bottomImage: await cropRegion(0.68, 0.32),
    warnings,
  };
}

async function runOcr(imageBuffer) {
  const result = await recognize(imageBuffer, "eng", {
    logger: () => {},
  });

  return result?.data?.text || "";
}

function getMrzLines(lines) {
  return lines
    .map((line) => line.replace(/\s/g, ""))
    .filter((line) => {
      const fillerCount = (line.match(/</g) || []).length;

      return (
        fillerCount >= 3 ||
        /^P<[A-Z0-9<]{10,}$/.test(line) ||
        /^[A-Z0-9<]{25,}$/.test(line)
      );
    });
}

function parseMrz(lines, candidates) {
  const mrzLines = getMrzLines(lines);
  const firstLine = mrzLines.find((line) => line.startsWith("P<"));
  const secondLine = mrzLines.find(
    (line) => !line.startsWith("P<") && line.length >= 25
  );

  if (firstLine) {
    console.log("[OCR] MRZ name ignored by conservative policy");
  }

  if (secondLine) {
    const passportNumber = secondLine
      .slice(0, 10)
      .replace(/</g, "")
      .trim();
    const mrzDob = secondLine.slice(13, 19);
    const mrzSex = secondLine.slice(20, 21);

    addCandidate(
      candidates.passportNumber,
      "passportNumber",
      passportNumber,
      100,
      "MRZ passport number",
      isValidPassportNumber
    );

    addCandidate(
      candidates.dateOfBirth,
      "dateOfBirth",
      formatMrzDateForInput(mrzDob),
      100,
      "MRZ DOB"
    );

    addCandidate(
      candidates.sex,
      "sex",
      normalizeSex(mrzSex),
      95,
      "MRZ sex"
    );
  }

  return mrzLines;
}

function collectLabelCandidates(lines, candidates) {
  addCandidate(
    candidates.name,
    "name",
    sanitizeName(getValueNearLabel(lines, /GIVEN NAMES?|FIRST NAME/)),
    90,
    "Given Names label",
    isValidName
  );

  addCandidate(
    candidates.passportNumber,
    "passportNumber",
    getPassportNumberNearLabel(lines),
    90,
    "Passport No label",
    isValidPassportNumber
  );

  addCandidate(
    candidates.nationality,
    "nationality",
    normalizeNationality(
      getValueNearLabel(lines, /NATIONALITY/)
    ),
    85,
    "Nationality label"
  );

  if (!candidates.nationality.length) {
    addCandidate(
      candidates.nationality,
      "nationality",
      normalizePlaceOfBirth(
        getValueNearLabel(lines, /PLACE OF BIRTH|BIRTH PLACE/)
      ),
      65,
      "Place of Birth fallback"
    );
  }

  addCandidate(
    candidates.sex,
    "sex",
    normalizeSex(getValueNearLabel(lines, /^SEX\b|GENDER/)),
    85,
    "Sex label"
  );

  addCandidate(
    candidates.dateOfBirth,
    "dateOfBirth",
    formatDateForInput(
      getValueNearLabel(lines, /DATE OF BIRTH|DOB|BIRTH DATE/)
    ),
    85,
    "Date of Birth label"
  );
}

function collectGenericCenterGuesses(lines, candidates) {
  lines.forEach((line) => {
    if (isNoiseLine(line)) return;

    const passportMatches = line.match(/\b[A-Z0-9]{7,10}\b/g) || [];

    passportMatches.forEach((value) => {
      addCandidate(
        candidates.passportNumber,
        "passportNumber",
        value,
        70,
        "generic center passport-like value",
        isValidPassportNumber
      );
    });
  });
}

function getValueNearLabel(lines, labelPattern) {
  const index = lines.findIndex((line) => labelPattern.test(line));

  if (index === -1) return "";

  const sameLineValue = lines[index]
    .replace(labelPattern, "")
    .replace(/^[:/ .-]+/, "")
    .trim();

  if (sameLineValue && !isNoiseLine(sameLineValue)) return sameLineValue;

  for (let offset = 1; offset <= 2; offset += 1) {
    const nearbyLine = lines[index + offset] || "";

    if (nearbyLine && !isNoiseLine(nearbyLine)) return nearbyLine;
  }

  return "";
}

function getPassportNumberNearLabel(lines) {
  const value = getValueNearLabel(
    lines,
    /PASSPORT\s*(NO\.?|NUMBER)|DOCUMENT\s*(NO\.?|NUMBER)/
  );
  const matches = value.match(/\b[A-Z0-9]{7,10}\b/g) || [];

  return matches.find(isValidPassportNumber) || value;
}

function sanitizeName(value = "") {
  return value
    .toUpperCase()
    .replace(/[<]+/g, " ")
    .replace(/[CLIJ]{4,}/g, " ")
    .replace(/([A-Z])\1{2,}/g, "")
    .replace(/[^A-Z ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isValidName(value = "") {
  if (!value || value.length > 35 || placeholderPattern.test(value)) {
    return false;
  }

  if (noisePattern.test(value) || /[A-Z]{16,}/.test(value)) {
    return false;
  }

  const words = value.split(" ").filter(Boolean);

  return (
    words.length >= 1 &&
    words.length <= 3 &&
    words.every((word) => word.length >= 2 && word.length <= 16)
  );
}

function isValidPassportNumber(value = "") {
  return (
    /^[A-Z0-9]{7,10}$/.test(value) &&
    /\d/.test(value) &&
    !noisePattern.test(value) &&
    !placeholderPattern.test(value) &&
    !["PASSPORT", "DOCIUSMOD", "TEMPLATE"].includes(value)
  );
}

function normalizeNationality(value = "") {
  const cleanedValue = cleanTextValue(value);

  if (!cleanedValue || placeholderPattern.test(cleanedValue)) return "";

  const keyword = Object.keys(nationalityMap)
    .sort((a, b) => b.length - a.length)
    .find((item) => cleanedValue.includes(item));

  return keyword ? nationalityMap[keyword] : "";
}

function normalizePlaceOfBirth(value = "") {
  const cleanedValue = cleanTextValue(value);

  if (!cleanedValue || placeholderPattern.test(cleanedValue)) return "";
  if (noisePattern.test(cleanedValue)) return "";
  if (!/^[A-Z ]{3,30}$/.test(cleanedValue)) return "";

  return cleanedValue;
}

function normalizeSex(value = "") {
  const cleanedValue = cleanTextValue(value);

  if (/\bFEMALE\b/.test(cleanedValue) || cleanedValue === "F") {
    return "Female";
  }

  if (/\bMALE\b/.test(cleanedValue) || cleanedValue === "M") {
    return "Male";
  }

  return "";
}

function cleanTextValue(value = "") {
  return value
    .toUpperCase()
    .replace(/[^A-Z ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isNoiseLine(line = "") {
  return noisePattern.test(line) || placeholderPattern.test(line);
}

function formatMrzDateForInput(value = "") {
  if (!/^\d{6}$/.test(value)) return "";

  const year = Number(value.slice(0, 2));
  const month = value.slice(2, 4);
  const day = value.slice(4, 6);
  const currentYear = new Date().getFullYear() % 100;
  const century = year > currentYear ? "19" : "20";

  return formatDateForInput(`${day}/${month}/${century}${value.slice(0, 2)}`);
}

function formatDateForInput(value = "") {
  if (!value || placeholderPattern.test(value.toUpperCase())) return "";

  const normalizedValue = value.trim().replace(/\s+/g, "/");
  const match = normalizedValue.match(
    /\b(\d{1,4})[/-](\d{1,2})[/-](\d{1,4})\b/
  );

  if (!match) return "";

  let day = match[1];
  let month = match[2];
  let year = match[3];

  if (day.length === 4) {
    year = match[1];
    month = match[2];
    day = match[3];
  }

  if (year.length === 2) {
    year = Number(year) > 30 ? `19${year}` : `20${year}`;
  }

  const formattedDate = `${year.padStart(4, "0")}-${month.padStart(
    2,
    "0"
  )}-${day.padStart(2, "0")}`;

  console.log("[OCR] raw DOB", value);
  console.log("[OCR] formatted DOB", formattedDate);

  return isValidDateForInput(formattedDate) ? formattedDate : "";
}

function isValidDateForInput(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

  const date = new Date(`${value}T00:00:00Z`);
  const [year, month, day] = value.split("-").map(Number);
  const currentYear = new Date().getFullYear();

  return (
    year >= 1940 &&
    year <= currentYear &&
    !Number.isNaN(date.getTime()) &&
    date.getUTCFullYear() === year &&
    date.getUTCMonth() + 1 === month &&
    date.getUTCDate() === day &&
    date <= new Date()
  );
}

function parsePassportRegions(regionTexts) {
  acceptedCandidates.length = 0;
  rejectedCandidates.length = 0;

  const fullLines = getOcrLines(regionTexts.full);
  const centerLines = getOcrLines(regionTexts.center);
  const bottomLines = getOcrLines(regionTexts.bottom);

  const candidates = {
    name: [],
    passportNumber: [],
    nationality: [],
    sex: [],
    dateOfBirth: [],
  };

  const mrzLines = parseMrz(bottomLines, candidates);

  collectLabelCandidates(centerLines, candidates);
  collectGenericCenterGuesses(centerLines, candidates);

  const passportData = {
    name: pickBest(candidates.name, 90),
    passportNumber: pickBest(candidates.passportNumber, 90),
    nationality: pickBest(candidates.nationality, 65),
    sex: pickBest(candidates.sex, 85),
    dateOfBirth: pickBest(candidates.dateOfBirth, 85),
  };

  passportData.fullName = passportData.name;

  console.log("[OCR] full image OCR:", regionTexts.full);
  console.log("[OCR] center region OCR:", regionTexts.center);
  console.log("[OCR] bottom MRZ OCR:", regionTexts.bottom);
  console.log("[OCR] cleaned full lines:", fullLines);
  console.log("[OCR] cleaned center lines:", centerLines);
  console.log("[OCR] cleaned bottom lines:", bottomLines);
  console.log("[OCR] cleaned MRZ:", mrzLines);
  console.log("[OCR] accepted candidates:", acceptedCandidates);
  console.log("[OCR] rejected candidates:", rejectedCandidates);
  console.log("[OCR] selected fields:", passportData);
  console.log("[OCR] confidence scores:", {
    name: candidates.name,
    passportNumber: candidates.passportNumber,
    nationality: candidates.nationality,
    sex: candidates.sex,
    dateOfBirth: candidates.dateOfBirth,
  });

  return passportData;
}

router.post("/extract-passport", async (req, res) => {
  try {
    const { imageBase64 } = req.body;

    if (!imageBase64) {
      return res.json({
        passportData: emptyPassportData,
      });
    }

    const imageBuffer = Buffer.from(imageBase64, "base64");
    const { fullImage, centerImage, bottomImage, warnings } =
      await preprocessImage(imageBuffer);

    warnings.forEach((warning) => {
      console.log("[OCR] image quality warning:", warning);
    });

    const [fullOcrText, centerOcrText, bottomOcrText] = await Promise.all([
      runOcr(fullImage),
      runOcr(centerImage),
      runOcr(bottomImage),
    ]);

    const regionTexts = {
      full: fullOcrText,
      center: centerOcrText,
      bottom: bottomOcrText,
    };

    const passportData = parsePassportRegions(regionTexts);
    const ocrText = [
      "FULL IMAGE:",
      fullOcrText,
      "CENTER REGION:",
      centerOcrText,
      "BOTTOM MRZ REGION:",
      bottomOcrText,
    ].join("\n");

    res.json({
      passportData,
      ocrText,
    });
  } catch (error) {
    console.log("[api/passport] OCR fallback:", error.message);

    res.json({
      passportData: emptyPassportData,
    });
  }
});

module.exports = router;
