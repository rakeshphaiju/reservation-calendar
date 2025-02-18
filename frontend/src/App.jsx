import { Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";

export default function App() {
  return (
    <div>
      <Navbar />
      <div className="p-4">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
        </Routes>
      </div>
    </div>
  );
}

// Dummy Page Components
const Home = () => <h1 className="text-2xl">🏠 Home Page</h1>;
const About = () => <h1 className="text-2xl">📖 About Page</h1>;
const Contact = () => <h1 className="text-2xl">📞 Contact Page</h1>;
