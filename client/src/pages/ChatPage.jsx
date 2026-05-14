import { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

function ChatPage() {

  const questions = [
    "Which country are you planning to visit?",
    "What is the purpose of your visit?",
    "How long do you plan to stay?",
    "When are you planning to travel?"
  ];

  const [step, setStep] = useState(0);

  const [applicationData, setApplicationData] = useState({
    country: "",
    purpose: "",
    duration: "",
    travelDate: ""
  });

  const [messages, setMessages] = useState([
    {
      sender: "ai",
      text: "Hello! I will help you complete your visa application."
    },
    {
      sender: "ai",
      text: questions[0]
    }
  ]);

  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [pdfError, setPdfError] = useState("");
  const [isListening, setIsListening] = useState(false);

  const endRef = useRef(null);
  const recognitionRef = useRef(null);

  const markdownPlugins = useMemo(() => [remarkGfm], []);

  useEffect(() => {
    endRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end"
    });
  }, [messages.length, isLoading, isComplete]);

  const handleDownloadPdf = async () => {
    if (isDownloadingPdf) return;

    setIsDownloadingPdf(true);
    setPdfError("");

    try {
      const response = await axios.post(
        "http://localhost:5000/api/pdf/generate-pdf",
        applicationData,
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
    } catch (error) {
      console.error("[pdf] download failed", error);
      setPdfError("Could not download the PDF. Please try again.");
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const handleVoiceInput = () => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setMessages((prev) => [
        ...prev,
        {
          sender: "ai",
          text: "Voice input is not supported in this browser. Please type your answer.",
        },
      ]);

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

  const handleSend = async () => {

    if (isLoading) return;
    if (!input.trim()) return;

    const userMessage = {
      sender: "user",
      text: input
    };

    setMessages((prev) => [...prev, userMessage]);

    // FIXED STATE UPDATE
    const updatedApplicationData = {
      ...applicationData
    };

    if (step === 0) {
      updatedApplicationData.country = input;
    }

    if (step === 1) {
      updatedApplicationData.purpose = input;
    }

    if (step === 2) {
      updatedApplicationData.duration = input;
    }

    if (step === 3) {
      updatedApplicationData.travelDate = input;
    }

    setApplicationData(updatedApplicationData);

    setIsLoading(true);

    try {

      const response = await axios.post(
        "http://localhost:5000/api/chat",
        {
          message: input,
          applicationData: updatedApplicationData
        }
      );

      const aiMessage = {
        sender: "ai",
        text: response.data.reply
      };

      if (step < questions.length - 1) {

        const nextStep = step + 1;

        setStep(nextStep);

        setMessages((prev) => [
          ...prev,
          aiMessage,
          {
            sender: "ai",
            text: questions[nextStep]
          }
        ]);

      } else {

        const summaryMessage = {
          sender: "ai",
          text: `
# Visa Application Summary

- **Destination Country:** ${updatedApplicationData.country}

- **Purpose of Visit:** ${updatedApplicationData.purpose}

- **Duration of Stay:** ${updatedApplicationData.duration}

- **Travel Date:** ${updatedApplicationData.travelDate}

Your visa application details have been recorded successfully.
`
        };

        setMessages((prev) => [
          ...prev,
          aiMessage,
          summaryMessage
        ]);

        setIsComplete(true);
      }

    } catch (error) {

      console.error("[chat] request failed", {
        message: error?.message,
        status: error?.response?.status,
        data: error?.response?.data,
      });

      setMessages((prev) => [
        ...prev,
        {
          sender: "ai",
          text: "Sorry — I couldn't get a response right now. Please try again."
        }
      ]);

    } finally {

      setIsLoading(false);

    }

    setInput("");

  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex flex-col">

      <div className="sticky top-0 z-10 border-b border-slate-200 bg-white/80 backdrop-blur">

        <div className="mx-auto w-full max-w-4xl px-4 py-4 flex items-center justify-between">

          <div>

            <div className="text-lg font-semibold text-slate-900">
              AI Visa Assistant
            </div>

            <div className="text-sm text-slate-500">
              Ask questions and get step-by-step guidance
            </div>

          </div>

          <div className="text-xs text-slate-500 hidden sm:block">
            {isListening ? "Listening..." : isLoading ? "Thinking..." : "Ready"}
          </div>

        </div>

      </div>

      <div className="flex-1 overflow-y-auto">

        <div className="mx-auto w-full max-w-4xl px-4 py-6 space-y-3">

          {messages.map((msg, index) => {

            const isUser = msg.sender === "user";

            return (

              <div
                key={index}
                className={`flex ${
                  isUser
                    ? "justify-end"
                    : "justify-start"
                }`}
              >

                <div
                  className={[
                    "max-w-[85%] sm:max-w-[70%] rounded-2xl px-4 py-3 shadow-sm border",
                    isUser
                      ? "bg-slate-900 text-white border-slate-900"
                      : "bg-white text-slate-900 border-slate-200"
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

          {isLoading && (

            <div className="flex justify-start">

              <div className="max-w-[85%] sm:max-w-[70%] rounded-2xl px-4 py-3 shadow-sm border bg-white text-slate-900 border-slate-200">

                <div className="flex items-center gap-2 text-sm text-slate-600">

                  <span className="inline-block h-2 w-2 rounded-full bg-slate-400 animate-pulse" />

                  <span>Thinking…</span>

                </div>

              </div>

            </div>

          )}

          {isComplete && (
            <div className="flex justify-center pt-3">
              <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-4 text-center shadow-sm">
                <button
                  type="button"
                  onClick={handleDownloadPdf}
                  disabled={isDownloadingPdf}
                  className="w-full rounded-xl bg-slate-900 px-5 py-3 font-medium text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isDownloadingPdf ? "Preparing PDF..." : "Download PDF"}
                </button>

                {pdfError && (
                  <p className="mt-3 text-sm text-red-600">
                    {pdfError}
                  </p>
                )}
              </div>
            </div>
          )}

          <div ref={endRef} />

        </div>

      </div>

      <div className="border-t border-slate-200 bg-white">

        <div className="mx-auto w-full max-w-4xl px-4 py-4 flex gap-3">

          <input
            type="text"
            placeholder="Type your message..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleSend();
              }
            }}
            disabled={isLoading}
            className="flex-1 border border-slate-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-slate-900/15 focus:border-slate-400 disabled:bg-slate-50"
          />

          <button
            type="button"
            onClick={handleVoiceInput}
            disabled={isLoading}
            title="Use voice input"
            className={[
              "rounded-xl border px-4 font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50",
              isListening
                ? "border-red-200 bg-red-50 text-red-700"
                : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
            ].join(" ")}
          >
            {isListening ? "Stop" : "Mic"}
          </button>

          <button
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            className="bg-slate-900 text-white px-5 rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-800 transition-colors"
          >
            {isLoading ? "Sending…" : "Send"}
          </button>

        </div>

      </div>

    </div>
  );
}

export default ChatPage;
