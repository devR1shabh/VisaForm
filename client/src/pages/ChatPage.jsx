import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
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
  isValidHtmlDate,
  normalizeApplicationData,
  normalizePassportDetails,
  normalizeVisaDetails,
  safeFallback,
} from "../utils/formatters";

const STORAGE_KEY = "visaAssistantDraft";
const FINAL_APPLICATION_KEY = "visaAssistantFinalApplication";

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
  { key: "destinationCountry", question: "Which country are you planning to visit?" },
  {
    key: "visaType",
    question: "What type of visa do you need? For example, tourist, student, work, or business.",
  },
  { key: "travelPurpose", question: "What is the main purpose of your travel?" },
  { key: "duration", question: "How long do you plan to stay?" },
  {
    key: "travelDate",
    question: "What is your planned travel date? Use YYYY-MM-DD if known, or type not sure.",
  },
  {
    key: "passportUpload",
    question: "Would you like to upload your passport now? You can type yes, upload it with the button, or no to continue.",
  },
  {
    key: "accommodationDetails",
    question: "Please share your accommodation details, such as hotel name, host address, or city of stay.",
  },
  { key: "additionalNotes", question: "Any additional notes for this application? Type no if there are none." },
];

const CHAT_DEBUG_STORAGE_KEY = "visaAssistantDebug";

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
      stepIndex: Math.min(Math.max(savedStepIndex, 0), steps.length),
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
    `- **Date of Birth:** ${
      normalizedPassportDetails.dateOfBirth
        ? formatDate(normalizedPassportDetails.dateOfBirth)
        : "Not detected"
    }`,
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
      createMessage(
        "ai",
        "Hello! I will guide you step by step through your visa application."
      ),
    ];

    if (incomingPassportData) {
      openingMessages.push(
        createMessage(
          "ai",
          `Great! I've saved your passport details. Please continue with the remaining visa details.\n\n${formatPassportSummary(incomingPassportData)}`
        )
      );
    }

    openingMessages.push(
      createMessage("ai", steps[startStepIndex]?.question || steps[0].question)
    );

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

  const endRef = useRef(null);
  const recognitionRef = useRef(null);
  const stepIndexRef = useRef(startStepIndex);
  const visaDetailsRef = useRef(restoredDraft.visaDetails);
  const passportDetailsRef = useRef({
    ...restoredDraft.passportDetails,
    ...(incomingPassportData || {}),
  });
  const isProcessingRef = useRef(false);
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
    setMessages((prev) => [...prev, createMessage("ai", text)]);
  };

  const appendAssistantMessages = (texts) => {
    const validTexts = texts.filter((text) => String(text || "").trim());
    if (!validTexts.length) return;

    setMessages((prev) => [
      ...prev,
      ...validTexts.map((text) => createMessage("ai", text)),
    ]);
  };

  const buildImmediateAcknowledgement = (message, currentStep, nextVisaDetails) => {
    if (currentStep.key === "travelDate") {
      const dateValue = nextVisaDetails.travelDate
        ? formatDate(nextVisaDetails.travelDate)
        : "not sure";
      return `Noted. I have recorded your travel date as ${dateValue}.`;
    }

    const acknowledgements = {
      destinationCountry: "Understood. I have recorded your destination country.",
      visaType: "Noted. I have recorded the visa type.",
      travelPurpose: "Thank you. I have recorded your travel purpose.",
      duration: "Noted. I have recorded your duration of stay.",
      accommodationDetails: "Thanks. I have recorded your accommodation details.",
      additionalNotes: "Noted. I have recorded your additional notes.",
    };

    return acknowledgements[currentStep.key] || `Noted. I have recorded ${message}.`;
  };

  const getAcknowledgement = async (
    message,
    nextVisaDetails,
    activeStepIndex,
    nextPassportDetails
  ) => {
    const normalizedVisaDetails = normalizeVisaDetails(nextVisaDetails);
    const normalizedPassportDetails = normalizePassportDetails(nextPassportDetails);
    const currentKey = steps[activeStepIndex]?.key;
    const normalizedFieldValue = normalizedVisaDetails[currentKey] || message;
    const displayValue =
      currentKey === "travelDate"
        ? formatDate(normalizedVisaDetails.travelDate)
        : cleanupField(normalizedFieldValue);

    try {
      const response = await axios.post(`${import.meta.env.VITE_API_URL}/api/chat`, {
        message: displayValue,
        applicationData: {
          visaDetails: normalizedVisaDetails,
          passportDetails: normalizedPassportDetails,
        },
      }, { timeout: 8000 });

      const reply = response.data.reply || "Noted.";
      debugChatWorkflow("assistant reply generated", { reply });
      return reply;
    } catch {
      const fallbackReply = "Noted. I have recorded that.";
      debugChatWorkflow("assistant reply generated", { reply: fallbackReply });
      return fallbackReply;
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
  };

  const moveToNextStep = async (
    currentStepIndex,
    nextVisaDetails,
    nextPassportDetails,
    assistantMessages = []
  ) => {
    let nextStepIndex = currentStepIndex + 1;

    if (
      steps[nextStepIndex]?.key === "passportUpload" &&
      hasPassportDetails(nextPassportDetails)
    ) {
      nextStepIndex += 1;
    }

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
      await moveToNextStep(
        activeStepIndex,
        currentVisaDetails,
        currentPassportDetails,
        [
          "Great. You can use the upload shortcut below now, or continue and add passport details later.",
        ]
      );
      return;
    }

    if (["no", "n", "skip"].includes(normalizedAnswer)) {
      await moveToNextStep(
        activeStepIndex,
        currentVisaDetails,
        currentPassportDetails,
        [
          "No problem. You can continue and add passport details manually later if needed.",
        ]
      );
      return;
    }

    appendAssistantMessage(
      "Please type yes to upload your passport now, or no to continue without uploading."
    );
  };

  const handleSend = async (forcedValue) => {
    if (isProcessingRef.current || isThinking || isSaving || isComplete) return;

    const trimmedInput = cleanupField(forcedValue || input);
    if (!trimmedInput) return;

    const activeStepIndex = stepIndexRef.current;
    const currentStep = steps[activeStepIndex];
    const currentVisaDetails = visaDetailsRef.current;
    const currentPassportDetails = passportDetailsRef.current;

    debugChatWorkflow("received user input", {
      currentStep: currentStep?.key,
      currentStepIndex: activeStepIndex,
      input: trimmedInput,
    });

    setMessages((prev) => [...prev, createMessage("user", trimmedInput)]);
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

      const nextVisaDetails = {
        ...currentVisaDetails,
        [currentStep.key]:
          currentStep.key === "travelDate" &&
          ["not sure", "unknown", "no", "n/a", "na"].includes(trimmedInput.toLowerCase())
            ? ""
            : trimmedInput,
      };

      setVisaDetails(nextVisaDetails);

      const acknowledgement = buildImmediateAcknowledgement(
        trimmedInput,
        currentStep,
        nextVisaDetails
      );
      debugChatWorkflow("assistant reply generated", { reply: acknowledgement });

      void getAcknowledgement(
        trimmedInput,
        nextVisaDetails,
        activeStepIndex,
        currentPassportDetails
      );

      await moveToNextStep(
        activeStepIndex,
        nextVisaDetails,
        currentPassportDetails,
        [acknowledgement]
      );
    } finally {
      isProcessingRef.current = false;
      setIsThinking(false);
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

  return (
    <AppShell showFooter={false}>
      <main className="grid min-h-[calc(100vh-73px)] grid-cols-1 lg:grid-cols-[320px_1fr]">
        <aside className="hidden border-r border-slate-200/80 bg-white/65 p-6 lg:block">
          <StatusBadge>Workflow</StatusBadge>
          <h1 className="mt-5 text-2xl font-bold text-slate-950">
            AI Visa Assistant
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Complete the visa workflow through a guided chat experience.
          </p>

          <div className="mt-8 space-y-3">
            {steps.map((step, index) => (
              <div
                key={step.key}
                className={[
                  "rounded-2xl border p-3 text-sm",
                  index === stepIndex
                    ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                    : index < stepIndex
                      ? "border-emerald-100 bg-emerald-50 text-emerald-800"
                      : "border-slate-200 bg-white text-slate-500",
                ].join(" ")}
              >
                <span className="font-semibold">{index + 1}.</span>{" "}
                {step.key === "passportUpload" ? "Passport upload" : step.question}
              </div>
            ))}
          </div>
        </aside>

        <section className="flex min-h-0 flex-col">
          <div className="border-b border-slate-200/80 bg-white px-4 py-4 sm:px-6">
            <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-md shadow-slate-200">
                  <Bot className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-bold text-slate-950">Visa AI Co-Pilot</p>
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

          <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6">
            <div className="mx-auto max-w-5xl space-y-4">
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
                      title={isSaving ? "Saving application..." : "AI assistant is typing..."}
                      description={isSaving ? "Storing submitted data in MongoDB" : "Preparing the next guidance step"}
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

          <div className="border-t border-slate-200/80 bg-white/90 px-4 py-4 sm:px-6">
            <div className="mx-auto max-w-5xl">
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
                  type="text"
                  placeholder={isComplete ? "Application complete" : "Type your message..."}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleSend();
                    }
                  }}
                  disabled={disableInput}
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
                  disabled={disableInput || !input.trim()}
                  className="rounded-2xl bg-emerald-600 p-3 text-white shadow-md shadow-slate-200 transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                  title="Send message"
                >
                  <Send className="h-5 w-5" />
                </button>
              </div>

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
