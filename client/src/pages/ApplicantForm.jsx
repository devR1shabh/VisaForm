import { useState } from "react";
import { Link, useLocation } from "react-router-dom";

function ApplicantForm() {
  const location = useLocation();
  const passportData = location.state?.passportData || {};

  const [formData, setFormData] = useState({
    fullName: passportData.fullName || "",
    passportNumber: passportData.passportNumber || "",
    nationality: passportData.nationality || "",
    dateOfBirth: passportData.dateOfBirth || "",
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4">
      <div className="bg-white p-10 rounded-3xl shadow-xl w-full max-w-2xl">

        <h1 className="text-4xl font-bold mb-8 text-center">
          Confirm Passport Details
        </h1>

        <p className="text-gray-500 text-center mb-8">
          Review the extracted details and correct anything before continuing.
        </p>

        <div className="space-y-6">

          <div>
            <label className="block mb-2 font-medium">
              Full Name
            </label>

            <input
              type="text"
              name="fullName"
              value={formData.fullName}
              onChange={handleChange}
              placeholder="Rishabh Vyas"
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
              placeholder="A1234567"
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
              placeholder="Indian"
              className="w-full border border-gray-300 rounded-xl p-3"
            />
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

          <Link
            to="/chat"
            className="block text-center bg-black text-white py-3 rounded-xl hover:bg-gray-800"
          >
            Continue
          </Link>

        </div>
      </div>
    </div>
  );
}

export default ApplicantForm;
