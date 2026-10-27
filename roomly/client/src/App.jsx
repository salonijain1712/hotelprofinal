import React, { Suspense, lazy, useEffect, useMemo } from 'react';
import { Routes, Route } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import { fetchMe } from './store/authSlice';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import Loader from './components/Loader';
import Home from './pages/Home';
import Rooms from './pages/Rooms';
import RoomDetails from './pages/RoomDetails';
import Login from './pages/Login';
import Register from './pages/Register';
import VerifyEmail from './pages/VerifyEmail';
import NotFound from './pages/NotFound';

// Code splitting: dashboards and the booking/payment flow load on demand
const BookingForm = lazy(() => import('./pages/BookingForm'));
const Pay = lazy(() => import('./pages/Pay'));
const GuestDashboard = lazy(() => import('./pages/GuestDashboard'));
const StaffDashboard = lazy(() => import('./pages/StaffDashboard'));
const ManagerDashboard = lazy(() => import('./pages/ManagerDashboard'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const Notifications = lazy(() => import('./pages/Notifications'));

export default function App() {
  const dispatch = useDispatch();
  const mode = useSelector((s) => s.ui.theme);
  const theme = useMemo(() => createTheme({ palette: { mode } }), [mode]);

  useEffect(() => {
    dispatch(fetchMe());
  }, [dispatch]);

  useEffect(() => {
    document.documentElement.setAttribute('data-bs-theme', mode);
    localStorage.setItem('theme', mode);
  }, [mode]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline enableColorScheme />
      <Navbar />
      <main>
        <Suspense fallback={<Loader />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/rooms" element={<Rooms />} />
            <Route path="/rooms/:id" element={<RoomDetails />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/verify/:token" element={<VerifyEmail />} />
            <Route path="/book/:roomId" element={<ProtectedRoute roles={['guest']}><BookingForm /></ProtectedRoute>} />
            <Route path="/pay/:bookingId" element={<ProtectedRoute roles={['guest']}><Pay /></ProtectedRoute>} />
            <Route path="/dashboard" element={<ProtectedRoute roles={['guest']}><GuestDashboard /></ProtectedRoute>} />
            <Route path="/staff" element={<ProtectedRoute roles={['staff', 'manager', 'admin']}><StaffDashboard /></ProtectedRoute>} />
            <Route path="/manager" element={<ProtectedRoute roles={['manager', 'admin']}><ManagerDashboard /></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute roles={['admin']}><AdminDashboard /></ProtectedRoute>} />
            <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </main>
      <footer className="text-center text-muted py-3 small border-top">&copy; {new Date().getFullYear()} Roomly Hotel Management</footer>
    </ThemeProvider>
  );
}
