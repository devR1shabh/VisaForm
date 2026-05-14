import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { Download, RefreshCw, Sparkles } from "lucide-react";
import {
  AppShell,
  Button,
  Card,
  StatusBadge,
  SuccessMark,
} from "../components/ui";
import { fadeUp } from "../components/animations";

const STORAGE_KEY = "visaAssistantDraft";
const FINAL_APPLICATION_KEY = "visaAssistantFinalApplication";

function SuccessPage() {
  const location = useLocation();
  const pdfUrl = location.state?.pdfUrl;
  const fileName = location.state?.fileName || "visa-application.pdf";

  const handleDownload = () => {
    if (!pdfUrl) return;

    const link = document.createElement("a");
    link.href = pdfUrl;
    link.setAttribute("download", fileName);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const handleStartNew = () => {
    sessionStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem(FINAL_APPLICATION_KEY);
  };

  return (
    <AppShell>
      <main className="px-4 py-16 sm:px-6 lg:px-8">
        <motion.div {...fadeUp}>
          <Card className="mx-auto max-w-2xl text-center">
            <SuccessMark />
            <StatusBadge tone="emerald" icon={Sparkles} className="mt-6">
              Complete
            </StatusBadge>
            <h1 className="mt-6 text-4xl font-bold tracking-tight text-slate-950">
              Visa Application Generated Successfully
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-slate-600">
              Your visa application summary PDF is ready. You can download it now or start a new guided application.
            </p>

            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Button
                type="button"
                onClick={handleDownload}
                disabled={!pdfUrl}
              >
                <Download className="h-4 w-4" />
                Download PDF
              </Button>
              <Button
                as={Link}
                to="/chat"
                variant="secondary"
                onClick={handleStartNew}
              >
                <RefreshCw className="h-4 w-4" />
                Start New Application
              </Button>
            </div>

            {!pdfUrl && (
              <p className="mt-5 text-sm text-amber-700">
                PDF download link is not available in this session. Return to review and generate it again.
              </p>
            )}
          </Card>
        </motion.div>
      </main>
    </AppShell>
  );
}

export default SuccessPage;
