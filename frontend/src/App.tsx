import { BrowserRouter, Routes, Route } from 'react-router-dom'
import HomePage from './pages/HomePage'
import ChapterPage from './pages/ChapterPage'
import SetupPage from './pages/SetupPage'
import LoginPage from './pages/LoginPage'
import Navbar from './components/Navbar'

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-950 text-gray-100">
        <Navbar />
        <main className="max-w-6xl mx-auto px-4 py-8">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/chapter/:slug" element={<ChapterPage />} />
            <Route path="/setup" element={<SetupPage />} />
            <Route path="/login" element={<LoginPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}
