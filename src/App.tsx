import { ProtectedRoute } from "@/components/admin/ProtectedRoute";
import { AdminDashboard } from "@/pages/admin/Dashboard";
import { AdminEvents } from "@/pages/admin/Events";
import { AdminLogin } from "@/pages/admin/Login";
import { AdminMasterclass } from "@/pages/admin/Masterclass";
import { ClerkProvider } from "@clerk/clerk-react";
import { AnimatePresence } from "framer-motion";
import { lazy, Suspense } from "react";
import {
  Route,
  BrowserRouter as Router,
  Routes,
  useLocation
} from "react-router-dom";
import Footer from "./components/Footer";
import LoadingSpinner from "./components/LoadingSpinner";
import Navigation from "./components/Navigation";
import PageTransition from "./components/PageTransition";
import { LanguageProvider } from "./lib/LanguageContext";
import AdminRegistrations from "./pages/admin/Registrations";

if (!import.meta.env.VITE_CLERK_PUBLISHABLE_KEY) {
  throw new Error("Missing Clerk publishable key");
}

// Lazy load pages
const HomePage = lazy(() => import("./pages/HomePage"));
const EventsPage = lazy(() => import("./pages/EventsPage"));
const EventDetails = lazy(() => import("./pages/EventDetails"));
const PastEventDetails = lazy(() => import("./pages/PastEventDetails"));
const MasterclassDetails = lazy(() => import("./pages/MasterclassDetails"));
const PastMasterclassDetails = lazy(
  () => import("./pages/PastMasterclassDetails")
);
const ContactPage = lazy(() => import("./pages/ContactPage"));
const AboutPage = lazy(() => import("./pages/AboutPage"));

function FooterWrapper() {
  const location = useLocation();
  // Only show footer on pages other than homepage
  return location.pathname !== "/" ? <Footer /> : null;
}

function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route
          path="/"
          element={
            <Suspense
              fallback={
                <LoadingSpinner fullScreen message="Loading homepage..." />
              }
            >
              <PageTransition>
                <HomePage />
              </PageTransition>
            </Suspense>
          }
        />
        <Route
          path="/events"
          element={
            <Suspense
              fallback={
                <LoadingSpinner fullScreen message="Loading events..." />
              }
            >
              <PageTransition>
                <EventsPage />
              </PageTransition>
            </Suspense>
          }
        />
        <Route
          path="/event/:id"
          element={
            <Suspense
              fallback={
                <LoadingSpinner fullScreen message="Loading event details..." />
              }
            >
              <PageTransition>
                <EventDetails />
              </PageTransition>
            </Suspense>
          }
        />
        <Route
          path="/past-event/:id"
          element={
            <Suspense
              fallback={
                <LoadingSpinner
                  fullScreen
                  message="Loading past event details..."
                />
              }
            >
              <PageTransition>
                <PastEventDetails />
              </PageTransition>
            </Suspense>
          }
        />
        <Route
          path="/masterclass/:id"
          element={
            <Suspense
              fallback={
                <LoadingSpinner
                  fullScreen
                  message="Loading masterclass details..."
                />
              }
            >
              <PageTransition>
                <MasterclassDetails />
              </PageTransition>
            </Suspense>
          }
        />
        <Route
          path="/past-masterclass/:id"
          element={
            <Suspense
              fallback={
                <LoadingSpinner
                  fullScreen
                  message="Loading past masterclass details..."
                />
              }
            >
              <PageTransition>
                <PastMasterclassDetails />
              </PageTransition>
            </Suspense>
          }
        />
        <Route
          path="/contact"
          element={
            <Suspense
              fallback={
                <LoadingSpinner fullScreen message="Loading contact page..." />
              }
            >
              <PageTransition>
                <ContactPage />
              </PageTransition>
            </Suspense>
          }
        />
        <Route
          path="/about"
          element={
            <Suspense
              fallback={
                <LoadingSpinner fullScreen message="Loading about page..." />
              }
            >
              <PageTransition>
                <AboutPage />
              </PageTransition>
            </Suspense>
          }
        />
        <Route path="/admin" element={<AdminLogin />} />
        <Route
          path="/admin/dashboard"
          element={
            <ProtectedRoute>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/events"
          element={
            <ProtectedRoute>
              <AdminEvents />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/registrations"
          element={
            <ProtectedRoute>
              <AdminRegistrations />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/masterclass"
          element={
            <ProtectedRoute>
              <AdminMasterclass />
            </ProtectedRoute>
          }
        />
      </Routes>
    </AnimatePresence>
  );
}

function AppContent() {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith("/admin");

  return (
    <ClerkProvider 
      publishableKey={import.meta.env.VITE_CLERK_PUBLISHABLE_KEY}
    >
      <LanguageProvider>
        <div className="min-h-screen flex flex-col bg-offWhite">
          {!isAdminRoute && <Navigation />}
          <main className="flex-1">
            <AnimatedRoutes />
          </main>
          {!isAdminRoute && <FooterWrapper />}
        </div>
      </LanguageProvider>
    </ClerkProvider>
  );
}

export default function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}
