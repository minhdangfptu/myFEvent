import * as React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { CssBaseline } from '@mui/material';
import { AuthProvider } from './contexts/AuthContext';
import AboutUs from './pages/AboutUs';
import HomePage from './pages/Normal/HomePage';   
import ErrorPage404 from './pages/Errors/ErrorPage404'; 
import ErrorPage403 from './pages/Errors/ErrorPage403';
import ErrorPage401 from './pages/Errors/ErrorPage401';
import ErrorPage502 from './pages/Errors/ErrorPage502';
import ErrorPageOffline from './pages/Errors/ErrorPageOffline';
import LandingPage from './pages/LandingPage';
import Signup0 from './pages/Signup0';
import Signup1 from './pages/Signup1';
import EmailConfirmation from './pages/EmailConfirmation';
import Events from './pages/Events';
import EventDetail from './pages/EventDetail';
import Contact from './pages/Contact';
import Login from './pages/Login';

export default function App() {
  return (
    <AuthProvider>
      <CssBaseline />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/about" element={<AboutUs />} />
          <Route path="/landingpage" element={<LandingPage />} />
          <Route path="/events" element={<Events />} />
          <Route path="/events/:id" element={<EventDetail />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup0" element={<Signup0 />} />
          <Route path="/signup1" element={<Signup1 />} />
          <Route path="/email-confirmation" element={<EmailConfirmation />} />
          <Route path="/403" element={<ErrorPage403 />} /> 
          <Route path="/401" element={<ErrorPage401 />} /> 
          <Route path="/502" element={<ErrorPage502 />} /> 
          <Route path="/off" element={<ErrorPageOffline />} /> 
          <Route path="*" element={<ErrorPage404 />} /> 
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
