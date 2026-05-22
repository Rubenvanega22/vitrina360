import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import VehiclePage from './pages/VehiclePage.jsx'
import PropertyPage from './pages/PropertyPage.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/vehiculo/:id" element={<VehiclePage />} />
        <Route path="/propiedad/:id" element={<PropertyPage />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
