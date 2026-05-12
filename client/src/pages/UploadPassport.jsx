import { useState } from "react";
import { Link } from "react-router-dom";

function UploadPassport() {
  const [image, setImage] = useState(null);

  const handleImageChange = (e) => {
    const file = e.target.files[0];

    if (file) {
      setImage(URL.createObjectURL(file));
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

        {image && (
          <div className="mt-8">
            <h2 className="text-xl font-semibold mb-4">
              Preview
            </h2>

            <img
              src={image}
              alt="Passport Preview"
              className="rounded-2xl shadow-md w-full"
            />

            <Link 
            to="/form"
            className="block w-full text-center mt-6 bg-black text-white py-3 rounded-xl hover:bg-gray-800"
            >
            Extract Details
            </Link>

          </div>
        )}

      </div>
    </div>
  );
}

export default UploadPassport;