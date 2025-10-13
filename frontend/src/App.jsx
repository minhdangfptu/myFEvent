import * as React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import Signup from './pages/Signup';
import AboutUs from './pages/AboutUs';
import ErrorPage404 from './pages/Errors/ErrorPage404'; 
import ErrorPage403 from './pages/Errors/ErrorPage403';
import ErrorPage401 from './pages/Errors/ErrorPage401';
import ErrorPage502 from './pages/Errors/ErrorPage502';
import ErrorPageOffline from './pages/Errors/ErrorPageOffline';
import LandingPage from './pages/LandingPage';
import Clubs from './pages/Clubs';
import Policy from './pages/Policy';
import EmailConfirmation from './pages/EmailConfirmation';
import Events from './pages/Events';
import EventDetail from './pages/EventDetail';
import Contact from './pages/Contact';
import Login from './pages/Login';

export default function App() {
  return (
    <>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/landingpage" replace />} />
          <Route path="/about" element={<AboutUs />} />
          <Route path="/landingpage" element={<LandingPage />} />
          <Route path="/events" element={<Events />} />
          <Route path="/events/:id" element={<EventDetail />} />
          <Route path="/clubs" element={<Clubs />} />
          <Route path="/policy" element={<Policy />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/email-confirmation" element={<EmailConfirmation />} />
          <Route path="/403" element={<ErrorPage403 />} /> 
          <Route path="/401" element={<ErrorPage401 />} /> 
          <Route path="/502" element={<ErrorPage502 />} /> 
          <Route path="/off" element={<ErrorPageOffline />} /> 

          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                <div>Dashboard (Replace with your component)</div>
              </ProtectedRoute>
            } 
          />

          <Route 
            path="/admin" 
            element={
              <ProtectedRoute requiredRole="admin">
                <div>Admin Page (Replace with your component)</div>
              </ProtectedRoute>
            } 
          />

          <Route 
            path="/unauthorized" 
            element={
              <div style={{ 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center', 
                height: '100vh',
                flexDirection: 'column'
              }}>
                <h1>403 - Unauthorized</h1>
                <p>You don't have permission to access this page.</p>
              </div>
            } 
          />
          <Route path="*" element={<ErrorPage404 />} /> 
        </Routes>
      </BrowserRouter>
    </>
  );
}
