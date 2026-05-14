import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
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
    <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4">
      <div className="bg-white p-10 rounded-3xl shadow-xl w-full max-w-2xl">

        <h1 className="text-4xl font-bold mb-8 text-center">
          Confirm Passport Details
        </h1>

        <p className="text-gray-500 text-center mb-8">
          Please verify extracted details before continuing.
        </p>

        {extractionError && (
          <p className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            {extractionError}
          </p>
        )}

        {error && (
          <p className="mb-6 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </p>
        )}

        <div className="space-y-6">

          <div>
            <label className="block mb-2 font-medium">
              Name
            </label>

            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Not detected"
              className="w-full border border-gray-300 rounded-xl p-3"
            />
          </div>

          <div>
            <label className="block mb-2 font-medium">
              Passport Number
            </label>

            <input
              type="text"
              name="passportNumber"
              value={formData.passportNumber}
              onChange={handleChange}
              placeholder="Not detected"
              className="w-full border border-gray-300 rounded-xl p-3"
            />
          </div>

          <div>
            <label className="block mb-2 font-medium">
              Nationality
            </label>

            <input
              type="text"
              name="nationality"
              value={formData.nationality}
              onChange={handleChange}
              placeholder="Not detected"
              className="w-full border border-gray-300 rounded-xl p-3"
            />
          </div>

          <div>
            <label className="block mb-2 font-medium">
              Sex
            </label>

            <select
              name="sex"
              value={formData.sex}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-xl p-3"
            >
              <option value="">Select Sex</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </select>
          </div>

          <div>
            <label className="block mb-2 font-medium">
              Date of Birth
            </label>

            <input
              type="date"
              name="dateOfBirth"
              value={formData.dateOfBirth}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-xl p-3"
            />
          </div>

          <button
            type="button"
            onClick={handleContinue}
            className="block w-full text-center bg-black text-white py-3 rounded-xl hover:bg-gray-800"
          >
            Continue
          </button>

        </div>
      </div>
    </div>
  );
}

export default ApplicantForm;
