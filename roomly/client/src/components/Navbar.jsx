import React from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '../store/authSlice';
import { toggleTheme } from '../store/uiSlice';
import useApi from '../hooks/useApi';
import { dashboardPath } from '../utils';

export default function Navbar() {
  const { user } = useSelector((s) => s.auth);
  const theme = useSelector((s) => s.ui.theme);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { data } = useApi('/notifications', { limit: 1 }, { interval: 30000, skip: !user });
  const unread = data?.unread || 0;

  const onLogout = () => {
    dispatch(logout());
    navigate('/');
  };

  return (
    <nav className="navbar navbar-expand-lg bg-body-tertiary border-bottom sticky-top">
      <div className="container">
        <Link className="navbar-brand fw-bold" to="/">🏨 Roomly</Link>
        <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#nav" aria-label="Toggle navigation">
          <span className="navbar-toggler-icon" />
        </button>
        <div className="collapse navbar-collapse" id="nav">
          <ul className="navbar-nav me-auto">
            <li className="nav-item"><NavLink className="nav-link" to="/rooms">Rooms</NavLink></li>
            {user && <li className="nav-item"><NavLink className="nav-link" to={dashboardPath(user.role)}>Dashboard</NavLink></li>}
            {user && ['manager', 'admin'].includes(user.role) && <li className="nav-item"><NavLink className="nav-link" to="/staff">Front desk</NavLink></li>}
          </ul>
          <div className="d-flex align-items-center gap-2">
            <button className="btn btn-outline-secondary btn-sm" onClick={() => dispatch(toggleTheme())} aria-label="Toggle theme">
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>
            {user ? (
              <>
                <Link to="/notifications" className="btn btn-outline-secondary btn-sm position-relative" aria-label="Notifications">
                  🔔
                  {unread > 0 && <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger">{unread}</span>}
                </Link>
                <span className="small text-muted d-none d-md-inline">{user.name} <span className="badge text-bg-secondary">{user.role}</span></span>
                <button className="btn btn-sm btn-outline-danger" onClick={onLogout}>Logout</button>
              </>
            ) : (
              <>
                <Link className="btn btn-sm btn-outline-primary" to="/login">Login</Link>
                <Link className="btn btn-sm btn-primary" to="/register">Sign up</Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
