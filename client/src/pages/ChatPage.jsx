import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  cleanupField,
  formatDate,
  formatDetected,
  isValidHtmlDate,
  normalizeApplicationData,
  normalizePassportDetails,
  normalizeVisaDetails,
  safeFallback,
} from "../utils/formatters";

const STORAGE_KEY = "visaAssistantDraft";

const initialVisaDetails = {
  destinationCountry: "",
  visaType: "",
  travelPurpose: "",
  duration: "",
  travelDate: "",
  accommodationDetails: "",
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
    question: "Which country are you planning to visit?",
  },
  {
    key: "visaType",
    question: "What type of visa do you need? For example, tourist, student, work, or business.",
  },
  {
    key: "travelPurpose",
    question: "What is the main purpose of your travel?",
  },
  {
    key: "duration",
    question: "How long do you plan to stay?",
  },
  {
    key: "travelDate",
    question: "What is your planned travel date? Use YYYY-MM-DD if known, or type not sure.",
  },
  {
    key: "passportUpload",
    question: "Would you like to upload your passport now? You can type yes, upload it with the button, or type no to enter details manually later.",
  },
  {
    key: "accommodationDetails",
    question: "Please share your accommodation details, such as hotel name, host address, or city of stay.",
  },
  {
    key: "additionalNotes",
    question: "Any additional notes for this application? Type no if there are none.",
  },
];

function loadDraft() {
  try {
    const savedDraft = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "{}");

    return {
      visaDetails: {
        ...initialVisaDetails,
        ...(savedDraft.visaDetails || {}),
      },
      passportDetails: {
        ...emptyPassportDetails,
        ...(savedDraft.passportDetails || {}),
      },
      stepIndex: Number.isInteger(savedDraft.stepIndex)
        ? savedDraft.stepIndex
        : 0,
    };
  } catch {
    return {
      visaDetails: initialVisaDetails,
      passportDetails: emptyPassportDetails,
      stepIndex: 0,
    };
  }
}

function hasPassportDetails(passportDetails) {
  return Object.values(passportDetails || {}).some((value) =>
    String(value || "").trim()
  );
}

function formatPassportSummary(passportDetails) {
  const normalizedPassportDetails = normalizePassportDetails(passportDetails);

  return [
    `- **Name:** ${formatDetected(normalizedPassportDetails.name)}`,
    `- **Passport Number:** ${formatDetected(normalizedPassportDetails.passportNumber)}`,
    `- **Nationality:** ${formatDetected(normalizedPassportDetails.nationality)}`,
    `- **Sex:** ${formatDetected(normalizedPassportDetails.sex)}`,
    `- **Date of Birth:** ${normalizedPassportDetails.dateOfBirth ? formatDate(normalizedPassportDetails.dateOfBirth) : "Not detected"}`,
  ].join("\n");
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
- **Travel Purpose:** ${safeFallback(visaDetails.travelPurpose)}
- **Duration of Stay:** ${safeFallback(visaDetails.duration)}
- **Travel Date:** ${formatDate(visaDetails.travelDate)}
- **Accommodation Details:** ${safeFallback(visaDetails.accommodationDetails)}
- **Additional Notes:** ${safeFallback(visaDetails.additionalNotes)}
- **Submitted At:** ${formatDate(String(submittedAt).slice(0, 10))}
`;
}

function ChatPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const restoredDraft = useMemo(() => loadDraft(), []);
  const incomingPassportData = location.state?.passportData;
  const startStepIndex =
    incomingPassportData && steps[restoredDraft.stepIndex]?.key === "passportUpload"
      ? restoredDraft.stepIndex + 1
      : restoredDraft.stepIndex;

  const [stepIndex, setStepIndex] = useState(startStepIndex);
  const [visaDetails, setVisaDetails] = useState(restoredDraft.visaDetails);
  const [passportDetails] = useState({
    ...restoredDraft.passportDetails,
    ...(incomingPassportData || {}),
  });
  const [messages, setMessages] = useState(() => {
    const openingMessages = [
      {
        sender: "ai",
        text: "Hello! I will guide you step by step through your visa application.",
      },
    ];

    if (incomingPassportData) {
      openingMessages.push({
        sender: "ai",
        text: `Passport details received. Please continue with the remaining visa details.\n\n${formatPassportSummary(incomingPassportData)}`,
      });
    }

    openingMessages.push({
      sender: "ai",
      text: steps[startStepIndex]?.question || steps[0].question,
    });

    return openingMessages;
  });
  const [input, setInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isListening, setIsListening] = useState(false);

  const endRef = useRef(null);
  const recognitionRef = useRef(null);
  const markdownPlugins = useMemo(() => [remarkGfm], []);

  useEffect(() => {
    const draft = {
      visaDetails,
      passportDetails,
      stepIndex,
    };

    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
  }, [visaDetails, passportDetails, stepIndex]);

  useEffect(() => {
    endRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [messages.length, isThinking, isComplete, statusMessage]);

  const appendAssistantMessage = (text) => {
    setMessages((prev) => [
      ...prev,
      {
        sender: "ai",
        text,
      },
    ]);
  };

  const getAcknowledgement = async (message, nextVisaDetails) => {
    const normalizedVisaDetails = normalizeVisaDetails(nextVisaDetails);
    const normalizedPassportDetails = normalizePassportDetails(passportDetails);
    const currentKey = steps[stepIndex]?.key;
    const normalizedFieldValue = normalizedVisaDetails[currentKey] || message;
    const displayValue =
      currentKey === "travelDate"
        ? formatDate(normalizedVisaDetails.travelDate)
        : cleanupField(normalizedFieldValue);

    try {
      const response = await axios.post("http://localhost:5000/api/chat", {
        message: displayValue,
        applicationData: {
          visaDetails: normalizedVisaDetails,
          passportDetails: normalizedPassportDetails,
        },
      });

      return response.data.reply || "Noted.";
    } catch {
      return "Noted. I have recorded that.";
    }
  };

  const completeApplication = async (nextVisaDetails, nextPassportDetails) => {
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
        "http://localhost:5000/api/chat/save-application",
        {
          applicationData,
        }
      );

      const submittedAt =
        response.data.submittedAt || applicationData.submittedAt;

      setIsComplete(true);
      setStatusMessage("Application saved successfully.");
      appendAssistantMessage(
        `${buildApplicationSummary({
          ...applicationData,
          submittedAt,
        })}\n\nVisa application submitted successfully. You can now download the PDF.`
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
  };

  const moveToNextStep = async (currentStepIndex, nextVisaDetails, nextPassportDetails) => {
    let nextStepIndex = currentStepIndex + 1;

    if (
      steps[nextStepIndex]?.key === "passportUpload" &&
      hasPassportDetails(nextPassportDetails)
    ) {
      nextStepIndex += 1;
    }

    if (nextStepIndex >= steps.length) {
      setStepIndex(nextStepIndex);
      await completeApplication(nextVisaDetails, nextPassportDetails);
      return;
    }

    setStepIndex(nextStepIndex);
    appendAssistantMessage(steps[nextStepIndex].question);
  };

  const handlePassportUploadChoice = async (answer) => {
    const normalizedAnswer = answer.trim().toLowerCase();

    if (["yes", "y", "upload", "sure", "ok", "okay"].includes(normalizedAnswer)) {
      appendAssistantMessage(
        "Great. Use the Upload Passport button below. After extraction, you will review and confirm the details before returning here."
      );
      return;
    }

    if (["no", "n", "skip"].includes(normalizedAnswer)) {
      appendAssistantMessage(
        "No problem. You can continue and add passport details manually later if needed."
      );
      await moveToNextStep(stepIndex, visaDetails, passportDetails);
      return;
    }

    appendAssistantMessage(
      "Please type yes to upload your passport now, or no to continue without uploading."
    );
  };

  const handleSend = async () => {
    if (isThinking || isSaving || isComplete) return;

    const trimmedInput = input.trim();
    if (!trimmedInput) return;

    const currentStep = steps[stepIndex];

    setMessages((prev) => [
      ...prev,
      {
        sender: "user",
        text: trimmedInput,
      },
    ]);
    setInput("");
    setErrorMessage("");

    if (!currentStep) return;

    if (currentStep.key === "travelDate") {
      const dateValue = trimmedInput.toLowerCase();
      const isUnknownDate = ["not sure", "unknown", "no", "n/a", "na"].includes(dateValue);

      if (!isUnknownDate && !isValidHtmlDate(trimmedInput)) {
        appendAssistantMessage(
          "Please enter the travel date as YYYY-MM-DD, or type not sure."
        );
        return;
      }
    }

    setIsThinking(true);

    try {
      if (currentStep.key === "passportUpload") {
        await handlePassportUploadChoice(trimmedInput);
        return;
      }

      const nextVisaDetails = {
        ...visaDetails,
        [currentStep.key]:
          currentStep.key === "travelDate" &&
          ["not sure", "unknown", "no", "n/a", "na"].includes(trimmedInput.toLowerCase())
            ? ""
            : trimmedInput,
      };

      setVisaDetails(nextVisaDetails);

      const acknowledgement = await getAcknowledgement(
        trimmedInput,
        nextVisaDetails
      );

      appendAssistantMessage(acknowledgement);
      await moveToNextStep(stepIndex, nextVisaDetails, passportDetails);
    } finally {
      setIsThinking(false);
    }
  };

  const handleUploadClick = () => {
    navigate("/upload");
  };

  const handleDownloadPdf = async () => {
    if (isDownloadingPdf) return;

    setIsDownloadingPdf(true);
    setStatusMessage("Generating PDF...");
    setErrorMessage("");

    try {
      const normalizedApplicationData = normalizeApplicationData({
        visaDetails,
        passportDetails,
        submittedAt: new Date().toISOString(),
      });

      if (
        !normalizedApplicationData.visaDetails.destinationCountry ||
        !normalizedApplicationData.visaDetails.visaType ||
        !normalizedApplicationData.visaDetails.travelPurpose ||
        !normalizedApplicationData.visaDetails.duration
      ) {
        setErrorMessage(
          "Please complete the required visa details before generating the PDF."
        );
        setStatusMessage("");
        return;
      }

      const response = await axios.post(
        "http://localhost:5000/api/pdf/generate-pdf",
        normalizedApplicationData,
        {
          responseType: "blob",
        }
      );

      const pdfUrl = window.URL.createObjectURL(
        new Blob([response.data], {
          type: "application/pdf",
        })
      );

      const link = document.createElement("a");
      link.href = pdfUrl;
      link.setAttribute("download", "visa-application.pdf");
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(pdfUrl);
      setStatusMessage("Visa application submitted and PDF generated successfully.");
    } catch {
      setErrorMessage("Could not generate the PDF. Please try again.");
      setStatusMessage("");
    } finally {
      setIsDownloadingPdf(false);
    }
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
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.onerror = () => {
      setIsListening(false);
      appendAssistantMessage(
        "I could not hear that clearly. Please try the microphone again or type your answer."
      );
    };

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;

      setInput((currentInput) => {
        if (!currentInput.trim()) return transcript;

        return `${currentInput} ${transcript}`;
      });
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const disableInput = isThinking || isSaving || isComplete;
  const shouldShowUploadButton =
    steps[stepIndex]?.key === "passportUpload" && !isComplete;

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <div className="sticky top-0 z-10 border-b border-slate-200 bg-white">
        <div className="mx-auto w-full max-w-4xl px-4 py-4 flex items-center justify-between">
          <div>
            <div className="text-lg font-semibold text-slate-900">
              AI Visa Assistant
            </div>
            <div className="text-sm text-slate-500">
              Guided visa application chat
            </div>
          </div>

          <div className="text-xs text-slate-500 hidden sm:block">
            {isListening
              ? "Listening..."
              : isSaving
                ? "Saving..."
                : isThinking
                  ? "Thinking..."
                  : "Ready"}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-4xl px-4 py-6 space-y-3">
          {messages.map((msg, index) => {
            const isUser = msg.sender === "user";

            return (
              <div
                key={`${msg.sender}-${index}`}
                className={`flex ${isUser ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={[
                    "max-w-[85%] sm:max-w-[70%] rounded-2xl px-4 py-3 shadow-sm border",
                    isUser
                      ? "bg-slate-900 text-white border-slate-900"
                      : "bg-white text-slate-900 border-slate-200",
                  ].join(" ")}
                >
                  {isUser ? (
                    <div className="whitespace-pre-wrap break-words">
                      {msg.text}
                    </div>
                  ) : (
                    <div className="markdown text-sm leading-relaxed">
                      <ReactMarkdown remarkPlugins={markdownPlugins}>
                        {msg.text}
                      </ReactMarkdown>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {(isThinking || isSaving || isDownloadingPdf) && (
            <div className="flex justify-start">
              <div className="max-w-[85%] sm:max-w-[70%] rounded-2xl px-4 py-3 shadow-sm border bg-white text-slate-900 border-slate-200">
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <span className="inline-block h-2 w-2 rounded-full bg-slate-400 animate-pulse" />
                  <span>
                    {isSaving
                      ? "Saving application..."
                      : isDownloadingPdf
                        ? "Generating PDF..."
                        : "Thinking..."}
                  </span>
                </div>
              </div>
            </div>
          )}

          {shouldShowUploadButton && (
            <div className="flex justify-center pt-2">
              <button
                type="button"
                onClick={handleUploadClick}
                disabled={isThinking || isSaving}
                className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-medium text-slate-800 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Upload Passport
              </button>
            </div>
          )}

          {isComplete && (
            <div className="flex justify-center pt-3">
              <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-4 text-center shadow-sm">
                <button
                  type="button"
                  onClick={handleDownloadPdf}
                  disabled={isDownloadingPdf}
                  className="w-full rounded-xl bg-slate-900 px-5 py-3 font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isDownloadingPdf ? "Generating PDF..." : "Download PDF"}
                </button>
              </div>
            </div>
          )}

          {statusMessage && (
            <p className="text-center text-sm text-slate-600">
              {statusMessage}
            </p>
          )}

          {errorMessage && (
            <p className="text-center text-sm text-red-600">
              {errorMessage}
            </p>
          )}

          <div ref={endRef} />
        </div>
      </div>

      <div className="border-t border-slate-200 bg-white">
        <div className="mx-auto w-full max-w-4xl px-4 py-4 flex gap-3">
          <input
            type="text"
            placeholder={
              isComplete
                ? "Application complete"
                : "Type your message..."
            }
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleSend();
              }
            }}
            disabled={disableInput}
            className="flex-1 border border-slate-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-slate-900/15 focus:border-slate-400 disabled:bg-slate-50"
          />

          <button
            type="button"
            onClick={handleVoiceInput}
            disabled={disableInput}
            title="Use voice input"
            className={[
              "rounded-xl border px-4 font-medium disabled:cursor-not-allowed disabled:opacity-50",
              isListening
                ? "border-red-200 bg-red-50 text-red-700"
                : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50",
            ].join(" ")}
          >
            {isListening ? "Stop" : "Mic"}
          </button>

          <button
            type="button"
            onClick={handleSend}
            disabled={disableInput || !input.trim()}
            className="bg-slate-900 text-white px-5 rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-800"
          >
            {isThinking ? "Sending..." : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ChatPage;
