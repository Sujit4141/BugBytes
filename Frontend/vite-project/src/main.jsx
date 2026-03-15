import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router'
import HomePage from './Homepage'
import App from './App'
import Detect from './Detect'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/"       element={<HomePage />} />
        <Route path="/detect" element={<Detect/>} />
      </Routes>
    </BrowserRouter>
  </StrictMode>
)