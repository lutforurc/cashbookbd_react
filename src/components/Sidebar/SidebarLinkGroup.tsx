import { CSSProperties, ReactNode } from 'react';

interface SidebarLinkGroupProps {
  children: (handleClick: () => void, open: boolean) => ReactNode;
  activeCondition: boolean;
  menuId: string; // Unique ID for the menu
  open: boolean; // Controlled by parent
  handleClick: () => void; // Handler from parent
  /**
   * Carries the user's own position for this menu, as a flex `order`.
   *
   * The list is a flex column, so setting order here moves the menu without
   * moving a line of the JSX that builds it -- which is what keeps a
   * rearrangeable sidebar from turning into a rewrite of the whole file.
   */
  style?: CSSProperties;
}

const SidebarLinkGroup = ({
  children,
  activeCondition,
  menuId,
  open,
  handleClick,
  style,
}: SidebarLinkGroupProps) => {
  return <li style={style}>{children(handleClick, open)}</li>;
};

export default SidebarLinkGroup;
