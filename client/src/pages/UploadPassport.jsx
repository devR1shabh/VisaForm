import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

function UploadPassport() {
  const navigate = useNavigate();

  const [file, setFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [error, setError] = useState("");

  const handleImageChange = (e) => {
    const selectedFile = e.target.files[0];

    if (selectedFile) {
      setFile(selectedFile);
      setImagePreview(URL.createObjectURL(selectedFile));
      setError("");
    }
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

    try {
      const imageBase64 = await fileToBase64(file);

      const response = await axios.post(
        "http://localhost:5000/api/passport/extract-passport",
        {
          imageBase64,
          mimeType: file.type,
        }
      );

      navigate("/form", {
        state: {
          passportData: response.data.passportData,
        },
      });
    } catch (error) {
      console.error("[passport] extraction failed", error);

      setError(
        error?.response?.data?.message ||
          "Could not extract passport details. Please try another image."
      );
    } finally {
      setIsExtracting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4">
      <div className="bg-white p-10 rounded-3xl shadow-xl w-full max-w-xl">

        <h1 className="text-4xl font-bold text-center mb-3">
          Upload Passport
        </h1>

        <p className="text-gray-500 text-center mb-8">
          Upload a passport image to extract applicant details using AI.
        </p>

        <label
          htmlFor="passportUpload"
          className="border-2 border-dashed border-gray-300 rounded-2xl h-56 flex flex-col items-center justify-center cursor-pointer hover:border-black transition"
        >
          <span className="text-5xl mb-3">📄</span>

          <p className="text-lg font-medium">
            Click to Upload Passport
          </p>

          <p className="text-sm text-gray-500 mt-2">
            JPG, PNG supported
          </p>
        </label>

        <input
          id="passportUpload"
          type="file"
          accept="image/*"
          onChange={handleImageChange}
          className="hidden"
        />

        {imagePreview && (
          <div className="mt-8">
            <h2 className="text-xl font-semibold mb-4">
              Preview
            </h2>

            <img
              src={imagePreview}
              alt="Passport Preview"
              className="rounded-2xl shadow-md w-full"
            />

            {error && (
              <p className="mt-4 text-sm text-red-600">
                {error}
              </p>
            )}

            <button
              type="button"
              onClick={handleExtractDetails}
              disabled={isExtracting}
              className="block w-full text-center mt-6 bg-black text-white py-3 rounded-xl hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isExtracting ? "Extracting Details..." : "Extract Details"}
            </button>

          </div>
        )}

      </div>
    </div>
  );
}

export default UploadPassport;
