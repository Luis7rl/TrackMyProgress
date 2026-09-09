import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import DeporteLayout from './components/DeporteLayout'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import Calendario from './pages/Calendario'
import Dashboard from './pages/Dashboard'
import Carrera from './pages/deporte/Carrera'
import ExerciseProgress from './pages/deporte/ExerciseProgress'
import Fisico from './pages/deporte/Fisico'
import Gimnasio from './pages/deporte/Gimnasio'
import ImportHevy from './pages/deporte/ImportHevy'
import Pasos from './pages/deporte/Pasos'
import WorkoutDetail from './pages/deporte/WorkoutDetail'
import WorkoutEdit from './pages/deporte/WorkoutEdit'
import WorkoutNew from './pages/deporte/WorkoutNew'
import Dieta from './pages/Dieta'
import Estudio from './pages/Estudio'
import Login from './pages/Login'
import Register from './pages/Register'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route path="/" element={<Dashboard />} />

            <Route path="/deporte" element={<DeporteLayout />}>
              <Route index element={<Navigate to="gimnasio" replace />} />
              <Route path="gimnasio" element={<Gimnasio />} />
              <Route path="gimnasio/nuevo" element={<WorkoutNew />} />
              <Route path="gimnasio/importar" element={<ImportHevy />} />
              <Route path="gimnasio/ejercicio/:name" element={<ExerciseProgress />} />
              <Route path="gimnasio/:id" element={<WorkoutDetail />} />
              <Route path="gimnasio/:id/editar" element={<WorkoutEdit />} />
              <Route path="carrera" element={<Carrera />} />
              <Route path="pasos" element={<Pasos />} />
              <Route path="fisico" element={<Fisico />} />
            </Route>

            <Route path="/dieta" element={<Dieta />} />
            <Route path="/estudio" element={<Estudio />} />
            <Route path="/calendario" element={<Calendario />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
