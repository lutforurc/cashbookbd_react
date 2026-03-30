// src/pages/NoAccess.tsx
import React from "react";
import { useLocation, Link } from "react-router-dom";
import routes from "../../services/appRoutes";

export default function NoAccess() {
  const location = useLocation();
  const from = (location.state as any)?.from;
  const reason = (location.state as any)?.reason;
  const status = (location.state as any)?.status;

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4">
      <div className="w-full max-w-md rounded-lg  p-6 text-center ">
        <h1 className="text-xl font-semibold">
          {reason === "subscription" ? "Subscription Access Restricted" : "Access Denied"}
        </h1>
        <p className="mt-2 text-sm text-gray-600">
          {reason === "subscription"
            ? "Your subscription is not active for this area. Please review your plan and submit payment if needed."
            : "You do not have permission to access this page."}
        </p>
        {from && (
          <p className="mt-1 text-xs text-gray-500">
            Requested: <span className="font-medium">{from}</span>
          </p>
        )}
        {reason === "subscription" && status && (
          <p className="mt-1 text-xs text-gray-500">
            Current status: <span className="font-medium">{status}</span>
          </p>
        )}

        <div className="mt-4 flex items-center justify-center gap-4">
          <Link to="/dashboard" className="text-blue-600 hover:underline">
            Go to Dashboard
          </Link>
          {reason === "subscription" && (
            <Link to={routes.my_subscription} className="text-blue-600 hover:underline">
              My Subscription
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
