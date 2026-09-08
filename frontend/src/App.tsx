import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import HomePage from './pages/HomePage'
import ChapterPage from './pages/ChapterPage'
import SetupPage from './pages/SetupPage'
import Navbar from './components/Navbar'

export default function App() {
  return <BrowserRouter><Navbar /><main><Routes>
    <Route path="/" element={<HomePage />} />
    <Route path="/chapter/:slug" element={<ChapterPage />} />
    <Route path="/setup" element={<SetupPage />} />
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes></main></BrowserRouter>
}
