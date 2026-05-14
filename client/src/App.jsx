import { useEffect } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";

import Home from "./pages/Home";
import UploadPassport from "./pages/UploadPassport";
import ChatPage from "./pages/ChatPage";
import ReviewPage from "./pages/ReviewPage";
import ApplicantForm from "./pages/ApplicantForm";
import SuccessPage from "./pages/SuccessPage";

function ScrollToRouteTarget() {
  const location = useLocation();

  useEffect(() => {
    if (!location.hash) {
      window.scrollTo({ top: 0, left: 0 });
      return;
    }

    const scrollToHashTarget = () => {
      const target = document.getElementById(location.hash.slice(1));
      target?.scrollIntoView();
    };

    window.requestAnimationFrame(scrollToHashTarget);
  }, [location.pathname, location.hash, location.key]);

  return null;
}

function App() {
  return (
    <BrowserRouter>
      <ScrollToRouteTarget />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/upload" element={<UploadPassport />} />
        <Route path="/chat" element={<ChatPage />} />
        <Route path="/review" element={<ReviewPage />} />
        <Route path="/form" element={<ApplicantForm />} />
        <Route path="/success" element={<SuccessPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
