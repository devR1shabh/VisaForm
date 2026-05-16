import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowRight,
  FileImage,
  ImageUp,
  ShieldCheck,
  Sparkles,
  UploadCloud,
} from "lucide-react";
import {
  AppShell,
  Button,
  Card,
  LoadingState,
  StatusBadge,
} from "../components/ui";
import { fadeUp } from "../components/animations";

const emptyPassportData = {
  name: "",
  passportNumber: "",
  nationality: "",
  sex: "",
  dateOfBirth: "",
};

function UploadPassport() {
  const navigate = useNavigate();

  const [file, setFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");

  const extractionMessage = useMemo(() => {
    if (!isExtracting) return "";
    return "Analyzing passport image...";
  }, [isExtracting]);

  const handleSelectedFile = (selectedFile) => {
    if (!selectedFile) return;

    setFile(selectedFile);
    setImagePreview(URL.createObjectURL(selectedFile));
    setError("");
    setStatus("Upload successful");
  };

  const handleImageChange = (e) => {
    handleSelectedFile(e.target.files[0]);
  };

  const fileToBase64 = (selectedFile) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = () => {
        const result = reader.result || "";
        const base64 = result.toString().split(",")[1];

        resolve(base64);
      };

      reader.onerror = reject;
      reader.readAsDataURL(selectedFile);
    });
  };

  const handleExtractDetails = async () => {
    if (!file || isExtracting) return;

    setIsExtracting(true);
    setError("");
    setStatus("Extracting passport details...");

    try {
      const imageBase64 = await fileToBase64(file);

      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/passport/extract-passport`,
        {
          imageBase64,
          mimeType: file.type,
        }
      );

      setStatus("Preparing confirmation form...");

      navigate("/form", {
        state: {
          passportData: response.data.passportData,
        },
      });
    } catch (error) {
      console.error("[passport] extraction failed", error);

      setError(
        "We could not extract details from this image. You can still continue and enter details manually."
      );
      setStatus("");
    } finally {
      setIsExtracting(false);
    }
  };

  const handleManualContinue = () => {
    navigate("/form", {
      state: {
        passportData: emptyPassportData,
        extractionError:
          "Passport details were not detected. Please enter or confirm the information manually.",
      },
    });
  };

  return (
    <AppShell>
      <main className="px-4 py-12 sm:px-6 lg:px-8">
        <motion.div {...fadeUp} className="mx-auto max-w-6xl">
          <div className="mb-8 text-center">
            <StatusBadge icon={ShieldCheck}>Secure upload step</StatusBadge>
            <h1 className="mt-5 text-4xl font-bold tracking-tight text-slate-950">
              Upload Passport
            </h1>
            <p className="mx-auto mt-3 max-w-2xl text-slate-600">
              Add a passport image to extract applicant details, then verify everything before continuing.
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1fr_0.8fr]">
            <Card className="p-5 sm:p-8">
              <label
                htmlFor="passportUpload"
                onDragOver={(event) => {
                  event.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(event) => {
                  event.preventDefault();
                  setIsDragging(false);
                  handleSelectedFile(event.dataTransfer.files[0]);
                }}
                className={[
                  "flex min-h-[280px] cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed p-8 text-center transition",
                  isDragging
                    ? "border-indigo-400 bg-indigo-50"
                    : "border-slate-200 bg-slate-50/80 hover:border-indigo-300 hover:bg-indigo-50/50",
                ].join(" ")}
              >
                <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-3xl bg-white text-indigo-600 shadow-lg shadow-slate-200">
                  <UploadCloud className="h-8 w-8" />
                </div>
                <p className="text-lg font-bold text-slate-950">
                  Drag and drop passport image
                </p>
                <p className="mt-2 text-sm text-slate-500">
                  or click to browse from laptop or mobile
                </p>
                <p className="mt-5 rounded-full bg-white px-4 py-2 text-xs font-semibold text-slate-500">
                  JPG, PNG, and mobile camera images supported
                </p>
              </label>

              <input
                id="passportUpload"
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
              />

              {status && !isExtracting && (
                <div className="mt-5">
                  <StatusBadge tone="emerald" icon={Sparkles}>{status}</StatusBadge>
                </div>
              )}

              {isExtracting && (
                <div className="mt-5 space-y-3">
                  <LoadingState
                    title={extractionMessage}
                    description="Extracting passport details..."
                  />
                  <p className="text-sm text-slate-500">
                    Preparing confirmation form...
                  </p>
                </div>
              )}

              {error && (
                <div className="mt-5 rounded-3xl border border-amber-200 bg-amber-50 p-4 text-amber-800">
                  <div className="flex gap-3">
                    <AlertTriangle className="mt-0.5 h-5 w-5 flex-none" />
                    <div>
                      <p className="font-semibold">Extraction needs review</p>
                      <p className="mt-1 text-sm">{error}</p>
                      <Button
                        type="button"
                        variant="secondary"
                        className="mt-4"
                        onClick={handleManualContinue}
                      >
                        Continue Manually
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Button
                  type="button"
                  onClick={handleExtractDetails}
                  disabled={!file || isExtracting}
                  className="flex-1"
                >
                  {isExtracting ? "Extracting..." : "Extract Details"}
                  <ArrowRight className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleManualContinue}
                  disabled={isExtracting}
                >
                  Enter Manually
                </Button>
              </div>
            </Card>

            <Card className="overflow-hidden p-5">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="font-bold text-slate-950">Preview</h2>
                  <p className="text-sm text-slate-500">Selected passport image</p>
                </div>
                <FileImage className="h-5 w-5 text-indigo-500" />
              </div>

              {imagePreview ? (
                <img
                  src={imagePreview}
                  alt="Passport Preview"
                  className="max-h-[460px] w-full rounded-3xl object-contain ring-1 ring-slate-200"
                />
              ) : (
                <div className="flex min-h-[360px] flex-col items-center justify-center rounded-3xl bg-slate-50 text-center">
                  <ImageUp className="mb-4 h-10 w-10 text-slate-300" />
                  <p className="text-sm font-semibold text-slate-500">
                    No passport selected yet
                  </p>
                </div>
              )}
            </Card>
          </div>
        </motion.div>
      </main>
    </AppShell>
  );
}

export default UploadPassport;
