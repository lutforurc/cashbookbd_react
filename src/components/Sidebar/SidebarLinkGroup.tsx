import { ReactNode } from 'react';

interface SidebarLinkGroupProps {
  children: (handleClick: () => void, open: boolean) => ReactNode;
  activeCondition: boolean;
  menuId: string; // Unique ID for the menu
  open: boolean; // Controlled by parent
  handleClick: () => void; // Handler from parent
}

const SidebarLinkGroup = ({
  children,
  activeCondition,
  menuId,
  open,
  handleClick,
}: SidebarLinkGroupProps) => {
  return <li>{children(handleClick, open)}</li>;
};

export default SidebarLinkGroup;