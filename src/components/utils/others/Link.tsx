// Link.tsx
import React from 'react';
import { Link as RouterLink } from 'react-router-dom';

interface LinkProps {
  to: string;
  children: React.ReactNode;
  className?: string;
}

const Link: React.FC<LinkProps> = ({ to, children, className = '' }) => {
  return (
    <RouterLink
      to={to}
      className={`text-white bg-gray-700 hover:bg-blue-400 focus:outline-none font-medium rounded-sm text-sm px-5 py-1 text-center dark:hover:bg-blue-400 dark:focus:ring-black-400 inline-flex items-center  ${className || ''}`}
    >
      {children}
    </RouterLink>
  );
};

export default Link;
