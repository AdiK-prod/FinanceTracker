import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import Upload from './pages/Upload'
import Tagging from './pages/Tagging'
import Dashboard from './pages/Dashboard'
import Detailed from './pages/Detailed'

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Navigate to="/upload" replace />} />
          <Route path="/upload" element={<Upload />} />
          <Route path="/tagging" element={<Tagging />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/detailed" element={<Detailed />} />
        </Routes>
      </Layout>
    </Router>
  )
}

export default App
