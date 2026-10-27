import React from 'react';
import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="container py-5 text-center">
      <h1 className="display-4">404</h1>
      <p className="text-muted">We couldn't find that page.</p>
      <Link to="/" className="btn btn-primary">Back to home</Link>
    </div>
  );
}
