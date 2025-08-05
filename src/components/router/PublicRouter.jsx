import React from 'react';
import { createBrowserRouter } from 'react-router-dom';

const PublicRouter = createBrowserRouter([
  {
    path: '/',
    element: <AuthLayout />,
    children: [
      {
        path: '/login',
        element: <Login />,
      },
    ],
  },
]);

export default PublicRouter;
