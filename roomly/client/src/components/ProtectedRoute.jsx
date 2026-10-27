import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import Loader from './Loader';
import { dashboardPath } from '../utils';

export default function ProtectedRoute({ roles, children }) {
  const { user, ready } = useSelector((s) => s.auth);
  const location = useLocation();
  if (!ready) return <Loader />;
  if (!user) return <Navigate to="/login" state={{ from: location.pathname + location.search }} replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to={dashboardPath(user.role)} replace />;
  return children;
}
