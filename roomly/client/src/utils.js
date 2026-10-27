const PLACEHOLDER =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400"><rect width="100%" height="100%" fill="#dfe6ee"/><text x="50%" y="50%" fill="#7b8794" font-family="Arial" font-size="28" text-anchor="middle" dominant-baseline="middle">Roomly</text></svg>'
  );

export const money = (n) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: import.meta.env.VITE_CURRENCY || 'INR', maximumFractionDigits: 0 }).format(n || 0);

export const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }) : '');

export const img = (p) => (!p ? PLACEHOLDER : p.startsWith('http') ? p : (import.meta.env.VITE_ASSET_URL || '') + p);

export const errMsg = (e) => e?.response?.data?.message || e?.message || 'Something went wrong';

export const toISO = (d) => d.toISOString().slice(0, 10);
export const todayISO = () => toISO(new Date());
export const addDaysISO = (iso, n) => {
  const d = new Date(iso);
  d.setUTCDate(d.getUTCDate() + n);
  return toISO(d);
};

export const STATUS_COLORS = {
  pending: 'warning',
  confirmed: 'primary',
  'checked-in': 'success',
  'checked-out': 'secondary',
  cancelled: 'danger',
  unpaid: 'warning',
  paid: 'success',
  refunded: 'info',
  available: 'success',
  occupied: 'primary',
  cleaning: 'warning',
  maintenance: 'danger',
  open: 'warning',
  'in-progress': 'info',
  done: 'success',
  requested: 'warning',
  processed: 'success',
  rejected: 'danger',
};

export const dashboardPath = (role) => ({ guest: '/dashboard', staff: '/staff', manager: '/manager', admin: '/admin' }[role] || '/');
