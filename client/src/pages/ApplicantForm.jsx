import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Bot,
  Calendar,
  IdCard,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import {
  AppShell,
  Button,
  Card,
  Input,
  Select,
  StatusBadge,
} from "../components/ui";
import { fadeUp } from "../components/animations";
import {
  cleanupField,
  isValidHtmlDate,
  normalizePassportDetails,
} from "../utils/formatters";

function ApplicantForm() {
  const location = useLocation();
  const navigate = useNavigate();
  const passportData = location.state?.passportData || {};
  const extractionError = location.state?.extractionError || "";

  const [formData, setFormData] = useState({
    name: passportData.name || passportData.fullName || "",
    passportNumber: passportData.passportNumber || "",
    nationality: passportData.nationality || "",
    sex: "",
    dateOfBirth: passportData.dateOfBirth || "",
  });
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setError("");
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleContinue = () => {
    const cleanedFormData = {
      ...formData,
      name: cleanupField(formData.name),
      passportNumber: cleanupField(formData.passportNumber),
      nationality: cleanupField(formData.nationality),
      dateOfBirth: cleanupField(formData.dateOfBirth),
    };

    if (
      cleanedFormData.dateOfBirth &&
      !isValidHtmlDate(cleanedFormData.dateOfBirth)
    ) {
      setError("Please enter a valid date of birth before continuing.");
      return;
    }

    navigate("/chat", {
      state: {
        passportData: normalizePassportDetails(cleanedFormData),
      },
    });
  };

  return (
    <AppShell>
      <main className="px-4 py-12 sm:px-6 lg:px-8">
        <motion.div {...fadeUp} className="mx-auto max-w-6xl">
          <div className="mb-8 text-center">
            <StatusBadge icon={ShieldCheck}>Human verification</StatusBadge>
            <h1 className="mt-5 text-4xl font-bold tracking-tight text-slate-950">
              Confirm Passport Details
            </h1>
            <p className="mx-auto mt-3 max-w-2xl text-slate-600">
              Review the extracted details and correct anything before continuing to the AI assistant.
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
            <Card className="p-6 sm:p-8">
              {extractionError && (
                <div className="mb-6 rounded-3xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                  {extractionError}
                </div>
              )}

              {error && (
                <div className="mb-6 rounded-3xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                  {error}
                </div>
              )}

              <div className="grid gap-5 md:grid-cols-2">
                <label className="block">
                  <span className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <UserRound className="h-4 w-4 text-indigo-500" />
                    Name
                  </span>
                  <Input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Not Detected"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <IdCard className="h-4 w-4 text-indigo-500" />
                    Passport Number
                  </span>
                  <Input
                    type="text"
                    name="passportNumber"
                    value={formData.passportNumber}
                    onChange={handleChange}
                    placeholder="Not Detected"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 text-sm font-semibold text-slate-700">
                    Nationality
                  </span>
                  <Input
                    type="text"
                    name="nationality"
                    value={formData.nationality}
                    onChange={handleChange}
                    placeholder="Not Detected"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 text-sm font-semibold text-slate-700">
                    Sex
                  </span>
                  <Select
                    name="sex"
                    value={formData.sex}
                    onChange={handleChange}
                  >
                    <option value="">Select Sex</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </Select>
                </label>

                <label className="block md:col-span-2">
                  <span className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <Calendar className="h-4 w-4 text-indigo-500" />
                    Date of Birth
                  </span>
                  <Input
                    type="date"
                    name="dateOfBirth"
                    value={formData.dateOfBirth}
                    onChange={handleChange}
                  />
                </label>
              </div>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-end">
                <Button type="button" variant="secondary" onClick={() => navigate("/upload")}>
                  Re-upload Passport
                </Button>
                <Button type="button" onClick={handleContinue}>
                  Continue to AI Assistant
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </Card>

            <Card className="h-fit bg-gradient-to-br from-slate-950 to-indigo-950 text-white">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10">
                <Bot className="h-6 w-6 text-indigo-200" />
              </div>
              <h2 className="mt-5 text-xl font-bold">
                AI helper
              </h2>
              <p className="mt-3 text-sm leading-6 text-indigo-100">
                Please verify your extracted details before continuing. Missing fields are okay for this demo, but incorrect fields should be corrected now.
              </p>
              <div className="mt-6 rounded-2xl bg-white/10 p-4 text-sm text-indigo-50">
                The assistant will use these confirmed passport details when saving the final application and generating the PDF.
              </div>
            </Card>
          </div>
        </motion.div>
      </main>
    </AppShell>
  );
}

export default ApplicantForm;
