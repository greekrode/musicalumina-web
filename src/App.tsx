import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import Navigation from './components/Navigation';
import Footer from './components/Footer';
import LoadingSpinner from './components/LoadingSpinner';
import PageTransition from './components/PageTransition';

// Lazy load pages
const HomePage = lazy(() => import('./pages/HomePage'));
const EventsPage = lazy(() => import('./pages/EventsPage'));
const EventDetails = lazy(() => import('./pages/EventDetails'));
const PastEventDetails = lazy(() => import('./pages/PastEventDetails'));
const ContactPage = lazy(() => import('./pages/ContactPage'));
const AboutPage = lazy(() => import('./pages/AboutPage'));

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}

function FooterWrapper() {
  const location = useLocation();
  // Only show footer on pages other than homepage
  return location.pathname !== '/' ? <Footer /> : null;
}

function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route 
          path="/" 
          element={
            <Suspense fallback={<LoadingSpinner fullScreen message="Loading homepage..." />}>
              <PageTransition>
                <HomePage />
              </PageTransition>
            </Suspense>
          } 
        />
        <Route 
          path="/events" 
          element={
            <Suspense fallback={<LoadingSpinner fullScreen message="Loading events..." />}>
              <PageTransition>
                <EventsPage />
              </PageTransition>
            </Suspense>
          } 
        />
        <Route 
          path="/event/:id" 
          element={
            <Suspense fallback={<LoadingSpinner fullScreen message="Loading event details..." />}>
              <PageTransition>
                <EventDetails />
              </PageTransition>
            </Suspense>
          } 
        />
        <Route 
          path="/past-event/:id" 
          element={
            <Suspense fallback={<LoadingSpinner fullScreen message="Loading past event details..." />}>
              <PageTransition>
                <PastEventDetails />
              </PageTransition>
            </Suspense>
          } 
        />
        <Route 
          path="/contact" 
          element={
            <Suspense fallback={<LoadingSpinner fullScreen message="Loading contact page..." />}>
              <PageTransition>
                <ContactPage />
              </PageTransition>
            </Suspense>
          } 
        />
        <Route 
          path="/about" 
          element={
            <Suspense fallback={<LoadingSpinner fullScreen message="Loading about page..." />}>
              <PageTransition>
                <AboutPage />
              </PageTransition>
            </Suspense>
          } 
        />
      </Routes>
    </AnimatePresence>
  );
}

function App() {
  return (
    <Router>
      <ScrollToTop />
      <div className="min-h-screen flex flex-col bg-offWhite">
        <Navigation />
        <main className="flex-grow">
          <AnimatedRoutes />
        </main>
        <FooterWrapper />
      </div>
    </Router>
  );
}

export default App;