import React from 'react';

export default function Pagination({ page, pages, onChange }) {
  if (!pages || pages <= 1) return null;
  return (
    <nav aria-label="Pagination">
      <ul className="pagination justify-content-center my-3">
        <li className={`page-item ${page <= 1 ? 'disabled' : ''}`}>
          <button className="page-link" onClick={() => onChange(page - 1)}>Previous</button>
        </li>
        <li className="page-item disabled"><span className="page-link">Page {page} of {pages}</span></li>
        <li className={`page-item ${page >= pages ? 'disabled' : ''}`}>
          <button className="page-link" onClick={() => onChange(page + 1)}>Next</button>
        </li>
      </ul>
    </nav>
  );
}
