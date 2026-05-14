import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  CheckCircle2,
  Download,
  FileText,
  PencilLine,
  Sparkles,
} from "lucide-react";
import {
  AppShell,
  Button,
  Card,
  LoadingState,
  StatusBadge,
} from "../components/ui";
import { fadeUp } from "../components/animations";
import {
  formatDate,
  normalizeApplicationData,
  safeFallback,
} from "../utils/formatters";

const FINAL_APPLICATION_KEY = "visaAssistantFinalApplication";

function loadApplicationData() {
  try {
    return JSON.parse(sessionStorage.getItem(FINAL_APPLICATION_KEY) || "null");
  } catch {
    return null;
  }
}

function SummarySection({ title, rows }) {
  return (
    <Card className="h-full">
      <h2 className="text-lg font-bold text-slate-950">{title}</h2>
      <div className="mt-5 space-y-4">
        {rows.map(([label, value]) => (
          <div
            key={label}
            className="grid gap-1 border-b border-slate-100 pb-3 last:border-b-0 last:pb-0 sm:grid-cols-[170px_1fr]"
          >
            <dt className="text-sm font-semibold text-slate-500">{label}</dt>
            <dd className="text-sm font-semibold text-slate-950">{value}</dd>
          </div>
        ))}
      </div>
    </Card>
  );
}

function ReviewPage() {
  const navigate = useNavigate();
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState("");
  const applicationData = useMemo(() => {
    const loadedData = loadApplicationData();
    return loadedData ? normalizeApplicationData(loadedData) : null;
  }, []);

  const handleGeneratePdf = async () => {
    if (!applicationData || isGenerating) return;

    setIsGenerating(true);
    setError("");

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

      navigate("/success", {
        state: {
          pdfUrl,
          fileName: "visa-application.pdf",
        },
      });
    } catch {
      setError("Could not generate the PDF. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  if (!applicationData) {
    return (
      <AppShell>
        <main className="px-4 py-16">
          <Card className="mx-auto max-w-xl text-center">
            <FileText className="mx-auto h-12 w-12 text-slate-300" />
            <h1 className="mt-5 text-2xl font-bold text-slate-950">
              No application ready for review
            </h1>
            <p className="mt-3 text-slate-600">
              Complete the guided assistant flow first, then return to review and generate your PDF.
            </p>
            <Button as={Link} to="/chat" className="mt-6">
              Open Assistant
            </Button>
          </Card>
        </main>
      </AppShell>
    );
  }

  const { passportDetails, visaDetails, submittedAt } = applicationData;

  return (
    <AppShell>
      <main className="px-4 py-12 sm:px-6 lg:px-8">
        <motion.div {...fadeUp} className="mx-auto max-w-6xl">
          <div className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <StatusBadge icon={CheckCircle2} tone="emerald">
                Ready for PDF
              </StatusBadge>
              <h1 className="mt-5 text-4xl font-bold tracking-tight text-slate-950">
                Review Visa Application
              </h1>
              <p className="mt-3 max-w-2xl text-slate-600">
                Confirm the application summary before generating the final PDF document.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button as={Link} to="/chat" variant="secondary">
                <PencilLine className="h-4 w-4" />
                Edit Application
              </Button>
              <Button type="button" onClick={handleGeneratePdf} disabled={isGenerating}>
                <Download className="h-4 w-4" />
                Generate PDF
              </Button>
            </div>
          </div>

          {isGenerating && (
            <div className="mb-6">
              <LoadingState
                title="Generating Visa Application PDF..."
                description="Formatting your visa summary document."
              />
            </div>
          )}

          {error && (
            <div className="mb-6 rounded-3xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="grid gap-5 lg:grid-cols-3">
            <SummarySection
              title="Applicant Information"
              rows={[
                ["Name", safeFallback(passportDetails.name, "Not detected")],
                ["Submitted", formatDate(String(submittedAt).slice(0, 10))],
              ]}
            />
            <SummarySection
              title="Passport Information"
              rows={[
                ["Passport Number", safeFallback(passportDetails.passportNumber, "Not detected")],
                ["Nationality", safeFallback(passportDetails.nationality, "Not detected")],
                ["Sex", safeFallback(passportDetails.sex, "Not detected")],
                [
                  "Date of Birth",
                  passportDetails.dateOfBirth
                    ? formatDate(passportDetails.dateOfBirth)
                    : "Not detected",
                ],
              ]}
            />
            <SummarySection
              title="Visa Information"
              rows={[
                ["Destination Country", safeFallback(visaDetails.destinationCountry)],
                ["Visa Type", safeFallback(visaDetails.visaType)],
                ["Purpose of Visit", safeFallback(visaDetails.travelPurpose)],
                ["Duration of Stay", safeFallback(visaDetails.duration)],
                ["Travel Date", formatDate(visaDetails.travelDate)],
                ["Accommodation Details", safeFallback(visaDetails.accommodationDetails)],
                ["Additional Notes", safeFallback(visaDetails.additionalNotes)],
              ]}
            />
          </div>

          <Card className="mt-6 flex flex-col gap-4 bg-gradient-to-r from-indigo-600 to-sky-600 text-white sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-indigo-100">
                <Sparkles className="h-4 w-4" />
                Final step
              </div>
              <p className="mt-2 text-xl font-bold">
                Generate the final visa application PDF.
              </p>
            </div>
            <Button type="button" variant="secondary" onClick={handleGeneratePdf} disabled={isGenerating}>
              {isGenerating ? "Generating..." : "Generate PDF"}
            </Button>
          </Card>

          <Button as={Link} to="/chat" variant="ghost" className="mt-6">
            <ArrowLeft className="h-4 w-4" />
            Back to Assistant
          </Button>
        </motion.div>
      </main>
    </AppShell>
  );
}

export default ReviewPage;
