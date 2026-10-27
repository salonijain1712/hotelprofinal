import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import { register, clearError } from '../store/authSlice';

export default function Register() {
  const [f, setF] = useState({ name: '', email: '', phone: '', password: '' });
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user, loading, error } = useSelector((s) => s.auth);

  useEffect(() => { dispatch(clearError()); }, [dispatch]);
  useEffect(() => { if (user) navigate('/dashboard', { replace: true }); }, [user, navigate]);

  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const submit = async (e) => {
    e.preventDefault();
    const r = await dispatch(register(f));
    if (register.fulfilled.match(r)) toast.success('Account created. Check your email to verify it.');
  };

  return (
    <div className="container py-5" style={{ maxWidth: 440 }}>
      <h2 className="mb-3">Create your account</h2>
      <form onSubmit={submit} className="card card-body">
        {error && <div className="alert alert-danger py-2">{error}</div>}
        <label className="form-label">Full name</label>
        <input className="form-control mb-3" required value={f.name} onChange={set('name')} autoComplete="name" />
        <label className="form-label">Email</label>
        <input type="email" className="form-control mb-3" required value={f.email} onChange={set('email')} autoComplete="email" />
        <label className="form-label">Phone (optional)</label>
        <input className="form-control mb-3" value={f.phone} onChange={set('phone')} autoComplete="tel" />
        <label className="form-label">Password</label>
        <input type="password" minLength={8} className="form-control mb-1" required value={f.password} onChange={set('password')} autoComplete="new-password" />
        <div className="form-text mb-3">At least 8 characters.</div>
        <button className="btn btn-primary" disabled={loading}>{loading ? 'Creating...' : 'Sign up'}</button>
        <div className="mt-3 small text-center">Already registered? <Link to="/login">Login</Link></div>
      </form>
    </div>
  );
}
