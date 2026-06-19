import React from 'react';
import { Link } from 'react-router-dom';
import { RiHome4Line } from 'react-icons/ri';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
      <div className="text-center">
        <p className="text-8xl font-black text-brand-800">404</p>
        <h1 className="text-2xl font-bold text-slate-200 mt-4">Page not found</h1>
        <p className="text-slate-400 mt-2">The page you're looking for doesn't exist.</p>
        <Link to="/" className="btn-primary inline-flex mt-8">
          <RiHome4Line /> Go Home
        </Link>
      </div>
    </div>
  );
}
