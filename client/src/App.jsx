import { BrowserRouter, Routes, Route } from "react-router-dom";

import Home from "./pages/Home";
import UploadPassport from "./pages/UploadPassport";
import ChatPage from "./pages/ChatPage";
import ReviewPage from "./pages/ReviewPage";
import ApplicantForm from "./pages/ApplicantForm";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/upload" element={<UploadPassport />} />
        <Route path="/chat" element={<ChatPage />} />
        <Route path="/review" element={<ReviewPage />} />
        <Route path="/form" element={<ApplicantForm />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;