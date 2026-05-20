import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import DatePicker from "react-datepicker";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  Bot,
  FileText,
  Mic,
  MicOff,
  Send,
  Sparkles,
  UploadCloud,
  Volume2,
} from "lucide-react";
import {
  AppShell,
  Button,
  Card,
  ChatBubble,
  LoadingState,
  StatusBadge,
} from "../components/ui";
import {
  cleanupField,
  formatDate,
  formatDetected,
  normalizeApplicationData,
  normalizePassportDetails,
  safeFallback,
  titleCase,
} from "../utils/formatters";
import { countries } from "../data/countries";
import { nationalities } from "../data/nationalities";
import {
  validateCountry,
  validateDateOfBirth,
  validateDuration,
  validateGender,
  validateName,
  validateNationality,
  validatePassport,
  validateTravelDate,
} from "../utils/validators";
import { formatDateToYmd } from "../utils/dates";

const STORAGE_KEY = "visaAssistantDraft";
const FINAL_APPLICATION_KEY = "visaAssistantFinalApplication";

const initialVisaDetails = {
  destinationCountry: "",
  visaType: "",
  duration: "",
  travelDate: "",
  additionalNotes: "",
};

const emptyPassportDetails = {
  name: "",
  passportNumber: "",
  nationality: "",
  sex: "",
  dateOfBirth: "",
};

const steps = [
  {
    key: "destinationCountry",
    target: "visaDetails",
    question: "Which country are you planning to visit?",
    searchableOptions: countries,
    validate: validateCountry,
  },
  {
    key: "visaType",
    target: "visaDetails",
    question:
      "What type of visa are you applying for? Examples: Tourist, Student, Work, Business, Transit, or others.",
    normalize: titleCase,
  },
  {
    key: "duration",
    target: "visaDetails",
    question: "How long do you plan to stay? (in days)",
    validate: validateDuration,
  },
  {
    key: "travelDate",
    target: "visaDetails",
    question: 'Select your planned travel date, or choose "Not Sure Yet" if undecided.',
    validate: validateTravelDate,
  },
  {
    key: "additionalNotes",
    target: "visaDetails",
    question:
      'Any additional notes for this application? Type "No" if there are none.',
    normalize: titleCase,
  },
  {
    key: "passportUpload",
    question:
      "Do you want to upload your passport now? Type yes to upload it, or no to enter passport details manually.",
  },
  {
    key: "name",
    target: "passportDetails",
    question: "Enter the full name as shown on the passport.",
    validate: validateName,
    manualPassportOnly: true,
  },
  {
    key: "passportNumber",
    target: "passportDetails",
    question: "Enter the passport number.",
    validate: validatePassport,
    manualPassportOnly: true,
  },
  {
    key: "nationality",
    target: "passportDetails",
    question: "Select your nationality.",
    searchableOptions: nationalities,
    validate: validateNationality,
    manualPassportOnly: true,
  },

{
  key: "sex",
  target: "passportDetails",
  question: "Select your gender.",
  options: ["Male", "Female", "Other"],
  validate: validateGender,
  manualPassportOnly: true,
},

{
  key: "dateOfBirth",
  target: "passportDetails",
  question: "Select your date of birth",
  validate: validateDateOfBirth,
  manualPassportOnly: true,
},
];

const CHAT_DEBUG_STORAGE_KEY = "visaAssistantDebug";

const CASCADE_RESET_KEYS = new Set(["destinationCountry", "visaType"]);

const EDIT_CHIP_LABELS = {
  destinationCountry: "Destination",
  visaType: "Visa Type",
  duration: "Duration",
  travelDate: "Travel Date",
  additionalNotes: "Notes",
  name: "Name",
  passportNumber: "Passport",
  nationality: "Nationality",
  sex: "Gender",
  dateOfBirth: "Date of Birth",
};

function requiresCascadeReset(stepKey = "") {
  return CASCADE_RESET_KEYS.has(stepKey);
}

function getStepAnswerValue(step, visaDetails, passportDetails) {
  if (step.target === "visaDetails") {
    const value = visaDetails[step.key];

    if (step.key === "travelDate" && value === "Not sure") {
      return "Not sure";
    }

    return cleanupField(value);
  }

  if (step.target === "passportDetails") {
    return cleanupField(passportDetails[step.key]);
  }

  return "";
}

function getAnsweredEditableSteps(visaDetails, passportDetails) {
  const editable = [];

  for (let stepIndex = 0; stepIndex < steps.length; stepIndex += 1) {
    const step = steps[stepIndex];

    if (step.key === "passportUpload") {
      continue;
    }

    const value = getStepAnswerValue(step, visaDetails, passportDetails);

    if (!value) {
      continue;
    }

    editable.push({
      stepIndex,
      key: step.key,
      label: EDIT_CHIP_LABELS[step.key] || titleCase(step.key),
    });
  }

  return editable;
}

function clearAnswersFromStep(fromStepIndex, visaDetails, passportDetails) {
  let nextVisa = { ...visaDetails };
  let nextPassport = { ...passportDetails };

  for (let index = fromStepIndex + 1; index < steps.length; index += 1) {
    const step = steps[index];

    if (step.key === "passportUpload") {
      continue;
    }

    if (step.target === "visaDetails") {
      nextVisa = { ...nextVisa, [step.key]: "" };
    }
  }

  return {
    visaDetails: nextVisa,
    passportDetails: nextPassport,
  };
}

function pruneStepSnapshotsAfter(snapshots, fromStepIndex) {
  const next = { ...snapshots };

  Object.keys(next).forEach((key) => {
    if (Number(key) > fromStepIndex) {
      delete next[key];
    }
  });

  return next;
}

function getRepopulateInputForStep(step, visaDetails, passportDetails) {
  if (!step?.target) {
    return "";
  }

  if (step.target === "visaDetails") {
    const raw = visaDetails[step.key];

    if (step.key === "travelDate" && raw === "Not sure") {
      return "";
    }

    return raw != null ? String(raw) : "";
  }

  if (step.target === "passportDetails") {
    const raw = passportDetails[step.key];

    return raw != null ? String(raw) : "";
  }

  return "";
}

function debugChatWorkflow(label, details = {}) {
  if (sessionStorage.getItem(CHAT_DEBUG_STORAGE_KEY) === "true") {
    console.debug(`[chat-workflow] ${label}`, details);
  }
}

function timestamp() {
  return new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function createMessage(sender, text) {
  return {
    sender,
    text,
    timestamp: timestamp(),
  };
}

function loadDraft() {
  try {
    const savedDraft = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "{}");
    const savedStepIndex = Number.isInteger(savedDraft.stepIndex)
      ? savedDraft.stepIndex
      : 0;

    return {
      visaDetails: {
        ...initialVisaDetails,
        ...(savedDraft.visaDetails || {}),
      },
      passportDetails: {
        ...emptyPassportDetails,
        ...(savedDraft.passportDetails || {}),
      },
      passportSkipped: Boolean(savedDraft.passportSkipped),
      passportUploadCompleted: Boolean(savedDraft.passportUploadCompleted),
      stepIndex: Math.min(Math.max(savedStepIndex, 0), steps.length),
    };
  } catch {
    return {
      visaDetails: initialVisaDetails,
      passportDetails: emptyPassportDetails,
      passportSkipped: false,
      passportUploadCompleted: false,
      stepIndex: 0,
    };
  }
}

function hasRequiredPassportDetails(passportDetails) {
  return Boolean(
    cleanupField(passportDetails?.name) &&
      cleanupField(passportDetails?.passportNumber) &&
      cleanupField(passportDetails?.nationality) &&
      cleanupField(passportDetails?.sex) &&
      cleanupField(passportDetails?.dateOfBirth) 
  );
}

function hasRequiredApplicationDetails(visaDetails, passportDetails) {
  return Boolean(
    cleanupField(passportDetails?.name) &&
      cleanupField(passportDetails?.passportNumber) &&
      cleanupField(passportDetails?.nationality) &&
      cleanupField(passportDetails?.sex) &&
      cleanupField(passportDetails?.dateOfBirth) &&
      cleanupField(visaDetails?.destinationCountry) &&
      cleanupField(visaDetails?.visaType) &&
      cleanupField(visaDetails?.duration)
  );
}

function isPassportStepAnswered(step, passportDetails) {
  if (!step.manualPassportOnly) {
    return false;
  }

  return Boolean(getStepAnswerValue(step, {}, passportDetails));
}

function isPassportUploadStepComplete(passportDetails, passportUploadCompleted) {
  return (
    Boolean(passportUploadCompleted) || hasRequiredPassportDetails(passportDetails)
  );
}

function getPassportUploadStepIndex() {
  return steps.findIndex((step) => step.key === "passportUpload");
}

function getNextStepIndex(
  currentStepIndex,
  passportDetails,
  passportSkipped,
  passportUploadCompleted = false
) {
  for (let index = currentStepIndex + 1; index < steps.length; index += 1) {
    const step = steps[index];

    if (
      step.key === "passportUpload" &&
      isPassportUploadStepComplete(passportDetails, passportUploadCompleted)
    ) {
      continue;
    }

    if (step.manualPassportOnly) {
      if (isPassportStepAnswered(step, passportDetails)) {
        continue;
      }

      if (!passportSkipped) {
        continue;
      }
    }

    return index;
  }

  return steps.length;
}

function advancePastCompletedSteps(
  stepIndex,
  passportDetails,
  passportSkipped,
  passportUploadCompleted
) {
  let index = Math.min(Math.max(stepIndex, 0), steps.length);

  while (index < steps.length) {
    const step = steps[index];
    const passportUploadComplete = isPassportUploadStepComplete(
      passportDetails,
      passportUploadCompleted
    );

    const shouldAdvance =
      (step.key === "passportUpload" && passportUploadComplete) ||
      (step.manualPassportOnly &&
        (isPassportStepAnswered(step, passportDetails) ||
          (!passportSkipped && passportUploadComplete)));

    if (!shouldAdvance) {
      break;
    }

    index = getNextStepIndex(
      index,
      passportDetails,
      passportSkipped,
      passportUploadCompleted
    );
  }

  return index;
}

function formatPassportSummary(passportDetails) {
  const normalizedPassportDetails = normalizePassportDetails(passportDetails);

  return [
    `- **Name:** ${formatDetected(normalizedPassportDetails.name)}`,
    `- **Passport Number:** ${formatDetected(normalizedPassportDetails.passportNumber)}`,
    `- **Nationality:** ${formatDetected(normalizedPassportDetails.nationality)}`,
    `- **Gender:** ${formatDetected(normalizedPassportDetails.sex)}`,
    `- **Date of Birth:** ${
      normalizedPassportDetails.dateOfBirth
        ? formatDate(normalizedPassportDetails.dateOfBirth)
        : "Not detected"
    }`,
  ].join("\n");
}

function resolveInitialChatState(
  restoredDraft,
  isEditRestart,
  incomingPassportData,
  restoredPassportDetails
) {
  if (isEditRestart) {
    let visaDetails = restoredDraft.visaDetails;
    let passportDetails = restoredDraft.passportDetails;

    try {
      const finalApplication = JSON.parse(
        sessionStorage.getItem(FINAL_APPLICATION_KEY) || "null"
      );

      if (finalApplication?.visaDetails) {
        visaDetails = {
          ...initialVisaDetails,
          ...finalApplication.visaDetails,
        };
        passportDetails = {
          ...emptyPassportDetails,
          ...finalApplication.passportDetails,
        };
      }
    } catch {
      // Keep draft values when final application cannot be parsed.
    }

    const passportUploadCompleted =
      Boolean(restoredDraft.passportUploadCompleted) ||
      hasRequiredPassportDetails(passportDetails);

    return {
      visaDetails,
      passportDetails,
      passportSkipped: restoredDraft.passportSkipped,
      passportUploadCompleted,
      stepIndex: 0,
    };
  }

  const passportUploadIndex = getPassportUploadStepIndex();
  let passportUploadCompleted =
    Boolean(restoredDraft.passportUploadCompleted) ||
    hasRequiredPassportDetails(restoredPassportDetails);

  if (incomingPassportData) {
    passportUploadCompleted = true;
  }

  const isPassportHandoffReturn =
    Boolean(incomingPassportData) &&
    restoredDraft.stepIndex >= passportUploadIndex &&
    passportUploadIndex >= 0;

  const needsManualPassportEntry = !hasRequiredPassportDetails(restoredPassportDetails);

  let stepIndex = restoredDraft.stepIndex;
  let passportSkippedForProgression = restoredDraft.passportSkipped;

  if (isPassportHandoffReturn) {
    passportSkippedForProgression = needsManualPassportEntry;
    stepIndex = getNextStepIndex(
      passportUploadIndex,
      restoredPassportDetails,
      passportSkippedForProgression,
      passportUploadCompleted
    );
  } else {
    stepIndex = advancePastCompletedSteps(
      stepIndex,
      restoredPassportDetails,
      passportSkippedForProgression,
      passportUploadCompleted
    );
  }

  if (stepIndex > steps.length) {
    stepIndex = steps.length;
  }

  return {
    visaDetails: restoredDraft.visaDetails,
    passportDetails: restoredPassportDetails,
    passportSkipped: passportSkippedForProgression,
    passportUploadCompleted,
    stepIndex,
  };
}

function ChatDatePicker({ stepKey, disabled, onSelectDate }) {
  const today = useMemo(() => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    return date;
  }, []);
  const [pickerDate, setPickerDate] = useState(null);
  const isDateOfBirth = stepKey === "dateOfBirth";

  return (
    <div className="w-full [&_.react-datepicker-wrapper]:w-full">
      <DatePicker
        selected={pickerDate}
        onChange={(date) => setPickerDate(date)}
        onSelect={(date) => {
          if (date && !disabled) {
            onSelectDate(formatDateToYmd(date));
          }
        }}
        showMonthDropdown
        showYearDropdown
        dropdownMode="select"
        maxDate={isDateOfBirth ? today : undefined}
        minDate={!isDateOfBirth ? today : undefined}
        dateFormat="dd MMM yyyy"
        placeholderText={
          isDateOfBirth ? "Select date of birth" : "Select travel date"
        }
        disabled={disabled}
        shouldCloseOnSelect
        className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-400 disabled:cursor-not-allowed disabled:bg-slate-50"
        calendarClassName="visa-chat-datepicker"
      />
    </div>
  );
}

function buildApplicationSummary(applicationData) {
  const normalizedApplicationData = normalizeApplicationData(applicationData);
  const { visaDetails, passportDetails, submittedAt } = normalizedApplicationData;

  return `
# Visa Application Summary

## Passport Details
${formatPassportSummary(passportDetails)}

## Visa Details
- **Destination Country:** ${safeFallback(visaDetails.destinationCountry)}
- **Visa Type:** ${safeFallback(visaDetails.visaType)}
- **Duration of Stay:** ${safeFallback(visaDetails.duration)}
- **Travel Date:** ${formatDate(visaDetails.travelDate)}
- **Submitted At:** ${formatDate(String(submittedAt).slice(0, 10))}
`;
}

function ChatPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const isEditRestart = location.state?.edit === true;
  const restoredDraft = useMemo(() => loadDraft(), []);
  const incomingPassportData = location.state?.passportData;
  const initialChatState = useMemo(() => {
    const restoredPassportDetails = {
      ...restoredDraft.passportDetails,
      ...(incomingPassportData || {}),
    };

    return resolveInitialChatState(
      restoredDraft,
      isEditRestart,
      incomingPassportData,
      restoredPassportDetails
    );
  }, [incomingPassportData, isEditRestart, restoredDraft]);
  const startStepIndex = initialChatState.stepIndex;

  const [stepIndex, setStepIndex] = useState(startStepIndex);
  const [visaDetails, setVisaDetails] = useState(initialChatState.visaDetails);
  const [passportDetails, setPassportDetails] = useState(
    initialChatState.passportDetails
  );
  const [passportSkipped, setPassportSkipped] = useState(
    initialChatState.passportSkipped
  );
  const [passportUploadCompleted, setPassportUploadCompleted] = useState(
    initialChatState.passportUploadCompleted
  );
  const [messages, setMessages] = useState(() => {
    if (isEditRestart) {
      return [createMessage("ai", steps[0].question)];
    }

    const openingMessages = [];

    if (incomingPassportData) {
      openingMessages.push(
        createMessage(
          "ai",
          `Passport details saved.\n\n${formatPassportSummary(incomingPassportData)}`
        )
      );
    }

    if (steps[startStepIndex]?.question) {
      openingMessages.push(createMessage("ai", steps[startStepIndex].question));
    } else {
      openingMessages.push(createMessage("ai", "All required details are ready."));
    }

    return openingMessages;
  });
  const [input, setInput] = useState("");
  const [transcriptPreview, setTranscriptPreview] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [stepSnapshots, setStepSnapshots] = useState({});
  const [editingStepIndex, setEditingStepIndex] = useState(null);
  const [datePickerRemountKey, setDatePickerRemountKey] = useState(0);

  const endRef = useRef(null);
  const inputRef = useRef(null);
  const recognitionRef = useRef(null);
  const stepIndexRef = useRef(startStepIndex);
  const visaDetailsRef = useRef(initialChatState.visaDetails);
  const passportDetailsRef = useRef(initialChatState.passportDetails);
  const passportSkippedRef = useRef(initialChatState.passportSkipped);
  const passportUploadCompletedRef = useRef(
    initialChatState.passportUploadCompleted
  );
  const isProcessingRef = useRef(false);
  const autoCompleteRef = useRef(false);
  const editingStepRef = useRef(null);
  const resumeStepIndexRef = useRef(null);
  const markdownPlugins = useMemo(() => [remarkGfm], []);

  useEffect(() => {
    stepIndexRef.current = stepIndex;
  }, [stepIndex]);

  useEffect(() => {
    visaDetailsRef.current = visaDetails;
  }, [visaDetails]);

  useEffect(() => {
    passportDetailsRef.current = passportDetails;
  }, [passportDetails]);

  useEffect(() => {
    passportSkippedRef.current = passportSkipped;
  }, [passportSkipped]);

  useEffect(() => {
    passportUploadCompletedRef.current = passportUploadCompleted;
  }, [passportUploadCompleted]);

  useEffect(() => {
    if (!isEditRestart) {
      return;
    }

    navigate(location.pathname, { replace: true, state: {} });
  }, [isEditRestart, location.pathname, navigate]);

  useEffect(() => {
    const draft = {
      visaDetails,
      passportDetails,
      passportSkipped,
      passportUploadCompleted:
        passportUploadCompleted || hasRequiredPassportDetails(passportDetails),
      stepIndex,
    };

    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
  }, [
    visaDetails,
    passportDetails,
    passportSkipped,
    passportUploadCompleted,
    stepIndex,
  ]);

  useEffect(() => {
    endRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [messages.length, isThinking, isComplete, statusMessage, errorMessage]);

  useEffect(() => {
    if (!isThinking && !isSaving && !isComplete) {
      inputRef.current?.focus();
    }
  }, [messages.length, isThinking, isSaving, isComplete, stepIndex]);

  const appendAssistantMessage = useCallback((text) => {
    setMessages((prev) => [...prev, createMessage("ai", text)]);
  }, []);

  const appendAssistantMessages = useCallback((texts) => {
    const validTexts = texts.filter((text) => String(text || "").trim());
    if (!validTexts.length) return;

    setMessages((prev) => [
      ...prev,
      ...validTexts.map((text) => createMessage("ai", text)),
    ]);
  }, []);

  const editableChips = useMemo(
    () =>
      getAnsweredEditableSteps(visaDetails, passportDetails).map((field) => ({
        ...field,
        label: EDIT_CHIP_LABELS[field.key] || field.label,
      })),
    [visaDetails, passportDetails]
  );

  const handleEditChipClick = useCallback(
    (chip) => {
      if (isProcessingRef.current || isThinking || isSaving) {
        return;
      }

      const targetStepIndex = chip.stepIndex;
      const step = steps[targetStepIndex];
      const snapshot = stepSnapshots[targetStepIndex];
      const cascade = requiresCascadeReset(step.key);
      let repopVisa = visaDetailsRef.current;
      let repopPassport = passportDetailsRef.current;

      if (isComplete) {
        setIsComplete(false);
        setStatusMessage("");
      }

      if (cascade) {
        if (snapshot) {
          setMessages((prev) => prev.slice(0, snapshot.userMessageIndex));
        }

        const cleared = clearAnswersFromStep(
          targetStepIndex,
          visaDetailsRef.current,
          passportDetailsRef.current
        );

        repopVisa = cleared.visaDetails;
        repopPassport = cleared.passportDetails;

        setVisaDetails(cleared.visaDetails);
        setPassportDetails(cleared.passportDetails);
        visaDetailsRef.current = cleared.visaDetails;
        passportDetailsRef.current = cleared.passportDetails;

        setStepSnapshots((prev) => pruneStepSnapshotsAfter(prev, targetStepIndex));
        editingStepRef.current = targetStepIndex;
        setEditingStepIndex(targetStepIndex);
        resumeStepIndexRef.current = null;
      } else {
        resumeStepIndexRef.current = stepIndexRef.current;
        editingStepRef.current = targetStepIndex;
        setEditingStepIndex(targetStepIndex);
      }

      const repop = getRepopulateInputForStep(step, repopVisa, repopPassport);

      stepIndexRef.current = targetStepIndex;
      setStepIndex(targetStepIndex);
      setInput(repop);
      setDatePickerRemountKey((key) => key + 1);
      setErrorMessage("");

      if (cascade) {
        appendAssistantMessage(step.question);
      }
    },
    [
      appendAssistantMessage,
      isComplete,
      isSaving,
      isThinking,
      stepSnapshots,
    ]
  );

  const completeApplication = useCallback(async (nextVisaDetails, nextPassportDetails) => {
    if (!hasRequiredApplicationDetails(nextVisaDetails, nextPassportDetails)) {
      appendAssistantMessage(
        "Required details are still missing. Please complete your name, passport number, destination country, visa type, and stay duration."
      );
      return;
    }

    const applicationData = normalizeApplicationData({
      visaDetails: nextVisaDetails,
      passportDetails: nextPassportDetails,
      submittedAt: new Date().toISOString(),
    });

    setIsSaving(true);
    setStatusMessage("Saving application...");
    setErrorMessage("");

    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/chat/save-application`,
        { applicationData }
      );

      const finalApplicationData = {
        ...applicationData,
        applicationId: response.data.applicationId,
        submittedAt: response.data.submittedAt || applicationData.submittedAt,
      };

      sessionStorage.setItem(
        FINAL_APPLICATION_KEY,
        JSON.stringify(finalApplicationData)
      );

      setIsComplete(true);
      editingStepRef.current = null;
      setEditingStepIndex(null);
      setStatusMessage("Application saved successfully.");
      appendAssistantMessage(
        `${buildApplicationSummary(finalApplicationData)}\n\nVisa application submitted successfully. Review the summary before generating the PDF.`
      );
    } catch {
      setErrorMessage(
        "Could not save the application. Please check the backend connection and try again."
      );
      appendAssistantMessage(
        "I could not save the application right now. Your entered details are still visible here, so you can try again."
      );
    } finally {
      setIsSaving(false);
    }
  }, [appendAssistantMessage]);

  useEffect(() => {
    if (
      autoCompleteRef.current ||
      isEditRestart ||
      !incomingPassportData ||
      startStepIndex < steps.length
    ) {
      return;
    }

    autoCompleteRef.current = true;
    void completeApplication(visaDetailsRef.current, passportDetailsRef.current);
  }, [completeApplication, incomingPassportData, isEditRestart, startStepIndex]);

  const moveToNextStep = async (
    currentStepIndex,
    nextVisaDetails,
    nextPassportDetails,
    assistantMessages = [],
    nextPassportSkipped = passportSkippedRef.current,
    nextPassportUploadCompleted = passportUploadCompletedRef.current
  ) => {
    const nextStepIndex = getNextStepIndex(
      currentStepIndex,
      nextPassportDetails,
      nextPassportSkipped,
      nextPassportUploadCompleted
    );

    debugChatWorkflow("next step selected", {
      currentStep: steps[currentStepIndex]?.key,
      currentStepIndex,
      nextStep: steps[nextStepIndex]?.key || "complete",
      nextStepIndex,
    });

    if (nextStepIndex >= steps.length) {
      setStepIndex(nextStepIndex);
      appendAssistantMessages(assistantMessages);
      await completeApplication(nextVisaDetails, nextPassportDetails);
      return;
    }

    setStepIndex(nextStepIndex);
    setInput("");
    setErrorMessage("");
    appendAssistantMessages([...assistantMessages, steps[nextStepIndex].question]);
  };

  const handlePassportUploadChoice = async (
    answer,
    activeStepIndex,
    currentVisaDetails,
    currentPassportDetails
  ) => {
    const normalizedAnswer = answer.trim().toLowerCase();

    if (["yes", "y", "upload", "sure", "ok", "okay"].includes(normalizedAnswer)) {
      setPassportSkipped(false);
      navigate("/upload");
      return;
    }

    if (["no", "n", "skip"].includes(normalizedAnswer)) {
      setPassportSkipped(true);
      setPassportUploadCompleted(true);
      passportUploadCompletedRef.current = true;
      await moveToNextStep(
        activeStepIndex,
        currentVisaDetails,
        currentPassportDetails,
        [],
        true,
        true
      );
      return;
    }

    appendAssistantMessages([
      "Please type yes to upload your passport, or no to enter details manually.",
      steps[activeStepIndex].question,
    ]);
  };

  const validateStepValue = (step, value) => {
    if (!step.validate) {
      const cleanedValue = cleanupField(value);

      if (!cleanedValue) {
        return {
          isValid: false,
          message: "This field is required.",
        };
      }

      return {
        isValid: true,
        value: step.normalize ? step.normalize(cleanedValue) : cleanedValue,
      };
    }

    return step.validate(value);
  };

  const handleSend = async (forcedValue) => {
    if (isProcessingRef.current || isThinking || isSaving) return;

    const trimmedInput = cleanupField(forcedValue || input);
    if (!trimmedInput) return;

    if (isComplete) return;

    const activeStepIndex = stepIndexRef.current;
    const currentStep = steps[activeStepIndex];
    const currentVisaDetails = visaDetailsRef.current;
    const currentPassportDetails = passportDetailsRef.current;
    const isInPlaceEdit =
      editingStepRef.current === activeStepIndex &&
      stepSnapshots[activeStepIndex] &&
      !requiresCascadeReset(currentStep?.key);
    const snapshot = stepSnapshots[activeStepIndex];

    debugChatWorkflow("received user input", {
      currentStep: currentStep?.key,
      currentStepIndex: activeStepIndex,
      input: trimmedInput,
      isInPlaceEdit,
    });

    if (isInPlaceEdit && snapshot) {
      setMessages((prev) => {
        const next = [...prev];
        next[snapshot.userMessageIndex] = createMessage("user", trimmedInput);
        return next;
      });
    } else {
      const preMessageCount = messages.length;
      setMessages((prev) => [...prev, createMessage("user", trimmedInput)]);
      setStepSnapshots((prev) => ({
        ...prev,
        [activeStepIndex]: { userMessageIndex: preMessageCount },
      }));
    }

    setInput("");
    setTranscriptPreview("");
    setErrorMessage("");

    if (!currentStep) {
      const fallbackStepIndex = Math.min(activeStepIndex, steps.length - 1);
      debugChatWorkflow("invalid currentStep fallback", {
        currentStepIndex: activeStepIndex,
        fallbackStepIndex,
      });
      setStepIndex(fallbackStepIndex);
      appendAssistantMessage(
        steps[fallbackStepIndex]?.question ||
          "Your application is ready for review."
      );
      return;
    }

    isProcessingRef.current = true;
    setIsThinking(true);

    try {
      if (currentStep.key === "passportUpload") {
        await handlePassportUploadChoice(
          trimmedInput,
          activeStepIndex,
          currentVisaDetails,
          currentPassportDetails
        );
        return;
      }

      const validation = validateStepValue(currentStep, trimmedInput);

      if (!validation.isValid) {
        appendAssistantMessages([validation.message, currentStep.question]);
        return;
      }

      const nextVisaDetails =
        currentStep.target === "visaDetails"
          ? {
              ...currentVisaDetails,
              [currentStep.key]: validation.value,
            }
          : currentVisaDetails;
      const nextPassportDetails =
        currentStep.target === "passportDetails"
          ? {
              ...currentPassportDetails,
              [currentStep.key]: validation.value,
            }
          : currentPassportDetails;

      setVisaDetails(nextVisaDetails);
      setPassportDetails(nextPassportDetails);

      if (hasRequiredPassportDetails(nextPassportDetails)) {
        setPassportUploadCompleted(true);
        passportUploadCompletedRef.current = true;
      }

      if (isInPlaceEdit) {
        const resumeIndex =
          resumeStepIndexRef.current ??
          getNextStepIndex(
            activeStepIndex,
            nextPassportDetails,
            passportSkippedRef.current,
            passportUploadCompletedRef.current
          );

        editingStepRef.current = null;
        setEditingStepIndex(null);
        resumeStepIndexRef.current = null;
        stepIndexRef.current = resumeIndex;
        setStepIndex(resumeIndex);
        return;
      }

      if (editingStepRef.current === activeStepIndex) {
        editingStepRef.current = null;
        setEditingStepIndex(null);
        resumeStepIndexRef.current = null;
      }

      await moveToNextStep(
        activeStepIndex,
        nextVisaDetails,
        nextPassportDetails,
        []
      );
    } finally {
      isProcessingRef.current = false;
      setIsThinking(false);
      window.setTimeout(() => inputRef.current?.focus(), 0);
    }
  };

  const handleUploadClick = () => {
    navigate("/upload");
  };

  const handleVoiceInput = () => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      appendAssistantMessage(
        "Voice input is not supported in this browser. Please type your answer."
      );
      return;
    }

    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      setTranscriptPreview("Listening...");
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.onerror = () => {
      setIsListening(false);
      setTranscriptPreview("");
      appendAssistantMessage(
        "I could not hear that clearly. Please try the microphone again or type your answer."
      );
    };

    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((result) => result[0].transcript)
        .join(" ");

      setTranscriptPreview(transcript);

      if (event.results[event.results.length - 1].isFinal) {
        setInput((currentInput) => {
          if (!currentInput.trim()) return transcript;
          return `${currentInput} ${transcript}`;
        });
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const disableInput = isThinking || isSaving || isComplete;
  const shouldShowUploadButton =
    steps[stepIndex]?.key === "passportUpload" && !isComplete;
  const currentStep = steps[stepIndex];
  
  const hasStepOptions = Boolean(currentStep?.options?.length);
  const hasSearchableOptions = Boolean(currentStep?.searchableOptions?.length);
  const isDateStep =
    currentStep?.key === "dateOfBirth" || currentStep?.key === "travelDate";
  const showEditChips = editableChips.length > 0 && !isComplete;
  const disableTextInput =
    disableInput || hasStepOptions || hasSearchableOptions || isDateStep;
  const filteredSearchOptions = useMemo(() => {
    if (!hasSearchableOptions) {
      return [];
    }

    const query = cleanupField(input).toLowerCase();

    if (!query) {
      return [];
    }

    return currentStep.searchableOptions
      .filter((option) => option.toLowerCase().includes(query))
      .slice(0, 8);
  }, [currentStep, hasSearchableOptions, input]);

  return (
    <AppShell showFooter={false}>
      <main className="flex h-screen max-h-[calc(100vh-73px)] min-h-0 flex-col">
        <section className="flex min-h-0 flex-1 flex-col">
          <div className="border-b border-slate-200/80 bg-white px-4 py-4 sm:px-6">
            <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-md shadow-slate-200">
                  <Bot className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-bold text-slate-950">Visa Application</p>
                  <p className="text-xs text-slate-500">
                    {isListening
                      ? "Listening..."
                      : isSaving
                        ? "Saving..."
                        : isThinking
                          ? "Thinking..."
                          : currentStep?.question || "Review ready"}
                  </p>
                </div>
              </div>

              <Button as={Link} to="/upload" variant="secondary" className="hidden sm:inline-flex">
                <UploadCloud className="h-4 w-4" />
                Upload
              </Button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6">
            <div className="mx-auto max-w-5xl space-y-3">
              {messages.map((msg, index) => (
                <ChatBubble
                  key={`${msg.sender}-${index}`}
                  sender={msg.sender}
                  timestamp={msg.timestamp}
                >
                  {msg.sender === "user" ? (
                    <div className="whitespace-pre-wrap break-words">{msg.text}</div>
                  ) : (
                    <div className="markdown leading-relaxed">
                      <ReactMarkdown remarkPlugins={markdownPlugins}>
                        {msg.text}
                      </ReactMarkdown>
                    </div>
                  )}
                </ChatBubble>
              ))}

              <AnimatePresence>
                {(isThinking || isSaving) && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                  >
                    <LoadingState
                      title={isSaving ? "Saving application..." : "Processing..."}
                      description={isSaving ? "Storing submitted data" : "Moving to the next step"}
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              {shouldShowUploadButton && (
                <div className="flex justify-center">
                  <Button type="button" variant="secondary" onClick={handleUploadClick}>
                    <UploadCloud className="h-4 w-4" />
                    Upload Passport
                  </Button>
                </div>
              )}

              {isComplete && (
                <Card className="mx-auto max-w-lg text-center">
                  <StatusBadge tone="emerald" icon={Sparkles}>
                    Saved
                  </StatusBadge>
                  <h2 className="mt-4 text-xl font-bold text-slate-950">
                    Visa review is ready
                  </h2>
                  <p className="mt-2 text-sm text-slate-600">
                    Review the completed application summary before generating the PDF.
                  </p>
                  <Button as={Link} to="/review" className="mt-5">
                    Review Application
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Card>
              )}

              {statusMessage && (
                <p className="text-center text-sm font-medium text-slate-600">
                  {statusMessage}
                </p>
              )}

              {errorMessage && (
                <p className="text-center text-sm font-medium text-red-600">
                  {errorMessage}
                </p>
              )}

              <div ref={endRef} />
            </div>
          </div>

          <div className="sticky bottom-0 border-t border-slate-200/80 bg-white/90 px-4 py-4 sm:px-6">
            <div className="mx-auto max-w-5xl">
              {hasStepOptions && (
                <div className="mb-3 flex flex-wrap gap-2">
                  {currentStep.options.map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => handleSend(option)}
                      disabled={disableInput}
                      className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {option}
                    </button>
                  ))}
                </div>
              )}

              {hasSearchableOptions && (
                <div className="mb-3">
                  <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                    <input
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      disabled={disableInput}
                      placeholder={
                        currentStep.key === "destinationCountry"
                          ? "Search countries..."
                          : "Search nationalities..."
                      }
                      className="w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400 disabled:cursor-not-allowed"
                    />
                    {input.trim() && (
                      <div className="mt-2 max-h-48 overflow-y-auto rounded-xl border border-slate-200">
                        {filteredSearchOptions.length > 0 ? (
                          filteredSearchOptions.map((option) => (
                            <button
                              key={option}
                              type="button"
                              onClick={() => handleSend(option)}
                              disabled={disableInput}
                              className="block w-full border-b border-slate-100 px-4 py-2.5 text-left text-sm font-medium text-slate-700 transition last:border-b-0 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {option}
                            </button>
                          ))
                        ) : (
                          <p className="px-4 py-2.5 text-sm text-slate-500">
                            No matches found. Select a valid option from the list.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {isListening && (
                <div className="mb-3 flex items-center gap-3 rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  <span className="relative flex h-3 w-3">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-600" />
                  </span>
                  <Volume2 className="h-4 w-4" />
                  {transcriptPreview || "Listening..."}
                </div>
              )}

              {showEditChips && (
                <div className="mb-3 flex flex-wrap gap-2">
                  {editableChips.map((chip) => (
                    <button
                      key={chip.key}
                      type="button"
                      onClick={() => handleEditChipClick(chip)}
                      disabled={disableInput}
                      className={[
                        "rounded-full border px-3 py-1.5 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-50",
                        editingStepIndex === chip.stepIndex
                          ? "border-emerald-600 bg-emerald-50 text-emerald-800"
                          : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50",
                      ].join(" ")}
                    >
                      {chip.label}
                    </button>
                  ))}
                </div>
              )}

              {isDateStep && (
                <div className="mb-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                  <div
                    className={
                      currentStep.key === "travelDate"
                        ? "flex flex-col gap-3 sm:flex-row sm:items-end"
                        : ""
                    }
                  >
                    <div className="min-w-0 flex-1">
                      <ChatDatePicker
                        key={`${currentStep.key}-${datePickerRemountKey}`}
                        stepKey={currentStep.key}
                        disabled={disableInput}
                        onSelectDate={handleSend}
                      />
                    </div>
                    {currentStep.key === "travelDate" && (
                      <Button
                        type="button"
                        variant="secondary"
                        disabled={disableInput}
                        onClick={() => handleSend("Not sure")}
                        className="shrink-0"
                      >
                        Not Sure Yet
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {!hasSearchableOptions && !isDateStep && (
              <div className="flex items-center gap-3 rounded-3xl border border-slate-200 bg-white p-2 shadow-xl shadow-slate-200/70">
                <button
                  type="button"
                  onClick={handleUploadClick}
                  disabled={disableInput}
                  className="rounded-2xl p-3 text-slate-500 transition hover:bg-slate-100 hover:text-emerald-700 disabled:opacity-50"
                  title="Upload passport"
                >
                  <UploadCloud className="h-5 w-5" />
                </button>

                <input
                  ref={inputRef}
                  type="text"
                  placeholder={isComplete ? "Application complete" : "Type your message..."}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleSend();
                    }
                  }}
                  disabled={disableTextInput}
                  className="min-w-0 flex-1 bg-transparent px-1 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 disabled:cursor-not-allowed"
                />

                <button
                  type="button"
                  onClick={handleVoiceInput}
                  disabled={disableInput}
                  className={[
                    "rounded-2xl p-3 transition disabled:opacity-50",
                    isListening
                      ? "bg-red-50 text-red-600"
                      : "text-slate-500 hover:bg-emerald-50 hover:text-emerald-700",
                  ].join(" ")}
                  title="Use voice input"
                >
                  {isListening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                </button>

                <button
                  type="button"
                  onClick={() => handleSend()}
                  disabled={disableTextInput || !input.trim()}
                  className="rounded-2xl bg-emerald-600 p-3 text-white shadow-md shadow-slate-200 transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                  title="Send message"
                >
                  <Send className="h-5 w-5" />
                </button>
              </div>
              )}

              <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                <FileText className="h-3.5 w-3.5" />
                Your answers are saved locally during the flow and submitted when complete.
              </div>
            </div>
          </div>
        </section>
      </main>
    </AppShell>
  );
}

export default ChatPage;
