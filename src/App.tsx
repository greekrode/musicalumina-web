import { ProtectedRoute } from "@/components/admin/ProtectedRoute";
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
import ScrollToTop from "./components/ScrollToTop";
import { LanguageProvider } from "./lib/LanguageContext";
import { Toaster } from "@/components/ui/toaster";

if (!import.meta.env.VITE_CLERK_PUBLISHABLE_KEY) {
  throw new Error("Missing Clerk publishable key");
}

/* Public routes — lazy-loaded. */
const HomePage = lazy(() => import("./pages/HomePage"));
const EventsPage = lazy(() => import("./pages/EventsPage"));
const EventDetails = lazy(() => import("./pages/EventDetails"));
const PastEventDetails = lazy(() => import("./pages/PastEventDetails"));
const MasterclassDetails = lazy(() => import("./pages/MasterclassDetails"));
const PastMasterclassDetails = lazy(
  () => import("./pages/PastMasterclassDetails")
);
const GroupClassDetails = lazy(() => import("./pages/GroupClassDetails"));
const ContactPage = lazy(() => import("./pages/ContactPage"));
const AboutPage = lazy(() => import("./pages/AboutPage"));
const PartnersPage = lazy(() => import("./pages/PartnersPage"));
const VideoSubmissionPage = lazy(() => import("./pages/VideoSubmissionPage"));

/* Admin routes — lazy-loaded so their TinyMCE / dense-form weight never
   reaches the public bundle. Every admin page is behind a Clerk-guarded
   Suspense boundary, and TinyMCE (~500KB) only loads when an admin opens a
   modal that uses it. */
const AdminLogin = lazy(() =>
  import("./pages/admin/Login").then((m) => ({ default: m.AdminLogin }))
);
const AdminDashboard = lazy(() =>
  import("./pages/admin/Dashboard").then((m) => ({ default: m.AdminDashboard }))
);
const AdminEvents = lazy(() =>
  import("./pages/admin/Events").then((m) => ({ default: m.AdminEvents }))
);
const AdminMasterclass = lazy(() =>
  import("./pages/admin/Masterclass").then((m) => ({
    default: m.AdminMasterclass,
  }))
);
const AdminJury = lazy(() =>
  import("./pages/admin/Jury").then((m) => ({ default: m.AdminJury }))
);
const AdminRegistrations = lazy(() => import("./pages/admin/Registrations"));
const AdminEventCategories = lazy(
  () => import("./pages/admin/EventCategories")
);

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
          path="/group-class/:id"
          element={
            <Suspense
              fallback={
                <LoadingSpinner
                  fullScreen
                  message="Loading group class details..."
                />
              }
            >
              <PageTransition>
                <GroupClassDetails />
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
        <Route
          path="/partners"
          element={
            <Suspense
              fallback={
                <LoadingSpinner
                  fullScreen
                  message="Loading partners page..."
                />
              }
            >
              <PageTransition>
                <PartnersPage />
              </PageTransition>
            </Suspense>
          }
        />
        <Route
          path="/video-submission"
          element={
            <Suspense
              fallback={
                <LoadingSpinner fullScreen message="Loading video submission..." />
              }
            >
              <PageTransition>
                <VideoSubmissionPage />
              </PageTransition>
            </Suspense>
          }
        />
        <Route
          path="/admin"
          element={
            <Suspense
              fallback={<LoadingSpinner fullScreen message="Loading admin…" />}
            >
              <AdminLogin />
            </Suspense>
          }
        />
        <Route
          path="/admin/dashboard"
          element={
            <Suspense
              fallback={<LoadingSpinner fullScreen message="Loading admin…" />}
            >
              <ProtectedRoute>
                <AdminDashboard />
              </ProtectedRoute>
            </Suspense>
          }
        />
        <Route
          path="/admin/events"
          element={
            <Suspense
              fallback={<LoadingSpinner fullScreen message="Loading admin…" />}
            >
              <ProtectedRoute>
                <AdminEvents />
              </ProtectedRoute>
            </Suspense>
          }
        />
        <Route
          path="/admin/event-categories"
          element={
            <Suspense
              fallback={<LoadingSpinner fullScreen message="Loading admin…" />}
            >
              <ProtectedRoute>
                <AdminEventCategories />
              </ProtectedRoute>
            </Suspense>
          }
        />
        <Route
          path="/admin/jury"
          element={
            <Suspense
              fallback={<LoadingSpinner fullScreen message="Loading admin…" />}
            >
              <ProtectedRoute>
                <AdminJury />
              </ProtectedRoute>
            </Suspense>
          }
        />
        <Route
          path="/admin/registrations"
          element={
            <Suspense
              fallback={<LoadingSpinner fullScreen message="Loading admin…" />}
            >
              <ProtectedRoute>
                <AdminRegistrations />
              </ProtectedRoute>
            </Suspense>
          }
        />
        <Route
          path="/admin/masterclass"
          element={
            <Suspense
              fallback={<LoadingSpinner fullScreen message="Loading admin…" />}
            >
              <ProtectedRoute>
                <AdminMasterclass />
              </ProtectedRoute>
            </Suspense>
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
        <ScrollToTop />
        <div className="min-h-screen flex flex-col bg-offWhite">
          {!isAdminRoute && <Navigation />}
          <main className="flex-1">
            <AnimatedRoutes />
          </main>
          {!isAdminRoute && <FooterWrapper />}
          <Toaster />
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
