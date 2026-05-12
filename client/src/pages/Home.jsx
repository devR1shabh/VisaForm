import { Link } from "react-router-dom";

function Home() {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-white p-10 rounded-2xl shadow-lg text-center max-w-lg">
        <h1 className="text-4xl font-bold mb-4">
          AI Visa Assistant
        </h1>

        <p className="text-gray-600 mb-6">
          Upload your passport and complete your visa application using AI assistance.
        </p>

        <Link
          to="/upload"
          className="bg-black text-white px-6 py-3 rounded-lg hover:bg-gray-800"
        >
          Start Application
        </Link>
      </div>
    </div>
  );
}

export default Home;