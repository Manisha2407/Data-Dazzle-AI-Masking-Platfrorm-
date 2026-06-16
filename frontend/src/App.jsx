import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ProtectedRoute from "./components/ProtectedRoute";
import { RedactProvider } from "./context/RedactContext";
import ResultPopup from "./components/ResultPopup";
import Documents from "./pages/Documents";
import Settings from "./pages/Settings";
import Search from "./pages/Search";
import Analytics from "./pages/Analytics";

function App() {
  return (
    <RedactProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/dash" element={
            <ProtectedRoute> <Dashboard /> </ProtectedRoute>
            }
          />
          <Route path="/documents" element={
            <ProtectedRoute> <Documents /> </ProtectedRoute>
          }
         />
          <Route path="/settings" element={
            <ProtectedRoute> <Settings /> </ProtectedRoute>
          }
         />
          <Route path="/search" element={
            <ProtectedRoute> <Search /> </ProtectedRoute>
            }
          />
          <Route path="/analytics" element={
            <ProtectedRoute> <Analytics /> </ProtectedRoute>
            }
          />
        </Routes>

        <ResultPopup />
      </BrowserRouter>
    </RedactProvider>
  );
}

export default App;