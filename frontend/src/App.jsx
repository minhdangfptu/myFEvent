import * as React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import { NotificationsProvider } from "./contexts/NotificationsContext";
import { GoogleOAuthProvider } from "@react-oauth/google";

// Public Pages
import LandingPage from "./pages/Public/LandingPage";
import AboutUs from "./pages/Public/AboutUs";
import Events from "./pages/Public/Events";
import PublicEventDetail from "./pages/Public/EventDetail";
import Clubs from "./pages/Public/Clubs";
import Policy from "./pages/Public/Policy";
import Contact from "./pages/Public/Contact";

// Authentication Pages
import Login from "./pages/Auth/Login";
import Signup from "./pages/Auth/Signup";
import RegisterComplete from "./pages/Auth/RegisterComplete";
import ForgotPassword from "./pages/Auth/ForgotPassword";
import ResetPassword from "./pages/Auth/ResetPassword";
import EmailConfirmation from "./pages/Auth/EmailConfirmation";

// User Pages
import UserLandingPage from './pages/User/UserLandingPage';
import HoOCLandingPage from './pages/HoOC/HoOCLandingPage';
import HoOCEventDetail from './pages/HoOC/HoOCEventDetail';
import Milestone from './pages/ManageDept&Member/Milestone';
import MilestoneDetail from './pages/ManageDept&Member/MilestoneDetail';
import HoOCEditMilestone from './pages/HoOC/HoOCEditMilestone';
import HoOCManageMilestoneEmpty from './pages/HoOC/HoOCManageMilestoneEmpty';
import Department from './pages/ManageDept&Member/Department';
import DepartmentDetail from './pages/ManageDept&Member/DepartmentDetail';
import UserProfile from './pages/User/UserProfile';
import Settings from './pages/User/Settings';
import Dashboard from './pages/User/Dashboard';
import Risk from './pages/User/Risk';
import Notifications from './pages/User/Notifications';
import HomePage from "./pages/User/HomePage";

// Member Pages
import MemberLandingPage from "./pages/Member/MemberLandingPage";
import MemberEventDetail from "./pages/Member/MemberEventDetail";

// Error Pages
import ErrorPage404 from "./pages/Errors/ErrorPage404";
import ErrorPage403 from "./pages/Errors/ErrorPage403";
import ErrorPage401 from "./pages/Errors/ErrorPage401";
import ErrorPage502 from "./pages/Errors/ErrorPage502";
import ErrorPageOffline from "./pages/Errors/ErrorPageOffline";
import { ToastContainer } from "react-toastify";
import HoDLandingPage from "./pages/HoD/HoDLandingPage";
import HoOCDashBoard from "./pages/HoOC/HoOCDashBoard";
import HoOCManageMember from "./pages/HoOC/HoOCManageMember";
import { EventProvider } from "./contexts/EventContext";
import MemberPage from "./pages/ManageDept&Member/MemberEvent";
import EventTaskPage from "./pages/Task/EventTaskPage";
import EventTaskDetailPage from "./pages/Task/EventTaskDetailPage";
import MemberProfilePage from "./pages/ManageDept&Member/MemberDetail";

export default function App() {
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  return (
    <GoogleOAuthProvider clientId={googleClientId}>
      <BrowserRouter>
        <ToastContainer position="top-right" autoClose={3000} />
        <NotificationsProvider>
          <EventProvider>
            <Routes>
              {/* Default Route */}
              <Route
                path="/"
                element={<Navigate to="/landingpage" replace />}
              />

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
              <Route
                path="/email-confirmation"
                element={<EmailConfirmation />}
              />

              {/* Protected User Routes */}
              <Route
                path="/user-landing-page"
                element={
                  <ProtectedRoute requiredRole="user">
                    <UserLandingPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/hooc-landing-page"
                element={
                  <ProtectedRoute>
                    <HoOCLandingPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/hod-landing-page"
                element={
                  <ProtectedRoute>
                    <HoDLandingPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/events/:eventId/hooc-event-detail"
                element={
                  <ProtectedRoute >
                    <HoOCEventDetail />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/hooc-dashboard"
                element={
                  <ProtectedRoute >
                    <HoOCDashBoard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/events/:eventId/milestones"
                element={
                  <ProtectedRoute>
                    <Milestone />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/events/:eventId/hooc-manage-milestone-empty"
                element={
                  <ProtectedRoute>
                    <HoOCManageMilestoneEmpty />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/events/:eventId/milestone-detail/:id"
                element={
                  <ProtectedRoute>
                    <MilestoneDetail />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/events/:eventId/hooc-edit-milestone/:id"
                element={
                  <ProtectedRoute>
                    <HoOCEditMilestone />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/events/:eventId/departments"
                element={
                  <ProtectedRoute>
                    <Department />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/events/:eventId/hooc-manage-member"
                element={
                  <ProtectedRoute>
                    <HoOCManageMember />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/events/:eventId/department-detail/:id"
                element={
                  <ProtectedRoute>
                    <DepartmentDetail />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/member-landing-page"
                element={
                  <ProtectedRoute>
                    <MemberLandingPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/member-event-detail/:eventId"
                element={
                  <ProtectedRoute>
                    <MemberEventDetail />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/user-profile"
                element={
                  <ProtectedRoute requiredRole="user">
                    <UserProfile />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/notifications"
                element={
                  <ProtectedRoute>
                    <Notifications />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/event-detail"
                element={
                  <ProtectedRoute>
                    <HoOCEventDetail />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/setting"
                element={
                  <ProtectedRoute requiredRole="user">
                    <Settings />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute requiredRole="user">
                    <Dashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/risk"
                element={
                  <ProtectedRoute requiredRole="user">
                    <Risk />
                  </ProtectedRoute>
                }
              />
              <Route
                path="events/:eventId/tasks"
                element={
                  <ProtectedRoute requiredRole="user">
                    <EventTaskPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="events/:eventId/tasks/:taskId"
                element={
                  <ProtectedRoute requiredRole="user">
                    <EventTaskDetailPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/events/:eventId/members"
                element={
                  <ProtectedRoute requiredRole="user">
                    <MemberPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/events/:eventId/members/:memberId"
                element={
                  <ProtectedRoute requiredRole="user">
                    <MemberProfilePage/>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/home-page"
                element={
                  <ProtectedRoute requiredRole="user">
                    < HomePage />
                  </ProtectedRoute>
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
              <Route path="/401" element={<ErrorPage401 />} />
              <Route path="/502" element={<ErrorPage502 />} />
              <Route path="/off" element={<ErrorPageOffline />} />
              <Route
                path="/unauthorized"
                element={
                  <ErrorPage403 />
                }
              />
              {/* 404 Route - Must be last */}
              <Route path="*" element={<ErrorPage404 />} />
            </Routes>
          </EventProvider>
        </NotificationsProvider>
      </BrowserRouter>
    </GoogleOAuthProvider>
  );
}
