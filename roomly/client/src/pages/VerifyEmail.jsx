import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../api/axios';
import { errMsg } from '../utils';

export default function VerifyEmail() {
  const { token } = useParams();
  const [state, setState] = useState({ loading: true, msg: '', ok: false });

  useEffect(() => {
    api.get(`/auth/verify/${token}`)
      .then((r) => setState({ loading: false, ok: true, msg: r.data.message }))
      .catch((e) => setState({ loading: false, ok: false, msg: errMsg(e) }));
  }, [token]);

  return (
    <div className="container py-5 text-center" style={{ maxWidth: 480 }}>
      {state.loading ? <p>Verifying...</p> : (
        <>
          <div className={`alert alert-${state.ok ? 'success' : 'danger'}`}>{state.msg}</div>
          <Link to="/login" className="btn btn-primary">Go to login</Link>
        </>
      )}
    </div>
  );
}
