import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, LineChart, Line } from 'recharts';
import useApi from '../hooks/useApi';
import Loader from './Loader';
import { money } from '../utils';

const Stat = ({ label, value, sub }) => (
  <div className="col-6 col-lg-3">
    <div className="card stat-card h-100"><div className="card-body">
      <div className="text-muted small">{label}</div>
      <div className="display-6">{value}</div>
      {sub && <div className="small text-muted">{sub}</div>}
    </div></div>
  </div>
);

// Reports & analytics: KPIs, revenue tracking and occupancy forecast (scoped by role on the server)
export default function Analytics({ hotel }) {
  const params = hotel ? { hotel } : {};
  const { data: s, loading } = useApi('/reports/summary', params);
  const { data: rev } = useApi('/reports/revenue', { ...params, months: 6 });
  const { data: occ } = useApi('/reports/occupancy', { ...params, days: 14 });
  if (loading) return <Loader />;
  if (!s) return null;
  return (
    <>
      <div className="row g-3 mb-4">
        <Stat label="Occupancy now" value={`${s.occupancyNow}%`} sub={`${s.occupiedNow} of ${s.totalRooms} rooms`} />
        <Stat label="Revenue (paid)" value={money(s.revenue)} sub={`${s.paidPayments} payments`} />
        <Stat label="Total bookings" value={s.totalBookings} sub={`${s.bookingsByStatus?.confirmed || 0} confirmed · ${s.bookingsByStatus?.['checked-in'] || 0} in-house`} />
        <Stat label="Pending refunds" value={s.pendingRefunds} sub={s.users != null ? `${s.users} users` : undefined} />
      </div>
      <div className="row g-3">
        <div className="col-lg-6">
          <div className="card"><div className="card-body">
            <h6>Revenue (last 6 months)</h6>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={rev?.months || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" /><YAxis /><Tooltip formatter={(v) => money(v)} />
                <Bar dataKey="revenue" fill="#3b6ea5" />
              </BarChart>
            </ResponsiveContainer>
          </div></div>
        </div>
        <div className="col-lg-6">
          <div className="card"><div className="card-body">
            <h6>Occupancy forecast (next 14 days)</h6>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={occ?.days || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tickFormatter={(d) => d.slice(5)} /><YAxis domain={[0, 100]} unit="%" /><Tooltip />
                <Line type="monotone" dataKey="occupancy" stroke="#2e9e6b" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div></div>
        </div>
      </div>
    </>
  );
}
