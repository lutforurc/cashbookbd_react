// src/pages/NoAccess.tsx
import React from "react";
import { useLocation, Link } from "react-router-dom";

export default function NoAccess() {
  const location = useLocation();
  const from = (location.state as any)?.from;

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold">Access Denied</h1>
      <p className="mt-2 text-sm text-gray-600">
        You do not have permission to access this page.
      </p>
      {from && (
        <p className="mt-1 text-xs text-gray-500">
          Requested: <span className="font-medium">{from}</span>
        </p>
      )}

      <div className="mt-4">
        <Link to="/dashboard" className="text-blue-600 hover:underline">
          Go to Dashboard
        </Link>
      </div>
    </div>
  );
}
