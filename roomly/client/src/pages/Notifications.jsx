import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../api/axios';
import useApi from '../hooks/useApi';
import Loader from '../components/Loader';
import Pagination from '../components/Pagination';
import { errMsg } from '../utils';

export default function Notifications() {
  const [page, setPage] = useState(1);
  const { data, loading, reload } = useApi('/notifications', { page, limit: 15 });
  const run = async (fn) => { try { await fn(); reload(); } catch (e) { toast.error(errMsg(e)); } };

  return (
    <div className="container py-4" style={{ maxWidth: 760 }}>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2 className="mb-0">Notifications {data?.unread > 0 && <span className="badge text-bg-danger fs-6">{data.unread} new</span>}</h2>
        {data?.unread > 0 && <button className="btn btn-sm btn-outline-secondary" onClick={() => run(() => api.patch('/notifications/read-all'))}>Mark all read</button>}
      </div>
      {loading ? <Loader /> : data?.notifications?.length ? (
        <ul className="list-group">
          {data.notifications.map((n) => (
            <li key={n._id} className={`list-group-item d-flex justify-content-between align-items-start ${n.read ? '' : 'list-group-item-primary'}`}>
              <div>
                <div className="fw-semibold">{n.title}</div>
                <div className="small">{n.message}</div>
                <div className="small text-muted">{new Date(n.createdAt).toLocaleString()}</div>
                {n.link && <Link to={n.link} className="small">Open</Link>}
              </div>
              <div className="d-flex gap-1">
                {!n.read && <button className="btn btn-sm btn-outline-primary" onClick={() => run(() => api.patch(`/notifications/${n._id}/read`))}>Read</button>}
                <button className="btn btn-sm btn-outline-danger" aria-label="Delete notification" onClick={() => run(() => api.delete(`/notifications/${n._id}`))}>✕</button>
              </div>
            </li>
          ))}
        </ul>
      ) : <p className="text-muted">You're all caught up.</p>}
      <Pagination page={page} pages={data?.pages} onChange={setPage} />
    </div>
  );
}
