import Sidebar from './Sidebar';

const noop = () => {};

const TopbarMenu = () => {
  return <Sidebar sidebarOpen={false} setSidebarOpen={noop} mode="topbar" />;
};

export default TopbarMenu;
