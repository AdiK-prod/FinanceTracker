import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import Tagging from './pages/Tagging'
import Dashboard from './pages/Dashboard'
import Detailed from './pages/Detailed'
import CategoryManagement from './pages/CategoryManagement'
import Temp from './pages/Temp'
import Login from './pages/Login'
import Signup from './pages/Signup'

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route
          element={(
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          )}
        >
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/tagging" element={<Tagging />} />
          <Route path="/detailed" element={<Detailed />} />
          <Route path="/categories" element={<CategoryManagement />} />
          <Route path="/temp" element={<Temp />} />
        </Route>
      </Routes>
    </Router>
  )
}

export default App
