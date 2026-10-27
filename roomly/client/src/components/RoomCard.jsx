import React from 'react';
import { Link } from 'react-router-dom';
import { Chip, Rating } from '@mui/material';
import StatusBadge from './StatusBadge';
import { money, img } from '../utils';

export default function RoomCard({ room, query = '' }) {
  return (
    <div className="card room-card h-100">
      <img src={img(room.images?.[0])} className="card-img-top" alt={`Room ${room.roomNumber}`} loading="lazy" />
      <div className="card-body d-flex flex-column">
        <div className="d-flex justify-content-between align-items-start">
          <h5 className="card-title mb-1">{room.category?.name} · Room {room.roomNumber}</h5>
          <StatusBadge status={room.status} />
        </div>
        <div className="text-muted small mb-2">{room.hotel?.name}{room.hotel?.address?.city ? `, ${room.hotel.address.city}` : ''}</div>
        {room.hotel?.ratingCount > 0 && (
          <div className="d-flex align-items-center gap-1 mb-2">
            <Rating value={room.hotel.ratingAvg} precision={0.5} size="small" readOnly />
            <span className="small text-muted">({room.hotel.ratingCount})</span>
          </div>
        )}
        <div className="mb-3">
          <Chip size="small" label={`Sleeps ${room.capacity}`} className="me-1" />
          {room.amenities?.slice(0, 2).map((a) => <Chip key={a} size="small" variant="outlined" label={a} className="me-1" />)}
        </div>
        <div className="mt-auto d-flex justify-content-between align-items-center">
          <div><span className="fs-5 fw-bold">{money(room.price)}</span> <span className="text-muted small">/ night</span></div>
          <Link to={`/rooms/${room._id}${query}`} className="btn btn-primary btn-sm">View</Link>
        </div>
      </div>
    </div>
  );
}
