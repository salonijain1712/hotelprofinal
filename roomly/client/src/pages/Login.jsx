import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import { login, clearError } from '../store/authSlice';
import { dashboardPath } from '../utils';

export default function Login() {
  const [f, setF] = useState({ email: '', password: '' });
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading, error } = useSelector((s) => s.auth);

  useEffect(() => { dispatch(clearError()); }, [dispatch]);
  useEffect(() => {
    if (user) navigate(location.state?.from || dashboardPath(user.role), { replace: true });
  }, [user, navigate, location.state]);

  const submit = async (e) => {
    e.preventDefault();
    const r = await dispatch(login(f));
    if (login.rejected.match(r)) toast.error(r.payload || 'Login failed');
  };

  return (
    <div className="container py-5" style={{ maxWidth: 440 }}>
      <h2 className="mb-3">Welcome back</h2>
      <form onSubmit={submit} className="card card-body">
        {error && <div className="alert alert-danger py-2">{error}</div>}
        <label className="form-label">Email</label>
        <input type="email" className="form-control mb-3" required autoComplete="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
        <label className="form-label">Password</label>
        <input type="password" className="form-control mb-3" required autoComplete="current-password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} />
        <button className="btn btn-primary" disabled={loading}>{loading ? 'Signing in...' : 'Login'}</button>
        <div className="mt-3 small text-center">New here? <Link to="/register">Create an account</Link></div>
      </form>
    </div>
  );
}
