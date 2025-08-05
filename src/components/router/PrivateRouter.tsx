import React from 'react';


interface DefaultLayoutProps {
  isLoggedIn: boolean;
  isLoading: boolean;
  user: any; // You can specify the type of user more precisely, if known
}

const PrivateRouter: React.FC<DefaultLayoutProps> = ({ isLoggedIn, isLoading, user }) => {
  return <div>{isLoggedIn}</div>;
};

export default PrivateRouter;
