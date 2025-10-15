import * as React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';

// Public Pages
import LandingPage from './pages/Public/LandingPage';
import AboutUs from './pages/Public/AboutUs';
import Events from './pages/Public/Events';
import PublicEventDetail from './pages/Public/EventDetail';
import Clubs from './pages/Public/Clubs';
import Policy from './pages/Public/Policy';
import Contact from './pages/Public/Contact';

// Authentication Pages
import Login from './pages/Auth/Login';
import Signup from './pages/Auth/Signup';
import RegisterComplete from './pages/Auth/RegisterComplete';
import ForgotPassword from './pages/Auth/ForgotPassword';
import ResetPassword from './pages/Auth/ResetPassword';
import EmailConfirmation from './pages/Auth/EmailConfirmation';

// User Dashboard Pages
import UserLandingPage from './pages/User/UserLandingPage';
import UserProfile from './pages/User/UserProfile';
import UserEventDetail from './pages/User/EventDetail';
import Settings from './pages/User/Settings';
import Dashboard from './pages/User/Dashboard';
import Menber from './pages/User/Menber';
import Risk from './pages/User/Risk';
import Task from './pages/User/Task';

// Error Pages
import ErrorPage404 from './pages/Errors/ErrorPage404'; 
import ErrorPage403 from './pages/Errors/ErrorPage403';
import ErrorPage401 from './pages/Errors/ErrorPage401';
import ErrorPage502 from './pages/Errors/ErrorPage502';
import ErrorPageOffline from './pages/Errors/ErrorPageOffline';

export default function App() {
  return (
    <>
      <BrowserRouter>
        <Routes>
          {/* Default Route */}
          <Route path="/" element={<Navigate to="/landingpage" replace />} />
          
          {/* Public Routes */}
          <Route path="/landingpage" element={<LandingPage />} />
          <Route path="/about" element={<AboutUs />} />
          <Route path="/events" element={<Events />} />
          <Route path="/events/:id" element={<PublicEventDetail />} />
          <Route path="/clubs" element={<Clubs />} />
          <Route path="/policy" element={<Policy />} />
          <Route path="/contact" element={<Contact />} />
          
          {/* Authentication Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/register-complete" element={<RegisterComplete />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/email-confirmation" element={<EmailConfirmation />} />
          
          {/* Protected User Routes */}
          <Route 
            path="/user-landing-page" 
            element={
                <UserLandingPage />
            } 
          />
          <Route 
            path="/user-profile" 
            element={
                <UserProfile />
            } 
          />
          <Route 
            path="/event-detail" 
            element={
                <UserEventDetail />
            } 
          />
          
          <Route 
            path="/setting" 
            element={
                <Settings />
            } 
          />
          <Route 
            path="/dashboard" 
            element={
                <Dashboard />
            } 
          />
          <Route 
            path="/risk" 
            element={
                <Risk />
            } 
          />
          <Route 
            path="/task" 
            element={
                <Task />
            } 
          />
          <Route 
            path="/member" 
            element={
                <Menber />
            } 
          />
          
          {/* Admin Routes */}
          <Route 
            path="/admin" 
            element={
              <ProtectedRoute requiredRole="admin">
                <div>Admin Page (Replace with your component)</div>
              </ProtectedRoute>
            } 
          />
          
          {/* Error Routes */}
          <Route path="/403" element={<ErrorPage403 />} /> 
          <Route path="/401" element={<ErrorPage401 />} /> 
          <Route path="/502" element={<ErrorPage502 />} /> 
          <Route path="/off" element={<ErrorPageOffline />} /> 
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
          
          {/* 404 Route - Must be last */}
          <Route path="*" element={<ErrorPage404 />} /> 
        </Routes>
      </BrowserRouter>
    </>
  );
}
