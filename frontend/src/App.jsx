import * as React from "react";
import { useState, useEffect, useCallback } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import { NotificationsProvider } from "./contexts/NotificationsContext";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { toast } from "react-toastify";
import { WifiOff } from "lucide-react";
import { useAuth } from "./contexts/AuthContext";

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
import RiskListPage from './pages/Risk/ListRiskPage';
import Notifications from './pages/User/Notifications';
import HomePage from "./pages/User/HomePage";

// Member Pages
import MemberLandingPage from "./pages/Member/MemberLandingPage";
import MemberEventDetail from "./pages/Member/MemberEventDetail";
import MemberDashBoard from "./pages/Member/MemberDashBoard";

// Error Pages
import ErrorPage404 from "./pages/Errors/ErrorPage404";
import ErrorPage403 from "./pages/Errors/ErrorPage403";
import ErrorPage401 from "./pages/Errors/ErrorPage401";
import ErrorPage502 from "./pages/Errors/ErrorPage502";
import ErrorPageOffline from "./pages/Errors/ErrorPageOffline";
import { ToastContainer } from "react-toastify";
import HoDDashBoard from "./pages/HoD/HoDDashBoard";
import HoDEventDetail from "./pages/HoD/HoDEventDetail";
import HoOCDashBoard from "./pages/HoOC/HoOCDashBoard";
import HoOCManageMember from "./pages/HoOC/HoOCManageMember";
import { EventProvider } from "./contexts/EventContext";
import MemberPage from "./pages/ManageDept&Member/MemberEvent";
import EventTaskPage from "./pages/Task/EventTaskPage";
import EventTaskDetailPage from "./pages/Task/EventTaskDetailPage";
import GanttChartTaskPage from "./pages/Task/GanttChartTaskPage";
import HoDTaskPage from "./pages/Task/HoDTaskPage";
import MemberTaskPage from "./pages/Task/MemberTaskPage";
import EventDetailPage from "./pages/User/EventDetailPage";
import MemberProfilePage from "./pages/ManageDept&Member/MemberDetail";
import EventCalendar from "./pages/Calendar/EventCalendar";
import CreateEventCalenderPage from "./pages/Calendar/CreateCalendarPage";
import CreateDepartmentCalendarPage from "./pages/Calendar/CreateDepartmentCalendarPage";
import CalendarDetail from "./pages/Calendar/CalendarDetail";
import UpdateEventCalendarPage from "./pages/Calendar/UpdateCalendarPage";

// Feedback Pages
import ManageFeedbackEventPage from "./pages/Feedback/ManageFeedbackEventPage";
import CreateFeedbackForm from "./pages/Feedback/CreateFeedbackForm";
import FeedbackSummary from "./pages/Feedback/FeedbackSummary";
import MemberFeedbackListPage from "./pages/Feedback/MemberFeedbackListPage";
import SubmitFeedbackResponsePage from "./pages/Feedback/SubmitFeedbackResponsePage";
import RiskStatistics from "./pages/Risk/RiskStatistics";
import RiskDetailPage from "./pages/Risk/RiskDetailPage";
import AgendaPage from "./pages/Agenda/AgendaPage";
import DepartmentBudgetEmpty from "./pages/Budget/DepartmentBudgetEmpty";
import CreateDepartmentBudget from "./pages/Budget/CreateDepartmentBudget";
import ViewDepartmentBudget from "./pages/Budget/ViewDepartmentBudget";
import ListBudgetsPage from "./pages/Budget/ListBudgetsPage";
import DepartmentBudgetsListPage from "./pages/Budget/DepartmentBudgetsListPage";
import ViewDeptBudgetDetailHoOC from "./pages/Budget/ViewDeptBudgetDetailHoOC";
import BudgetStatistics from "./pages/Budget/BudgetStatistics";
import MemberExpensePage from "./pages/Budget/MemberExpensePage";
import HoOCTaskStatisticPage from "./pages/HoOC/TaskStatistic/HoOCTaskStatisticPage";
import HoDTaskStatisticPage from "./pages/HoD/TaskStatistic/HoDTaskStatisticPage";
import DataExportPage from "./pages/HoOC/ExportData/DataExportPage";
import DataTemplatePage from "./pages/HoOC/ExportData/DataTemplatePage";
import DataExportPreviewModal from "./components/DataExportPreviewModal";
import AdminDashboard from "./pages/Admin/AdminDashBoard";
import { User } from "lucide-react";
import UserManagement from "./pages/Admin/UserManagement";
import EventDetailManagement from "./pages/Admin/EventDetailManagement";
import UserDetailManagement from "./pages/Admin/UserDetailManagement";
import EventManagement from "./pages/Admin/EventManagement";

// Network Warning Overlay Component
function NetworkWarningOverlay({ isVisible, onClose }) {
  if (!isVisible) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(255, 255, 255, 0.9)",
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "16px",
      }}
    >
      <WifiOff size={64} color="#ef4444" />
      <h2 style={{ color: "#ef4444", margin: 0, fontSize: "24px" }}>
        Mạng không ổn định
      </h2>
      <p style={{ color: "#6b7280", margin: 0, textAlign: "center" }}>
        Kết nối mạng đang gặp sự cố. Vui lòng kiểm tra kết nối của bạn.
      </p>
      <button
        onClick={onClose}
        style={{
          marginTop: "16px",
          padding: "10px 24px",
          backgroundColor: "#ef4444",
          color: "white",
          border: "none",
          borderRadius: "8px",
          cursor: "pointer",
          fontSize: "16px",
        }}
      >
        Đóng
      </button>
    </div>
  );
}

function RootRedirect() {
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '100vh' }}>
        <div className="spinner-border" role="status" aria-hidden="true"></div>
      </div>
    );
  }

  if (isAuthenticated) {
    if (user?.role === 'admin') {
      return <Navigate to="/admin/dashboard" replace />;
    }
    return <Navigate to="/home-page" replace />;
  }

  return <Navigate to="/landingpage" replace />;
}

export default function App() {
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const [showNetworkWarning, setShowNetworkWarning] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const toastIdRef = React.useRef(null);

  // Detect online/offline status from browser and axios network errors
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    const handleNetworkOffline = () => setIsOffline(true);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("network:offline", handleNetworkOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("network:offline", handleNetworkOffline);
    };
  }, []);

  const handleNetworkTimeout = useCallback(() => {
    // Show overlay
    setShowNetworkWarning(true);

    // Show toast for 1 minute (60000ms) with icon
    if (!toast.isActive(toastIdRef.current)) {
      toastIdRef.current = toast.warning(
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <WifiOff size={20} />
          <span>Mạng không ổn định! Vui lòng kiểm tra kết nối.</span>
        </div>,
        {
          autoClose: 60000,
          closeOnClick: false,
          pauseOnHover: true,
          draggable: false,
          toastId: "network-timeout-toast",
        }
      );
    }

    setTimeout(() => {
      setShowNetworkWarning(false);
    }, 60000);
  }, []);

  useEffect(() => {
    window.addEventListener("network:timeout", handleNetworkTimeout);
    return () => {
      window.removeEventListener("network:timeout", handleNetworkTimeout);
    };
  }, [handleNetworkTimeout]);

  const handleCloseOverlay = () => {
    setShowNetworkWarning(false);
    if (toastIdRef.current) {
      toast.dismiss(toastIdRef.current);
    }
  };

  // Show offline page when network is disconnected
  if (isOffline) {
    return <ErrorPageOffline />;
  }

  return (
    <GoogleOAuthProvider clientId={googleClientId}>
      <BrowserRouter>
        <ToastContainer position="top-right" autoClose={3000} style={{ marginTop: '60px' }}/>
        <NotificationsProvider>
          <EventProvider>
            <Routes>
              {/* Default Route */}
              <Route
                path="/"
                element={<RootRedirect />}
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
            path="/hod-dashboard" 
            element={
              <ProtectedRoute >
                <HoDDashBoard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/events/:eventId/hod-event-detail" 
            element={
              <ProtectedRoute >
                <HoDEventDetail />
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
            path="/events/:eventId/milestone-detail/:milestoneId/agenda" 
            element={
              <ProtectedRoute>
                <AgendaPage />
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
            path="/member-dashboard" 
            element={
              <ProtectedRoute>
                <MemberDashBoard />
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
            path="/events/:eventId/risks"  
            element={
              <ProtectedRoute requiredRole="user">
                <RiskListPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/events/:eventId/risks/analysis"  
            element={
              <ProtectedRoute requiredRole="user">
                <RiskStatistics />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/events/:eventId/risks/detail/:riskId"  
            element={
              <ProtectedRoute requiredRole="user">
                <RiskDetailPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="events/:eventId/tasks" 
            element={
              <ProtectedRoute requiredRole="user" requiredEventRoles={["HoOC"]}>
                <EventTaskPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="events/:eventId/hod-tasks" 
            element={
              <ProtectedRoute>
                <HoDTaskPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="events/:eventId/member-tasks" 
            element={
              <ProtectedRoute>
                <MemberTaskPage />
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
            path="events/:eventId/tasks/hod-statistic" 
            element={
              <ProtectedRoute requiredRole="user">
                <HoDTaskStatisticPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="events/:eventId/tasks/gantt" 
            element={
              <ProtectedRoute requiredRole="user">
                <GanttChartTaskPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="events/:eventId/tasks/hooc-statistic" 
            element={
              <ProtectedRoute requiredRole="user">
                <HoOCTaskStatisticPage />
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
            path="/events/:eventId/my-calendar"
            element={
              <ProtectedRoute requiredRole="user">
                <EventCalendar />
              </ProtectedRoute>
            }
          />
          <Route
            path="/events/:eventId/calendars/create-event-calendar"
            element={
              <ProtectedRoute requiredRole="user">
                <CreateEventCalenderPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/events/:eventId/departments/:departmentId/calendars/create-department-calendar"
            element={
              <ProtectedRoute requiredRole="user">
                <CreateDepartmentCalendarPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/events/:eventId/my-calendar/:calendarId"
            element={
              <ProtectedRoute requiredRole="user">
                <CalendarDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/events/:eventId/my-calendar/:calendarId/edit-event-calendar"
            element={
              <ProtectedRoute requiredRole="user">
                <UpdateEventCalendarPage />
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

          <Route 
            path="home-page/events/:eventId" 
            element={
              <ProtectedRoute requiredRole="user">
                <EventDetailPage />
              </ProtectedRoute>
            } 
          />

          {/* Feedback Routes - HoOC */}
          <Route 
            path="/events/:eventId/feedback" 
            element={
              <ProtectedRoute>
                <ManageFeedbackEventPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/events/:eventId/feedback/create" 
            element={
              <ProtectedRoute>
                <CreateFeedbackForm />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/events/:eventId/feedback/:formId/edit" 
            element={
              <ProtectedRoute>
                <CreateFeedbackForm />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/events/:eventId/feedback/:formId/summary" 
            element={
              <ProtectedRoute>
                <FeedbackSummary />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/events/:eventId/feedback/member" 
            element={
              <ProtectedRoute>
                <MemberFeedbackListPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/events/:eventId/feedback/forms/:formId/respond" 
            element={
              <ProtectedRoute>
                <SubmitFeedbackResponsePage />
              </ProtectedRoute>
            } 
          />

          {/* Budget Routes - HoD */}
          <Route 
            path="/events/:eventId/budgets/departments" 
            element={
              <ProtectedRoute>
                <DepartmentBudgetsListPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/events/:eventId/departments/:departmentId/budget/:budgetId" 
            element={
              <ProtectedRoute>
                <ViewDepartmentBudget />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/events/:eventId/departments/:departmentId/budget" 
            element={
              <ProtectedRoute>
                <ViewDepartmentBudget />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/events/:eventId/departments/:departmentId/budget/empty" 
            element={
              <ProtectedRoute>
                <DepartmentBudgetEmpty />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/events/:eventId/departments/:departmentId/budget/create" 
            element={
              <ProtectedRoute>
                <CreateDepartmentBudget />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/events/:eventId/departments/:departmentId/budget/edit" 
            element={
              <ProtectedRoute>
                <CreateDepartmentBudget />
              </ProtectedRoute>
            } 
          />

          {/* Budget Routes - HoOC */}
          <Route 
            path="/events/:eventId/budgets" 
            element={
              <ProtectedRoute requiredEventRoles={['HoOC']}>
                <ListBudgetsPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/events/:eventId/departments/:departmentId/budget/review" 
            element={
              <ProtectedRoute requiredEventRoles={['HoOC']}>
                <ViewDeptBudgetDetailHoOC />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/events/:eventId/budgets/statistics" 
            element={
              <ProtectedRoute requiredEventRoles={['HoOC']}>
                <BudgetStatistics />
              </ProtectedRoute>
            }
          />
          {/* Budget Routes - Member */}
          <Route
            path="/events/:eventId/expenses" 
            element={
              <ProtectedRoute>
                <MemberExpensePage />
              </ProtectedRoute>
            }
          />
          <Route 
            path="/events/:eventId/feedback/member" 
            element={
              <ProtectedRoute>
                <MemberFeedbackListPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/events/:eventId/feedback/forms/:formId/respond" 
            element={
              <ProtectedRoute>
                <SubmitFeedbackResponsePage />
              </ProtectedRoute>
            } 
          />

          {/* Budget Routes - HoD */}
          <Route 
            path="/events/:eventId/budgets/departments" 
            element={
              <ProtectedRoute>
                <DepartmentBudgetsListPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/events/:eventId/departments/:departmentId/budget/:budgetId" 
            element={
              <ProtectedRoute>
                <ViewDepartmentBudget />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/events/:eventId/departments/:departmentId/budget" 
            element={
              <ProtectedRoute>
                <ViewDepartmentBudget />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/events/:eventId/departments/:departmentId/budget/empty" 
            element={
              <ProtectedRoute>
                <DepartmentBudgetEmpty />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/events/:eventId/departments/:departmentId/budget/create" 
            element={
              <ProtectedRoute>
                <CreateDepartmentBudget />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/events/:eventId/departments/:departmentId/budget/edit" 
            element={
              <ProtectedRoute>
                <CreateDepartmentBudget />
              </ProtectedRoute>
            } 
          />

          {/* Budget Routes - HoOC */}
          <Route 
            path="/events/:eventId/budgets" 
            element={
              <ProtectedRoute requiredEventRoles={['HoOC']}>
                <ListBudgetsPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/events/:eventId/departments/:departmentId/budget/review" 
            element={
              <ProtectedRoute requiredEventRoles={['HoOC']}>
                <ViewDeptBudgetDetailHoOC />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/events/:eventId/budgets/statistics" 
            element={
              <ProtectedRoute requiredEventRoles={['HoOC']}>
                <BudgetStatistics />
              </ProtectedRoute>
            }
          />
          {/* Budget Routes - Member */}
          <Route
            path="/events/:eventId/expenses" 
            element={
              <ProtectedRoute>
                <MemberExpensePage />
              </ProtectedRoute>
            }
          />
          <Route 
            path="/events/:eventId/export/data" 
            element={
              <ProtectedRoute>
                <DataExportPage/>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/events/:eventId/export/templates" 
            element={
              <ProtectedRoute>
                <DataTemplatePage />
              </ProtectedRoute>
            } 
          />
          
          {/* Admin Routes */}
          <Route
            path="/admin/dashboard"
            element={
              <ProtectedRoute requiredRole="admin">
                <AdminDashboard/>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/event-management"
            element={
              <ProtectedRoute requiredRole="admin">
                <EventManagement/>
              </ProtectedRoute>
            }
          />
          <Route
            path="admin/event-management/:eventId"
            element={
              <ProtectedRoute requiredRole="admin">
                <EventDetailManagement/>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/user-management"
            element={
              <ProtectedRoute requiredRole="admin">
                <UserManagement/>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/user-management/:userId"
            element={
              <ProtectedRoute requiredRole="admin">
                <UserDetailManagement/>
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
