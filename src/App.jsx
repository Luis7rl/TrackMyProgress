import { BrowserRouter, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import Dashboard from './pages/Dashboard'
import Login from './pages/Login'
import Register from './pages/Register'
import WorkoutDetail from './pages/WorkoutDetail'
import WorkoutHistory from './pages/WorkoutHistory'
import WorkoutNew from './pages/WorkoutNew'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/entrenamientos/nuevo" element={<WorkoutNew />} />
            <Route path="/entrenamientos/:id" element={<WorkoutDetail />} />
            <Route path="/historial" element={<WorkoutHistory />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
