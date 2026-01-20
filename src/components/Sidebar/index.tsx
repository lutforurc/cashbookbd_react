import React, { useEffect, useRef, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import SidebarLinkGroup from './SidebarLinkGroup';
import Logo from '../../images/logo/logo.svg';
import {
  FiActivity,
  FiBarChart2,
  FiBook,
  FiClipboard,
  FiGrid,
  FiHome,
  FiLayers,
  FiPieChart,
  FiServer,
  FiShoppingCart,
  FiTrendingUp,
  FiUsers,
} from 'react-icons/fi';
import { FaBluetooth, FaGear, FaRegStar } from 'react-icons/fa6';
import { hasPermission } from '../utils/permissionChecker';
import { useSelector } from 'react-redux';
import './Sidebar.css';
import routes from '../services/appRoutes';

interface SidebarProps {
  sidebarOpen: boolean;
  setSidebarOpen: (arg: boolean) => void;
}

const Sidebar = ({ sidebarOpen, setSidebarOpen }: SidebarProps) => {
  const location = useLocation();
  const { pathname } = location;
  const [permissions, setPermissions] = useState<any>([]);
  const settings = useSelector((s: any) => s.settings);
  const currentBranch = useSelector((s: any) => s.branchList.currentBranch);
  const trigger = useRef<any>(null);
  const sidebar = useRef<any>(null);

  const storedSidebarExpanded = localStorage.getItem('sidebar-expanded');
  const [sidebarExpanded, setSidebarExpanded] = useState(
    storedSidebarExpanded === null ? false : storedSidebarExpanded === 'true',
  );

  // State to track which menu is open (null means no menu is open)
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  // Handler to toggle menu
  const handleMenuClick = (menuId: string) => {
    setOpenMenu(openMenu === menuId ? null : menuId); // Toggle the clicked menu, close others
  };



  useEffect(() => {
    setPermissions(settings.data.permissions);
  }, [settings.data.permissions]);

  useEffect(() => {
    const clickHandler = ({ target }: MouseEvent) => {
      if (!sidebar.current || !trigger.current) return;
      if (
        !sidebarOpen ||
        sidebar.current.contains(target) ||
        trigger.current.contains(target)
      )
        return;
      setSidebarOpen(false);
    };
    document.addEventListener('click', clickHandler);
    return () => document.removeEventListener('click', clickHandler);
  });

  useEffect(() => {
    const keyHandler = ({ keyCode }: KeyboardEvent) => {
      if (!sidebarOpen || keyCode !== 27) return;
      setSidebarOpen(false);
    };
    document.addEventListener('keydown', keyHandler);
    return () => document.removeEventListener('keydown', keyHandler);
  });

  useEffect(() => {
    localStorage.setItem('sidebar-expanded', sidebarExpanded.toString());
    if (sidebarExpanded) {
      document.querySelector('body')?.classList.add('sidebar-expanded');
    } else {
      document.querySelector('body')?.classList.remove('sidebar-expanded');
    }
  }, [sidebarExpanded]);

  return (
    <aside
      ref={sidebar}
      className={`absolute left-0 top-0 z-9999 flex h-screen w-72.5 flex-col overflow-y-hidden duration-300 ease-linear bg-white dark:bg-boxdark lg:static lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
    >
      <div className="flex items-center justify-between gap-2 px-6 py-3 lg:py-3">
        <NavLink to="/">{/* <img src={Logo} alt="Logo" /> */}</NavLink>
        <button
          ref={trigger}
          onClick={() => setSidebarOpen(!sidebarOpen)}
          aria-controls="sidebar"
          aria-expanded={sidebarOpen}
          className="block lg:hidden"
        >
          <svg
            className="fill-current"
            width="20"
            height="18"
            viewBox="0 0 20 18"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M19 8.175H2.98748L9.36248 1.6875C9.69998 1.35 9.69998 0.825 9.36248 0.4875C9.02498 0.15 8.49998 0.15 8.16248 0.4875L0.399976 8.3625C0.0624756 8.7 0.0624756 9.225 0.399976 9.5625L8.16248 17.4375C8.31248 17.5875 8.53748 17.7 8.76248 17.7C8.98748 17.7 9.17498 17.625 9.36248 17.475C9.69998 17.1375 9.69998 16.6125 9.36248 16.275L3.02498 9.8625H19C19.45 9.8625 19.825 9.4875 19.825 9.0375C19.825 8.55 19.45 8.175 19 8.175Z"
              fill=""
            />
          </svg>
        </button>
      </div>

      <div className="no-scrollbar flex flex-col overflow-y-auto duration-300 ease-linear">
        <nav className="mt-5 py-2 px-4 lg:mt-1 lg:px-6">
          <div>
            <ul className="flex flex-col gap-1.5">
              {/* Dashboard */}
              <SidebarLinkGroup
                activeCondition={
                  pathname === '/dashboard' || pathname.includes('dashboard')
                }
                menuId="dashboard"
                open={openMenu === 'dashboard'}
                handleClick={() => handleMenuClick('dashboard')}
              >
                {(handleClick, open) => (
                  <React.Fragment>
                    <NavLink
                      to="/dashboard"
                      className={`group relative flex items-center gap-2.5 rounded-sm px-4 py-2 font-medium dark:text-bodydark1 duration-300 ease-in-out hover:bg-gray-300 dark:hover:bg-meta-4 ${(pathname === '/' || pathname.includes('dashboard')) && 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white border-l-4 border-blue-500'}`}
                      onClick={(e) => {
                        // e.preventDefault();
                        sidebarExpanded
                          ? handleClick()
                          : setSidebarExpanded(true);
                      }}
                    >
                      <FiGrid />
                      Dashboard
                    </NavLink>
                    {/* <div
                      className={`translate transform overflow-hidden transition-all duration-300 ease-in-out ${open ? 'max-h-96' : 'max-h-0'
                        }`}
                    >
                      <ul className="mt-4 mb-5.5 flex flex-col gap-2.5 pl-6">
                        <li>
                          <NavLink
                            to="/dashboard"
                            className={({ isActive }) =>
                              'group relative flex items-center gap-2.5 rounded-md px-4 font-medium  duration-300 ease-in-out hover:text-gray-900 dark:hover:text-white ' +
                              (isActive && 'text-gray-900 font-bold dark:text-white')
                            }
                          >
                            Dashboard
                          </NavLink>
                        </li>
                      </ul>
                    </div> */}
                  </React.Fragment>
                )}
              </SidebarLinkGroup>

              {/* Transaction */}
              <SidebarLinkGroup
                activeCondition={
                  pathname === '/accounts/cash/receive' ||
                  pathname === '/accounts/cash/payment' ||
                  pathname === '/accounts/bank/receive' ||
                  pathname === '/accounts/bank/payment' ||
                  pathname === '/accounts/journal' ||
                  pathname.includes('forms')
                }
                menuId="transaction"
                open={openMenu === 'transaction'}
                handleClick={() => handleMenuClick('transaction')}
              >
                {(handleClick, open) => (
                  <React.Fragment>
                    <NavLink
                      to="#"
                      className={`group relative flex items-center gap-2.5 rounded-sm py-2 px-4 font-medium dark:text-bodydark1 duration-300 ease-in-out hover:bg-gray-300 dark:hover:bg-meta-4 ${(pathname === '/accounts/cash/receive' ||
                        pathname === '/accounts/cash/payment' ||
                        pathname === '/admin/installment-details' ||
                        pathname === '/accounts/bank/receive' ||
                        pathname === '/accounts/bank/payment' ||
                        pathname === '/accounts/employee-loan' ||
                        pathname === '/accounts/journal' ||
                        pathname.includes('/accounts/cash/receive')) &&
                        'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white border-l-4 border-blue-500'
                        }`}
                      onClick={(e) => {
                        e.preventDefault();
                        sidebarExpanded
                          ? handleClick()
                          : setSidebarExpanded(true);
                      }}
                    >
                      <FaGear />
                      Transaction
                    </NavLink>
                    <div
                      className={`translate transform overflow-hidden transition-all duration-300 ease-in-out ${open ? 'max-h-96' : 'max-h-0'
                        }`}
                    >
                      <ul className="mt-4 mb-5.5 flex flex-col gap-2.5 pl-6">
                        {hasPermission(permissions, 'cash.received.create') && (
                          <li>
                            <NavLink
                              to="/accounts/cash/receive"
                              className={({ isActive }) =>
                                'group relative flex items-center gap-2.5 rounded-md px-4 font-medium  duration-300 ease-in-out hover:text-gray-900 dark:hover:text-white ' +
                                (isActive && 'text-gray-900 font-bold dark:text-white')
                              }
                            >
                              Cash Received
                            </NavLink>
                          </li>
                        )}
                        {currentBranch?.business_type_id === 4 && (
                          <li>
                            <NavLink
                              to="/admin/installment-details"
                              className={({ isActive }) =>
                                'group relative flex items-center gap-2.5 rounded-md px-4 font-medium  duration-300 ease-in-out hover:text-gray-900 dark:hover:text-white ' +
                                (isActive && 'text-gray-900 font-bold dark:text-white')
                              }
                            >
                              Installments
                            </NavLink>
                          </li>
                        )}

                        {hasPermission(permissions, 'cash.payment.create') && (
                          <li>
                            <NavLink
                              to="/accounts/cash/payment"
                              className={({ isActive }) =>
                                'group relative flex items-center gap-2.5 rounded-md px-4 font-medium  duration-300 ease-in-out hover:text-gray-900 dark:hover:text-white ' +
                                (isActive && 'text-gray-900 font-bold dark:text-white')
                              }
                            >
                              Cash Payment
                            </NavLink>
                          </li>
                        )}
                        {hasPermission(permissions, 'bank.received.create') && (
                          <li>
                            <NavLink
                              to="/accounts/bank/receive"
                              className={({ isActive }) =>
                                'group relative flex items-center gap-2.5 rounded-md px-4 font-medium  duration-300 ease-in-out hover:text-gray-900 dark:hover:text-white ' +
                                (isActive && 'text-gray-900 font-bold dark:text-white')
                              }
                            >
                              Bank Received
                            </NavLink>
                          </li>
                        )}
                        {hasPermission(permissions, 'bank.payment.create') && (
                          <li>
                            <NavLink
                              to="/accounts/bank/payment"
                              className={({ isActive }) =>
                                'group relative flex items-center gap-2.5 rounded-md px-4 font-medium  duration-300 ease-in-out hover:text-gray-900 dark:hover:text-white ' +
                                (isActive && 'text-gray-900 font-bold dark:text-white')
                              }
                            >
                              Bank Payment
                            </NavLink>
                          </li>
                        )}
                        <li>
                          <NavLink
                            to="/accounts/employee-loan"
                            className={({ isActive }) =>
                              'group relative flex items-center gap-2.5 rounded-md px-4 font-medium  duration-300 ease-in-out hover:text-gray-900 dark:hover:text-white ' +
                              (isActive && 'text-gray-900 font-bold dark:text-white')
                            }
                          >
                            Employee Loan
                          </NavLink>
                        </li>
                        <li>
                          <NavLink
                            to="/accounts/journal"
                            className={({ isActive }) =>
                              'group relative flex items-center gap-2.5 rounded-md px-4 font-medium  duration-300 ease-in-out hover:text-gray-900 dark:hover:text-white ' +
                              (isActive && 'text-gray-900 font-bold dark:text-white')
                            }
                          >
                            Journal
                          </NavLink>
                        </li>
                      </ul>
                    </div>
                  </React.Fragment>
                )}
              </SidebarLinkGroup>

              {/* Invoice */}
              <SidebarLinkGroup
                activeCondition={
                  pathname === '/invoice/purchase' ||
                  pathname === '/invoice/sales' ||
                  pathname.includes('forms')
                }
                menuId="invoice"
                open={openMenu === 'invoice'}
                handleClick={() => handleMenuClick('invoice')}
              >
                {(handleClick, open) => (
                  <React.Fragment>
                    <NavLink
                      to="#"
                      className={`group relative flex items-center gap-2.5 rounded-sm py-2 px-4 font-medium dark:text-bodydark1 duration-300 ease-in-out hover:bg-gray-300 dark:hover:bg-meta-4 ${(pathname === '/invoice/purchase' ||
                        pathname === '/invoice/sales' ||
                        pathname === '/invoice/labour-invoice' ||
                        pathname.includes('/invoice/sales')) &&
                        'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white border-l-4 border-blue-500'
                        }`}
                      onClick={(e) => {
                        e.preventDefault();
                        sidebarExpanded
                          ? handleClick()
                          : setSidebarExpanded(true);
                      }}
                    >
                      <FiShoppingCart />
                      Invoice
                    </NavLink>
                    <div
                      className={`translate transform overflow-hidden transition-all duration-300 ease-in-out ${open ? 'max-h-96' : 'max-h-0'
                        }`}
                    >
                      <ul className="mt-4 mb-5.5 flex flex-col gap-2.5 pl-6">
                        {hasPermission(permissions, 'purchase.create') && (
                          <li>
                            <NavLink
                              to="/invoice/purchase"
                              className={({ isActive }) =>
                                'group relative flex items-center gap-2.5 rounded-md px-4 font-medium  duration-300 ease-in-out hover:text-gray-900 dark:hover:text-white ' +
                                (isActive && 'text-gray-900 font-bold dark:text-white')
                              }
                            >
                              Purchase
                            </NavLink>
                          </li>
                        )}
                        {hasPermission(permissions, 'sales.create') && (
                          <li>
                            <NavLink
                              to="/invoice/sales"
                              className={({ isActive }) =>
                                'group relative flex items-center gap-2.5 rounded-md px-4 font-medium  duration-300 ease-in-out hover:text-gray-900 dark:hover:text-white ' +
                                (isActive && 'text-gray-900 font-bold dark:text-white')
                              }
                            >
                              Sales
                            </NavLink>
                          </li>
                        )}
                        <li>
                          <NavLink
                            to="/invoice/labour-invoice"
                            className={({ isActive }) =>
                              'group relative flex items-center gap-2.5 rounded-md px-4 font-medium  duration-300 ease-in-out hover:text-gray-900 dark:hover:text-white ' +
                              (isActive && 'text-gray-900 font-bold dark:text-white')
                            }
                          >
                            Labour Invoice
                          </NavLink>
                        </li>
                      </ul>
                    </div>
                  </React.Fragment>
                )}
              </SidebarLinkGroup>


              {/* Reports */}
              <SidebarLinkGroup
                activeCondition={
                  pathname === '/reports/cashbook' ||
                  pathname === '/reports/employee-installment' ||
                  pathname === '/reports/ledger' ||
                  pathname === '/reports/due-installments' ||
                  pathname === '/reports/date-wise-total-data' ||
                  pathname === '/reports/due-list' ||
                  pathname === '/reports/purchase-ledger' ||
                  pathname === '/reports/sales-ledger' ||
                  pathname === '/reports/group-report' ||
                  pathname === '/reports/mitch-match' ||
                  pathname.includes('forms')
                }
                menuId="reports"
                open={openMenu === 'reports'}
                handleClick={() => handleMenuClick('reports')}
              >
                {(handleClick, open) => (
                  <React.Fragment>
                    <NavLink
                      to="#"
                      className={`group relative flex items-center gap-2.5 rounded-sm py-2 px-4 font-medium dark:text-bodydark1 duration-300 ease-in-out hover:bg-gray-300 dark:hover:bg-meta-4 ${(pathname === '/reports/date-wise-total-data' ||
                        pathname.includes('reports/cashbook') ||
                        pathname === '/reports/employee-installment' ||
                        pathname === '/reports/due-installments' ||
                        pathname.includes('/reports/due-list') ||
                        pathname.includes('/reports/product/stock') ||
                        pathname.includes('/reports/cat-wise/in-out') ||
                        pathname.includes('/reports/purchase-ledger') ||
                        pathname.includes('/reports/sales-ledger') ||
                        pathname.includes('/reports/group-report') ||
                        pathname.includes('/reports/labour/ledger') ||
                        pathname.includes('/reports/mitch-match') ||
                        pathname.includes('reports/ledger')) &&
                        'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white border-l-4 border-blue-500'
                        }`}
                      onClick={(e) => {
                        e.preventDefault();
                        sidebarExpanded
                          ? handleClick()
                          : setSidebarExpanded(true);
                      }}
                    >
                      <FiBook />
                      Reports
                    </NavLink>
                    <div
                      className={`translate transform overflow-hidden transition-all duration-300 ease-in-out ${open ? 'max-h-96' : 'max-h-0'
                        }`}
                    >
                      <ul className="mt-4 mb-5.5 flex flex-col gap-2.5 pl-6">
                        {hasPermission(permissions, 'cashbook.view') && (
                          <li>
                            <NavLink
                              to="/reports/cashbook"
                              className={({ isActive }) =>
                                'group relative flex items-center gap-2.5 rounded-md px-4 font-medium  duration-300 ease-in-out hover:text-gray-900 dark:hover:text-white ' +
                                (isActive && 'text-gray-900 font-bold dark:text-white')
                              }
                            >
                              Cash Book
                            </NavLink>
                          </li>
                        )}
                        {/* {hasPermission(permissions, 'cashbook.view') && ( */}
                        {currentBranch?.business_type_id == 4 && (
                          <li>
                            <NavLink
                              to="/reports/due-installments"
                              className={({ isActive }) =>
                                'group relative flex items-center gap-2.5 rounded-md px-4 font-medium  duration-300 ease-in-out hover:text-gray-900 dark:hover:text-white ' +
                                (isActive && 'text-gray-900 font-bold dark:text-white')
                              }
                            >
                              Due Installments
                            </NavLink>
                          </li>
                        )}

                        {currentBranch?.business_type_id == 4 && (
                          <li>
                            <NavLink
                              to="/reports/employee-installment"
                              className={({ isActive }) =>
                                'group relative flex items-center gap-2.5 rounded-md px-4 font-medium  duration-300 ease-in-out hover:text-gray-900 dark:hover:text-white ' +
                                (isActive && 'text-gray-900 font-bold dark:text-white')
                              }
                            >
                              Employee Installments
                            </NavLink>
                          </li>
                        )}

                        {hasPermission(permissions, 'ledger.view') && (
                          <li>
                            <NavLink
                              to="/reports/ledger"
                              className={({ isActive }) =>
                                'group relative flex items-center gap-2.5 rounded-md px-4 font-medium  duration-300 ease-in-out hover:text-gray-900 dark:hover:text-white ' +
                                (isActive && 'text-gray-900 font-bold dark:text-white')
                              }
                            >
                              Ledger
                            </NavLink>
                          </li>
                        )}

                        <li>
                          <NavLink
                            to="/reports/labour/ledger"
                            className={({ isActive }) =>
                              'group relative flex items-center gap-2.5 rounded-md px-4 font-medium  duration-300 ease-in-out hover:text-gray-900 dark:hover:text-white ' +
                              (isActive && 'text-gray-900 font-bold dark:text-white')
                            }
                          >
                            Labour Ledger
                          </NavLink>
                        </li>

                        {hasPermission(permissions, 'due.list.view') && (
                          <li>
                            <NavLink
                              to="/reports/due-list"
                              className={({ isActive }) =>
                                'group relative flex items-center gap-2.5 rounded-md px-4 font-medium  duration-300 ease-in-out hover:text-gray-900 dark:hover:text-white ' +
                                (isActive && 'text-gray-900 font-bold dark:text-white')
                              }
                            >
                              Due List
                            </NavLink>
                          </li>
                        )}
                        <li>
                          <NavLink
                            to="/reports/date-wise-total-data"
                            className={({ isActive }) =>
                              'group relative flex items-center gap-2.5 rounded-md px-4 font-medium  duration-300 ease-in-out hover:text-gray-900 dark:hover:text-white ' +
                              (isActive && 'text-gray-900 font-bold dark:text-white')
                            }
                          >
                            Datewise Total
                          </NavLink>
                        </li>
                        <li>
                          <NavLink
                            to="/reports/product/stock"
                            className={({ isActive }) =>
                              'group relative flex items-center gap-2.5 rounded-md px-4 font-medium  duration-300 ease-in-out hover:text-gray-900 dark:hover:text-white ' +
                              (isActive && 'text-gray-900 font-bold dark:text-white')
                            }
                          >
                            Product Stock
                          </NavLink>
                        </li>
                        <li>
                          <NavLink
                            to="/reports/cat-wise/in-out"
                            className={({ isActive }) =>
                              'group relative flex items-center gap-2.5 rounded-md px-4 font-medium  duration-300 ease-in-out hover:text-gray-900 dark:hover:text-white ' +
                              (isActive && 'text-gray-900 font-bold dark:text-white')
                            }
                          >
                            Cat-wise In/Out
                          </NavLink>
                        </li>
                        <li>
                          <NavLink
                            to="/reports/purchase-ledger"
                            className={({ isActive }) =>
                              'group relative flex items-center gap-2.5 rounded-md px-4 font-medium  duration-300 ease-in-out hover:text-gray-900 dark:hover:text-white ' +
                              (isActive && 'text-gray-900 font-bold dark:text-white')
                            }
                          >
                            Purchase Ledger
                          </NavLink>
                        </li>
                        <li>
                          <NavLink
                            to="/reports/sales-ledger"
                            className={({ isActive }) =>
                              'group relative flex items-center gap-2.5 rounded-md px-4 font-medium  duration-300 ease-in-out hover:text-gray-900 dark:hover:text-white ' +
                              (isActive && 'text-gray-900 font-bold dark:text-white')
                            }
                          >
                            Sales Ledger
                          </NavLink>
                        </li>
                        <li>
                          <NavLink
                            to="/reports/group-report"
                            className={({ isActive }) =>
                              'group relative flex items-center gap-2.5 rounded-md px-4 font-medium  duration-300 ease-in-out hover:text-gray-900 dark:hover:text-white ' +
                              (isActive && 'text-gray-900 font-bold dark:text-white')
                            }
                          >
                            Group Report
                          </NavLink>
                        </li>
                        <li>
                          <NavLink
                            to="/reports/mitch-match"
                            className={({ isActive }) =>
                              'group relative flex items-center gap-2.5 rounded-md px-4 font-medium  duration-300 ease-in-out hover:text-gray-900 dark:hover:text-white ' +
                              (isActive && 'text-gray-900 font-bold dark:text-white')
                            }
                          >
                            Mismatch
                          </NavLink>
                        </li>
                        <li>
                          <NavLink
                            to="/reports/mitch-match"
                            className={({ isActive }) =>
                              'group relative flex items-center gap-2.5 rounded-md px-4 font-medium  duration-300 ease-in-out hover:text-gray-900 dark:hover:text-white ' +
                              (isActive && 'text-gray-900 font-bold dark:text-white')
                            }
                          >
                            Mismatch
                          </NavLink>
                        </li>
                        <li>
                          <NavLink
                            to="/reports/mitch-match"
                            className={({ isActive }) =>
                              'group relative flex items-center gap-2.5 rounded-md px-4 font-medium  duration-300 ease-in-out hover:text-gray-900 dark:hover:text-white ' +
                              (isActive && 'text-gray-900 font-bold dark:text-white')
                            }
                          >
                            Mismatch
                          </NavLink>
                        </li>
                      </ul>
                    </div>
                  </React.Fragment>
                )}
              </SidebarLinkGroup>




              {/* Requisition */}
              <SidebarLinkGroup
                activeCondition={
                  pathname === '/requisition/comparison' ||
                  pathname === '/requisition/create' ||
                  pathname.includes('forms')
                }
                menuId="requisition"
                open={openMenu === 'requisition'}
                handleClick={() => handleMenuClick('requisition')}
              >
                {(handleClick, open) => (
                  <React.Fragment>
                    <NavLink
                      to="#"
                      className={`group relative flex items-center gap-2.5 rounded-sm py-2 px-4 font-medium dark:text-bodydark1 duration-300 ease-in-out hover:bg-gray-300 dark:hover:bg-meta-4 ${(
                        pathname === '/requisitions' ||
                        pathname === '/requisition/create' ||
                        pathname === '/requisition/comparison' ||
                        pathname.includes('/requisition/comparison')) &&
                        'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white border-l-4 border-blue-500'
                        }`}

                      onClick={(e) => {
                        e.preventDefault();
                        sidebarExpanded
                          ? handleClick()
                          : setSidebarExpanded(true);
                      }}
                    >
                      <FiServer />
                      Requisition
                    </NavLink>
                    <div
                      className={`translate transform overflow-hidden transition-all duration-300 ease-in-out ${open ? 'max-h-96' : 'max-h-0'
                        }`}
                    >
                      <ul className="mt-4 mb-5.5 flex flex-col gap-2.5 pl-6">
                        <li>
                          <NavLink
                            to="/requisitions"
                            className={({ isActive }) =>
                              'group relative flex items-center gap-2.5 rounded-md px-4 font-medium  duration-300 ease-in-out hover:text-gray-900 dark:hover:text-white ' +
                              (isActive && 'text-gray-900 font-bold dark:text-white')
                            }
                          >
                            Requisitions
                          </NavLink>
                        </li>
                        {/* <li>
                          <NavLink
                            to="/requisition/create"
                            className={({ isActive }) =>
                              'group relative flex items-center gap-2.5 rounded-md px-4 font-medium  duration-300 ease-in-out hover:text-gray-900 dark:hover:text-white ' +
                              (isActive && 'text-gray-900 font-bold dark:text-white')
                            }
                          >
                            Create
                          </NavLink>
                        </li> */}
                        <li>
                          <NavLink
                            to="/requisition/comparison"
                            className={({ isActive }) =>
                              'group relative flex items-center gap-2.5 rounded-md px-4 font-medium  duration-300 ease-in-out hover:text-gray-900 dark:hover:text-white ' +
                              (isActive && 'text-gray-900 font-bold dark:text-white')
                            }
                          >
                            Comparison
                          </NavLink>
                        </li>
                      </ul>
                    </div>
                  </React.Fragment>
                )}
              </SidebarLinkGroup>


              {/* Real Estate */}

              {settings?.data?.branch?.business_type_id == 9 && (
                <SidebarLinkGroup
                  activeCondition={
                    pathname === '/real-estate/add-area' ||
                    pathname === '/real-estate/area-list' ||
                    pathname === '/real-estate/project-activities' ||
                    pathname === '/real-estate/flat-layout' ||
                    pathname.includes('forms')
                  }
                  menuId="real-estate"
                  open={openMenu === 'real-estate'}
                  handleClick={() => handleMenuClick('real-estate')}
                >
                  {(handleClick, open) => (
                    <React.Fragment>
                      <NavLink
                        to="#"
                        className={`group relative flex items-center gap-2.5 rounded-sm py-2 px-4 font-medium dark:text-bodydark1 duration-300 ease-in-out hover:bg-gray-300 dark:hover:bg-meta-4 
                        ${(
                            pathname === '/real-estate/area-list' ||
                            pathname === '/real-estate/project-activities' ||
                            pathname === '/real-estate/buildings' ||
                            pathname === '/real-estate/flat-layout' ||
                            pathname === '/real-estate/building/floor' ||
                            pathname === '/real-estate/project-list' ||
                            pathname.includes('/real-estate/add-area')) &&
                          'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white border-l-4 border-blue-500'
                          }`}
                        onClick={(e) => {
                          e.preventDefault();
                          sidebarExpanded
                            ? handleClick()
                            : setSidebarExpanded(true);
                        }}
                      >
                        <FiHome />
                        Real Estate
                      </NavLink>
                      <div
                        className={`translate transform overflow-hidden transition-all duration-300 ease-in-out ${open ? 'max-h-96' : 'max-h-0'
                          }`}
                      >
                        <ul className="mt-4 mb-5.5 flex flex-col gap-2.5 pl-6">
                          <li>
                            <NavLink
                              to="/real-estate/area-list"
                              className={({ isActive }) =>
                                'group relative flex items-center gap-2.5 rounded-md px-4 font-medium  duration-300 ease-in-out hover:text-gray-900 dark:hover:text-white ' +
                                (isActive && 'text-gray-900 font-bold dark:text-white')
                              }
                            >
                              Projects Location
                            </NavLink>
                          </li>
                          <li>
                            <NavLink
                              to="/real-estate/project-activities"
                              className={({ isActive }) =>
                                'group relative flex items-center gap-2.5 rounded-md px-4 font-medium  duration-300 ease-in-out hover:text-gray-900 dark:hover:text-white ' +
                                (isActive && 'text-gray-900 font-bold dark:text-white')
                              }
                            >
                              Project Activities
                            </NavLink>
                          </li>

                          <li>
                            <NavLink
                              to="/real-estate/project-list"
                              className={({ isActive }) =>
                                'group relative flex items-center gap-2.5 rounded-md px-4 font-medium  duration-300 ease-in-out hover:text-gray-900 dark:hover:text-white ' +
                                (isActive && 'text-gray-900 font-bold dark:text-white')
                              }
                            >
                              Projects
                            </NavLink>
                          </li>
                          <li>
                            <NavLink
                              to="/real-estate/buildings"
                              className={({ isActive }) =>
                                'group relative flex items-center gap-2.5 rounded-md px-4 font-medium  duration-300 ease-in-out hover:text-gray-900 dark:hover:text-white ' +
                                (isActive && 'text-gray-900 font-bold dark:text-white')
                              }
                            >
                              Buildings
                            </NavLink>
                          </li>

                          <li>
                            <NavLink
                              to="/real-estate/building/floor"
                              className={({ isActive }) =>
                                'group relative flex items-center gap-2.5 rounded-md px-4 font-medium  duration-300 ease-in-out hover:text-gray-900 dark:hover:text-white ' +
                                (isActive && 'text-gray-900 font-bold dark:text-white')
                              }
                            >
                              Floor
                            </NavLink>
                          </li>
                          <li>
                            <NavLink
                              to="/real-estate/add-unit"
                              className={({ isActive }) =>
                                'group relative flex items-center gap-2.5 rounded-md px-4 font-medium  duration-300 ease-in-out hover:text-gray-900 dark:hover:text-white ' +
                                (isActive && 'text-gray-900 font-bold dark:text-white')
                              }
                            >
                             Add Floor
                            </NavLink>
                          </li>
                          <li>
                            <NavLink
                              to="/real-estate/flat-layout"
                              className={({ isActive }) =>
                                'group relative flex items-center gap-2.5 rounded-md px-4 font-medium  duration-300 ease-in-out hover:text-gray-900 dark:hover:text-white ' +
                                (isActive && 'text-gray-900 font-bold dark:text-white')
                              }
                            >
                              Floor Layout
                            </NavLink>
                          </li>

                        </ul>
                      </div>
                    </React.Fragment>
                  )}
                </SidebarLinkGroup>
              )}


              {/* Products */}
              <SidebarLinkGroup
                activeCondition={
                  pathname === '/category/category-list' ||
                  pathname === '/category/edit' ||
                  pathname === '/product/product-list' ||
                  pathname === '/product/edit' ||
                  pathname.includes('forms')
                }
                menuId="products"
                open={openMenu === 'products'}
                handleClick={() => handleMenuClick('products')}
              >
                {(handleClick, open) => (
                  <React.Fragment>
                    <NavLink
                      to="#"
                      className={`group relative flex items-center gap-2.5 rounded-sm py-2 px-4 font-medium dark:text-bodydark1 duration-300 ease-in-out hover:bg-gray-300 dark:hover:bg-meta-4 ${(pathname === '/product/product-list' ||
                        pathname === '/category/category-list') &&
                        'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white border-l-4 border-blue-500'
                        }`}
                      onClick={(e) => {
                        e.preventDefault();
                        sidebarExpanded
                          ? handleClick()
                          : setSidebarExpanded(true);
                      }}
                    >
                      <FiLayers />
                      Products
                    </NavLink>
                    <div
                      className={`translate transform overflow-hidden transition-all duration-300 ease-in-out ${open ? 'max-h-96' : 'max-h-0'
                        }`}
                    >
                      <ul className="mt-4 mb-5.5 flex flex-col gap-2.5 pl-6">
                        <li>
                          <NavLink
                            to="/category/category-list"
                            className={({ isActive }) =>
                              'group relative flex items-center gap-2.5 rounded-md px-4 font-medium  duration-300 ease-in-out hover:text-gray-900 dark:hover:text-white ' +
                              (isActive && 'text-gray-900 font-bold dark:text-white')
                            }
                          >
                            Category List
                          </NavLink>
                        </li>
                        <li>
                          <NavLink
                            to="/product/product-list"
                            className={({ isActive }) =>
                              'group relative flex items-center gap-2.5 rounded-md px-4 font-medium  duration-300 ease-in-out hover:text-gray-900 dark:hover:text-white ' +
                              (isActive && 'text-gray-900 font-bold dark:text-white')
                            }
                          >
                            Product List
                          </NavLink>
                        </li>
                      </ul>
                    </div>
                  </React.Fragment>
                )}
              </SidebarLinkGroup>


              {/* Admin */}
              <SidebarLinkGroup
                activeCondition={
                  pathname === '/branch/branch-list' ||
                  pathname === '/user/user-list' ||
                  pathname === '/admin/dayclose' ||
                  pathname === '/order/order-list' ||
                  pathname.includes('forms')
                }
                menuId="admin"
                open={openMenu === 'admin'}
                handleClick={() => handleMenuClick('admin')}
              >
                {(handleClick, open) => (
                  <React.Fragment>
                    <NavLink
                      to="#"
                      className={`group relative flex items-center gap-2.5 rounded-sm py-2 px-4 font-medium dark:text-bodydark1 duration-300 ease-in-out hover:bg-gray-300 dark:hover:bg-meta-4 ${(pathname === '/branch/branch-list' ||
                        pathname === '/user/user-list' ||
                        pathname === '/admin/dayclose' ||
                        pathname === '/order/order-list' ||
                        pathname === '/admin/voucher-approval' ||
                        pathname === '/admin/remove-approval' ||
                        pathname === '/admin/voucher/type-change' ||
                        pathname === '/admin/image-upload' ||
                        pathname === '/admin/bulk-upload' ||
                        pathname === '/admin/jumpdate' ||
                        pathname === '/orders/avg-price' ||
                        pathname.includes('/branch/branch-list')) &&
                        'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white border-l-4 border-blue-500'
                        }`}
                      onClick={(e) => {
                        e.preventDefault();
                        sidebarExpanded
                          ? handleClick()
                          : setSidebarExpanded(true);
                      }}
                    >
                      <FaGear />
                      Admin
                    </NavLink>
                    <div
                      className={`translate transform overflow-hidden transition-all duration-300 ease-in-out ${open ? 'max-h-96' : 'max-h-0'
                        }`}
                    >
                      <ul className="mt-4 mb-5.5 flex flex-col gap-2.5 pl-6">
                        {hasPermission(permissions, 'branch.view') && (
                          <li>
                            <NavLink
                              to="/branch/branch-list"
                              className={({ isActive }) =>
                                'group relative flex items-center gap-2.5 rounded-md px-4 font-medium  duration-300 ease-in-out hover:text-gray-900 dark:hover:text-white ' +
                                (isActive && 'text-gray-900 font-bold dark:text-white')
                              }
                            >
                              Branch List
                            </NavLink>
                          </li>
                        )}

                        {hasPermission(permissions, 'user.all.view') && (
                          <li>
                            <NavLink
                              to="/user/user-list"
                              className={({ isActive }) =>
                                'group relative flex items-center gap-2.5 rounded-md px-4 font-medium  duration-300 ease-in-out hover:text-gray-900 dark:hover:text-white ' +
                                (isActive && 'text-gray-900 font-bold dark:text-white')
                              }
                            >
                              User List
                            </NavLink>
                          </li>
                        )}
                        {hasPermission(permissions, 'dayclose.all.view') && (
                          <li>
                            <NavLink
                              to="/admin/dayclose"
                              className={({ isActive }) =>
                                'group relative flex items-center gap-2.5 rounded-md px-4 font-medium  duration-300 ease-in-out hover:text-gray-900 dark:hover:text-white ' +
                                (isActive && 'text-gray-900 font-bold dark:text-white')
                              }
                            >
                              Day Close
                            </NavLink>
                          </li>
                        )}
                        {hasPermission(permissions, 'order.view') && (
                          <li>
                            <NavLink
                              to="/order/order-list"
                              className={({ isActive }) =>
                                'group relative flex items-center gap-2.5 rounded-md px-4 font-medium  duration-300 ease-in-out hover:text-gray-900 dark:hover:text-white ' +
                                (isActive && 'text-gray-900 font-bold dark:text-white')
                              }
                            >
                              Orders
                            </NavLink>
                          </li>
                        )}
                        <li>
                          <NavLink
                            to="/orders/avg-price"
                            className={({ isActive }) =>
                              'group relative flex items-center gap-2.5 rounded-md px-4 font-medium  duration-300 ease-in-out hover:text-gray-900 dark:hover:text-white ' +
                              (isActive && 'text-gray-900 font-bold dark:text-white')
                            }
                          >
                            Average Price
                          </NavLink>
                        </li>
                        <li>
                          <NavLink
                            to="/admin/voucher-approval"
                            className={({ isActive }) =>
                              'group relative flex items-center gap-2.5 rounded-md px-4 font-medium  duration-300 ease-in-out hover:text-gray-900 dark:hover:text-white ' +
                              (isActive && 'text-gray-900 font-bold dark:text-white')
                            }
                          >
                            Voucher Approval
                          </NavLink>
                        </li>
                        <li>
                          <NavLink
                            to="/admin/remove-approval"
                            className={({ isActive }) =>
                              'group relative flex items-center gap-2.5 rounded-md px-4 font-medium  duration-300 ease-in-out hover:text-gray-900 dark:hover:text-white ' +
                              (isActive && 'text-gray-900 font-bold dark:text-white')
                            }
                          >
                            Approval Remove
                          </NavLink>
                        </li>
                        <li>
                          <NavLink
                            to="/admin/voucher/type-change"
                            className={({ isActive }) =>
                              'group relative flex items-center gap-2.5 rounded-md px-4 font-medium  duration-300 ease-in-out hover:text-gray-900 dark:hover:text-white ' +
                              (isActive && 'text-gray-900 font-bold dark:text-white')
                            }
                          >
                            Change Voucher Type
                          </NavLink>
                        </li>
                        <li>
                          <NavLink
                            to="/admin/image-upload"
                            className={({ isActive }) =>
                              'group relative flex items-center gap-2.5 rounded-md px-4 font-medium  duration-300 ease-in-out hover:text-gray-900 dark:hover:text-white ' +
                              (isActive && 'text-gray-900 font-bold dark:text-white')
                            }
                          >
                            Voucher Upload
                          </NavLink>
                        </li>
                        <li>
                          <NavLink
                            to="/admin/bulk-upload"
                            className={({ isActive }) =>
                              'group relative flex items-center gap-2.5 rounded-md px-4 font-medium  duration-300 ease-in-out hover:text-gray-900 dark:hover:text-white ' +
                              (isActive && 'text-gray-900 font-bold dark:text-white')
                            }
                          >
                            Bulk Upload
                          </NavLink>
                        </li>
                      </ul>
                    </div>
                  </React.Fragment>
                )}
              </SidebarLinkGroup>

              {/* VR Settings */}
              <SidebarLinkGroup
                activeCondition={
                  pathname === '/vr-settings/voucher-delete' ||
                  pathname === '/admin/voucher/date-change' ||
                  pathname.includes('forms')
                }
                menuId="vr_settings"
                open={openMenu === 'vr_settings'}
                handleClick={() => handleMenuClick('vr_settings')}
              >

                {(handleClick, open) => (
                  <React.Fragment>
                    <NavLink
                      to="#"
                      className={`group relative flex items-center gap-2.5 rounded-sm py-2 px-4 font-medium dark:text-bodydark1 duration-300 ease-in-out hover:bg-gray-300 dark:hover:bg-meta-4 ${(
                        pathname === '/vr-settings/voucher-delete' ||
                        pathname === '/vr-settings/installment-delete' ||
                        pathname === '/admin/voucher/date-change' ||
                        pathname === '/vr-settings/recyclebin' ||
                        pathname === '/vr-settings/voucher-history' ||
                        pathname === '/vr-settings/voucher-activity' ||
                        pathname.includes('/vr-settings/voucher-delete')
                      ) &&
                        'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white border-l-4 border-blue-500'
                        }`}
                      onClick={(e) => {
                        e.preventDefault();
                        sidebarExpanded
                          ? handleClick()
                          : setSidebarExpanded(true);
                      }}
                    >
                      <FiLayers />
                      VR Settings
                    </NavLink>
                    <div
                      className={`translate transform overflow-hidden transition-all duration-300 ease-in-out ${open ? 'max-h-96' : 'max-h-0'
                        }`}
                    >
                      <ul className="mt-4 mb-5.5 flex flex-col gap-2.5 pl-6">
                        {hasPermission(permissions, 'dayclose.all.view') && (
                          <li>
                            <NavLink
                              to="/vr-settings/voucher-delete"
                              className={({ isActive }) =>
                                'group relative flex items-center gap-2.5 rounded-md px-4 font-medium  duration-300 ease-in-out hover:text-gray-900 dark:hover:text-white ' +
                                (isActive && 'text-gray-900 font-bold dark:text-white')
                              }
                            >
                              Voucher Delete
                            </NavLink>
                          </li>
                        )}
                        {hasPermission(permissions, 'dayclose.all.view') && (
                          <li>
                            <NavLink
                              to="/vr-settings/installment-delete"
                              className={({ isActive }) =>
                                'group relative flex items-center gap-2.5 rounded-md px-4 font-medium  duration-300 ease-in-out hover:text-gray-900 dark:hover:text-white ' +
                                (isActive && 'text-gray-900 font-bold dark:text-white')
                              }
                            >
                              Installment Delete
                            </NavLink>
                          </li>
                        )}

                        <li>
                          <NavLink
                            to={routes.admin_change_date}
                            className={({ isActive }) =>
                              'group relative flex items-center gap-2.5 rounded-md px-4 font-medium  duration-300 ease-in-out hover:text-gray-900 dark:hover:text-white ' +
                              (isActive && 'text-gray-900 font-bold dark:text-white')
                            }
                          >
                            Voucher Date Change
                          </NavLink>
                        </li>
                        <li>
                          <NavLink
                            to={routes.recyclebin}
                            className={({ isActive }) =>
                              'group relative flex items-center gap-2.5 rounded-md px-4 font-medium  duration-300 ease-in-out hover:text-gray-900 dark:hover:text-white ' +
                              (isActive && 'text-gray-900 font-bold dark:text-white')
                            }
                          >
                            Recycle Bin
                          </NavLink>
                        </li>
                        <li>
                          <NavLink
                            to={routes.voucher_history}
                            className={({ isActive }) =>
                              'group relative flex items-center gap-2.5 rounded-md px-4 font-medium  duration-300 ease-in-out hover:text-gray-900 dark:hover:text-white ' +
                              (isActive && 'text-gray-900 font-bold dark:text-white')
                            }
                          >
                            History
                          </NavLink>
                        </li>
                        <li>
                          <NavLink
                            to={routes.voucher_activity}
                            className={({ isActive }) =>
                              'group relative flex items-center gap-2.5 rounded-md px-4 font-medium  duration-300 ease-in-out hover:text-gray-900 dark:hover:text-white ' +
                              (isActive && 'text-gray-900 font-bold dark:text-white')
                            }
                          >

                            Log Changes
                          </NavLink>
                        </li>
                      </ul>
                    </div>
                  </React.Fragment>
                )}
              </SidebarLinkGroup>

              {/* VR Settings */}
              <SidebarLinkGroup
                activeCondition={
                  pathname === '/admin/voucher/date-change' ||
                  pathname.includes('forms')
                }
                menuId="hrm"
                open={openMenu === 'hrm'}
                handleClick={() => handleMenuClick('hrm')}
              >

                {(handleClick, open) => (
                  <React.Fragment>
                    <NavLink
                      to="#"
                      className={`group relative flex items-center gap-2.5 rounded-sm py-2 px-4 font-medium dark:text-bodydark1 duration-300 ease-in-out hover:bg-gray-300 dark:hover:bg-meta-4 ${(
                        pathname === '/hrms/employees' ||
                        pathname === '/hrms/salary/salary-generate' ||
                        pathname.includes('/hrms/salary-sheet')
                      ) &&
                        'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white border-l-4 border-blue-500'
                        }`}
                      onClick={(e) => {
                        e.preventDefault();
                        sidebarExpanded
                          ? handleClick()
                          : setSidebarExpanded(true);
                      }}
                    >
                      <FiClipboard />
                      HRM
                    </NavLink>
                    <div
                      className={`translate transform overflow-hidden transition-all duration-300 ease-in-out ${open ? 'max-h-96' : 'max-h-0'
                        }`}
                    >
                      <ul className="mt-4 mb-5.5 flex flex-col gap-2.5 pl-6">
                        <li>
                          <NavLink
                            to="/hrms/employees"
                            className={({ isActive }) =>
                              'group relative flex items-center gap-2.5 rounded-md px-4 font-medium  duration-300 ease-in-out hover:text-gray-900 dark:hover:text-white ' +
                              (isActive && 'text-gray-900 font-bold dark:text-white')
                            }
                          >
                            Employees
                          </NavLink>
                        </li>
                        <li>
                          <NavLink
                            to="/hrms/salary/salary-generate"
                            className={({ isActive }) =>
                              'group relative flex items-center gap-2.5 rounded-md px-4 font-medium  duration-300 ease-in-out hover:text-gray-900 dark:hover:text-white ' +
                              (isActive && 'text-gray-900 font-bold dark:text-white')
                            }
                          >
                            Salary Generate
                          </NavLink>
                        </li>

                        <li>
                          <NavLink
                            to="/hrms/salary-sheet"
                            className={({ isActive }) =>
                              'group relative flex items-center gap-2.5 rounded-md px-4 font-medium  duration-300 ease-in-out hover:text-gray-900 dark:hover:text-white ' +
                              (isActive && 'text-gray-900 font-bold dark:text-white')
                            }
                          >
                            Salary Reports
                          </NavLink>
                        </li>

                      </ul>
                    </div>
                  </React.Fragment>
                )}
              </SidebarLinkGroup>


              {/* User Management */}
              <SidebarLinkGroup
                activeCondition={
                  pathname === '/user-management/roles' ||
                  pathname.includes('forms')
                }
                menuId="user-management"
                open={openMenu === 'user-management'}
                handleClick={() => handleMenuClick('user-management')}
              >
                {(handleClick, open) => (
                  <React.Fragment>
                    <NavLink
                      to="#"
                      className={`group relative flex items-center gap-2.5 rounded-sm py-2 px-4 font-medium dark:text-bodydark1 duration-300 ease-in-out hover:bg-gray-300 dark:hover:bg-meta-4 ${(pathname === '/user-management/roles' ||
                        pathname === '/user-management/create-role' ||
                        pathname.includes('/user-management/roles')) &&
                        'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white border-l-4 border-blue-500'
                        }`}
                      onClick={(e) => {
                        e.preventDefault();
                        sidebarExpanded
                          ? handleClick()
                          : setSidebarExpanded(true);
                      }}
                    >
                      <FiUsers />
                      User Management
                    </NavLink>
                    <div
                      className={`translate transform overflow-hidden transition-all duration-300 ease-in-out ${open ? 'max-h-96' : 'max-h-0'
                        }`}
                    >
                      <ul className="mt-4 mb-5.5 flex flex-col gap-2.5 pl-6">
                        <li>
                          <NavLink
                            to="/user-management/roles"
                            className={({ isActive }) =>
                              'group relative flex items-center gap-2.5 rounded-md px-4 font-medium  duration-300 ease-in-out hover:text-gray-900 dark:hover:text-white ' +
                              (isActive && 'text-gray-900 font-bold dark:text-white')
                            }
                          >
                            Roles
                          </NavLink>
                        </li>
                        <li>
                          <NavLink
                            to="/user-management/create-role"
                            className={({ isActive }) =>
                              'group relative flex items-center gap-2.5 rounded-md px-4 font-medium  duration-300 ease-in-out hover:text-gray-900 dark:hover:text-white ' +
                              (isActive && 'text-gray-900 font-bold dark:text-white')
                            }
                          >
                            Add Roles
                          </NavLink>
                        </li>
                      </ul>
                    </div>
                  </React.Fragment>
                )}
              </SidebarLinkGroup>

              {/* Customer & Supplier */}
              <SidebarLinkGroup
                activeCondition={
                  pathname === '/customer-supplier/list' ||
                  pathname.includes('forms')
                }
                menuId="customer-supplier"
                open={openMenu === 'customer-supplier'}
                handleClick={() => handleMenuClick('customer-supplier')}
              >
                {(handleClick, open) => (
                  <React.Fragment>
                    <NavLink
                      to="#"
                      className={`group relative flex items-center gap-2.5 rounded-sm py-2 px-4 font-medium dark:text-bodydark1 duration-300 ease-in-out hover:bg-gray-300 dark:hover:bg-meta-4 ${(pathname === '/customer-supplier/list' ||
                        pathname.includes('/customer-supplier/list')) &&
                        'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white border-l-4 border-blue-500'
                        }`}
                      onClick={(e) => {
                        e.preventDefault();
                        sidebarExpanded
                          ? handleClick()
                          : setSidebarExpanded(true);
                      }}
                    >
                      <FiUsers />
                      Customer & Supplier
                    </NavLink>
                    <div
                      className={`translate transform overflow-hidden transition-all duration-300 ease-in-out ${open ? 'max-h-96' : 'max-h-0'
                        }`}
                    >
                      <ul className="mt-4 mb-5.5 flex flex-col gap-2.5 pl-6">
                        <li>
                          <NavLink
                            to="/customer-supplier/list"
                            className={({ isActive }) =>
                              'group relative flex items-center gap-2.5 rounded-md px-4 font-medium  duration-300 ease-in-out hover:text-gray-900 dark:hover:text-white ' +
                              (isActive && 'text-gray-900 font-bold dark:text-white')
                            }
                          >
                            Customer & Supplier List
                          </NavLink>
                        </li>
                      </ul>
                    </div>
                  </React.Fragment>
                )}
              </SidebarLinkGroup>


              {/* Chart of Accounts */}
              <SidebarLinkGroup
                activeCondition={
                  pathname === '/coal4/coal4-list' || pathname.includes('forms')
                }
                menuId="chart-of-accounts"
                open={openMenu === 'chart-of-accounts'}
                handleClick={() => handleMenuClick('chart-of-accounts')}
              >
                {(handleClick, open) => (
                  <React.Fragment>
                    <NavLink
                      to="#"
                      className={`group relative flex items-center gap-2.5 rounded-sm py-2 px-4 font-medium dark:text-bodydark1 duration-300 ease-in-out hover:bg-gray-300 dark:hover:bg-meta-4 ${(pathname === '/coal1/coal1-list' ||
                        pathname === '/coal2/coal2-list' ||
                        pathname === '/coal3/coal3-list' ||
                        pathname === '/coal4/coal4-list' ||
                        pathname.includes('/coal4/coal4-list')) &&
                        'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white border-l-4 border-blue-500'
                        }`}
                      onClick={(e) => {
                        e.preventDefault();
                        sidebarExpanded
                          ? handleClick()
                          : setSidebarExpanded(true);
                      }}
                    >
                      <FiServer />
                      Chart of Accounts
                    </NavLink>
                    <div
                      className={`translate transform overflow-hidden transition-all duration-300 ease-in-out ${open ? 'max-h-96' : 'max-h-0'
                        }`}
                    >
                      <ul className="mt-4 mb-5.5 flex flex-col gap-2.5 pl-6">
                        <li>
                          <NavLink
                            to="/coal1/coal1-list"
                            className={({ isActive }) =>
                              'group relative flex items-center gap-2.5 rounded-md px-4 font-medium  duration-300 ease-in-out hover:text-gray-900 dark:hover:text-white ' +
                              (isActive && 'text-gray-900 font-bold dark:text-white')
                            }
                          >
                            CoA L1
                          </NavLink>
                        </li>
                        <li>
                          <NavLink
                            to="/coal2/coal2-list"
                            className={({ isActive }) =>
                              'group relative flex items-center gap-2.5 rounded-md px-4 font-medium  duration-300 ease-in-out hover:text-gray-900 dark:hover:text-white ' +
                              (isActive && 'text-gray-900 font-bold dark:text-white')
                            }
                          >
                            CoA L2
                          </NavLink>
                        </li>
                        <li>
                          <NavLink
                            to="/coal3/coal3-list"
                            className={({ isActive }) =>
                              'group relative flex items-center gap-2.5 rounded-md px-4 font-medium  duration-300 ease-in-out hover:text-gray-900 dark:hover:text-white ' +
                              (isActive && 'text-gray-900 font-bold dark:text-white')
                            }
                          >
                            CoA L3
                          </NavLink>
                        </li>
                        <li>
                          <NavLink
                            to="/coal4/coal4-list"
                            className={({ isActive }) =>
                              'group relative flex items-center gap-2.5 rounded-md px-4 font-medium  duration-300 ease-in-out hover:text-gray-900 dark:hover:text-white ' +
                              (isActive && 'text-gray-900 font-bold dark:text-white')
                            }
                          >
                            CoA L4
                          </NavLink>
                        </li>
                      </ul>
                    </div>
                  </React.Fragment>
                )}
              </SidebarLinkGroup>



              {/* Chart of Accounts */}
              <SidebarLinkGroup
                activeCondition={
                  pathname === '/item/item-chart' || pathname.includes('forms')
                }
                menuId="al-charts"
                open={openMenu === 'al-charts'}
                handleClick={() => handleMenuClick('al-charts')}
              >
                {(handleClick, open) => (
                  <React.Fragment>
                    <NavLink
                      to="#"
                      className={`group relative flex items-center gap-2.5 rounded-sm py-2 px-4 font-medium dark:text-bodydark1 duration-300 ease-in-out hover:bg-gray-300 dark:hover:bg-meta-4 ${(
                        pathname === '/item/item-chart' ||
                        pathname.includes('/item/item-chart')
                      ) &&
                        'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white border-l-4 border-blue-500'
                        }`}
                      onClick={(e) => {
                        e.preventDefault();
                        sidebarExpanded
                          ? handleClick()
                          : setSidebarExpanded(true);
                      }}
                    >
                      <FiBarChart2 />
                      Analytics
                    </NavLink>
                    <div
                      className={`translate transform overflow-hidden transition-all duration-300 ease-in-out ${open ? 'max-h-96' : 'max-h-0'
                        }`}
                    >
                      <ul className="mt-4 mb-5.5 flex flex-col gap-2.5 pl-6">
                        <li>
                          <NavLink
                            to="/item/item-chart"
                            className={({ isActive }) =>
                              'group relative flex items-center gap-2.5 rounded-md px-4 font-medium  duration-300 ease-in-out hover:text-gray-900 dark:hover:text-white ' +
                              (isActive && 'text-gray-900 font-bold dark:text-white')
                            }
                          >
                            Comparison
                          </NavLink>
                        </li>
                      </ul>
                    </div>
                  </React.Fragment>
                )}
              </SidebarLinkGroup>


              {/* Customer Dashboard */}
              <li>
                <NavLink
                  to="/customer-dashboard"

                  className={`group relative flex items-center gap-2.5 rounded-sm py-2 px-4 font-medium dark:text-bodydark1 duration-300 ease-in-out hover:bg-gray-300 dark:hover:bg-meta-4 ${(pathname === '/coal1/coal1-list' ||
                    pathname === '/customer-dashboard') &&
                    'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white border-l-4 border-blue-500'
                    }`}
                >
                  <svg
                    className="fill-current"
                    width="18"
                    height="19"
                    viewBox="0 0 18 19"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <g clipPath="url(#clip0_130_9801)">
                      <path
                        d="M10.8563 0.55835C10.5188 0.55835 10.2095 0.8396 10.2095 1.20522V6.83022C10.2095 7.16773 10.4907 7.4771 10.8563 7.4771H16.8751C17.0438 7.4771 17.2126 7.39272 17.3251 7.28022C17.4376 7.1396 17.4938 6.97085 17.4938 6.8021C17.2688 3.28647 14.3438 0.55835 10.8563 0.55835ZM11.4751 6.15522V1.8521C13.8095 2.13335 15.6938 3.8771 16.1438 6.18335H11.4751V6.15522Z"
                        fill=""
                      />
                      <path
                        d="M15.3845 8.7427H9.1126V2.69582C9.1126 2.35832 8.83135 2.07707 8.49385 2.07707C8.40947 2.07707 8.3251 2.07707 8.24072 2.07707C3.96572 2.04895 0.506348 5.53645 0.506348 9.81145C0.506348 14.0864 3.99385 17.5739 8.26885 17.5739C12.5438 17.5739 16.0313 14.0864 16.0313 9.81145C16.0313 9.6427 16.0313 9.47395 16.0032 9.33332C16.0032 8.99582 15.722 8.7427 15.3845 8.7427ZM8.26885 16.3083C4.66885 16.3083 1.77197 13.4114 1.77197 9.81145C1.77197 6.3802 4.47197 3.53957 7.8751 3.3427V9.36145C7.8751 9.69895 8.15635 10.0083 8.52197 10.0083H14.7938C14.6813 13.4958 11.7845 16.3083 8.26885 16.3083Z"
                        fill=""
                      />
                    </g>
                    <defs>
                      <clipPath id="clip0_130_9801">
                        <rect
                          width="18"
                          height="18"
                          fill="white"
                          transform="translate(0 0.052124)"
                        />
                      </clipPath>
                    </defs>
                  </svg>
                  Customer Dashboard
                </NavLink>
              </li>

              {/* UI Elements */}
              <SidebarLinkGroup
                activeCondition={pathname === '/ui' || pathname.includes('ui')}
                menuId="ui-elements"
                open={openMenu === 'ui-elements'}
                handleClick={() => handleMenuClick('ui-elements')}
              >
                {(handleClick, open) => (
                  <React.Fragment>
                    <NavLink
                      to="#"
                      className={`group relative flex items-center gap-2.5 rounded-sm px-4 py-2 font-medium dark:text-bodydark1 text-bodydark1 duration-300 ease-in-out hover:bg-gray-300 dark:hover:bg-meta-4 ${(pathname === '/ui' || pathname.includes('ui')) &&
                        'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white border-l-4 border-blue-500'
                        }`}
                      onClick={(e) => {
                        e.preventDefault();
                        sidebarExpanded
                          ? handleClick()
                          : setSidebarExpanded(true);
                      }}
                    >
                      <svg
                        className="fill-current"
                        width="18"
                        height="19"
                        viewBox="0 0 18 19"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <g clipPath="url(#clip0_130_9807)">
                          <path
                            d="M15.7501 0.55835H2.2501C1.29385 0.55835 0.506348 1.34585 0.506348 2.3021V7.53335C0.506348 8.4896 1.29385 9.2771 2.2501 9.2771H15.7501C16.7063 9.2771 17.4938 8.4896 17.4938 7.53335V2.3021C17.4938 1.34585 16.7063 0.55835 15.7501 0.55835ZM16.2563 7.53335C16.2563 7.8146 16.0313 8.0396 15.7501 8.0396H2.2501C1.96885 8.0396 1.74385 7.8146 1.74385 7.53335V2.3021C1.74385 2.02085 1.96885 1.79585 2.2501 1.79585H15.7501C16.0313 1.79585 16.2563 2.02085 16.2563 2.3021V7.53335Z"
                            fill=""
                          />
                          <path
                            d="M6.13135 10.9646H2.2501C1.29385 10.9646 0.506348 11.7521 0.506348 12.7083V15.8021C0.506348 16.7583 1.29385 17.5458 2.2501 17.5458H6.13135C7.0876 17.5458 7.8751 16.7583 7.8751 15.8021V12.7083C7.90322 11.7521 7.11572 10.9646 6.13135 10.9646ZM6.6376 15.8021C6.6376 16.0833 6.4126 16.3083 6.13135 16.3083H2.2501C1.96885 16.3083 1.74385 16.0833 1.74385 15.8021V12.7083C1.74385 12.4271 1.96885 12.2021 2.2501 12.2021H6.13135C6.4126 12.2021 6.6376 12.4271 6.6376 12.7083V15.8021Z"
                            fill=""
                          />
                          <path
                            d="M15.75 10.9646H11.8688C10.9125 10.9646 10.125 11.7521 10.125 12.7083V15.8021C10.125 16.7583 10.9125 17.5458 11.8688 17.5458H15.75C16.7063 17.5458 17.4938 16.7583 17.4938 15.8021V12.7083C17.4938 11.7521 16.7063 10.9646 15.75 10.9646ZM16.2562 15.8021C16.2562 16.0833 16.0312 16.3083 15.75 16.3083H11.8688C11.5875 16.3083 11.3625 16.0833 11.3625 15.8021V12.7083C11.3625 12.4271 11.5875 12.2021 11.8688 12.2021H15.75C16.0312 12.2021 16.2562 12.4271 16.2562 12.7083V15.8021Z"
                            fill=""
                          />
                        </g>
                        <defs>
                          <clipPath id="clip0_130_9807">
                            <rect
                              width="18"
                              height="18"
                              fill="white"
                              transform="translate(0 0.052124)"
                            />
                          </clipPath>
                        </defs>
                      </svg>
                      UI Elements
                      <svg
                        className={`absolute right-4 top-1/2 -translate-y-1/2 fill-current ${open && 'rotate-180'}`}
                        width="20"
                        height="20"
                        viewBox="0 0 20 20"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          fillRule="evenodd"
                          clipRule="evenodd"
                          d="M4.41107 6.9107C4.73651 6.58527 5.26414 6.58527 5.58958 6.9107L10.0003 11.3214L14.4111 6.91071C14.7365 6.58527 15.2641 6.58527 15.5896 6.91071C15.915 7.23614 15.915 7.76378 15.5896 8.08922L10.5896 13.0892C10.2641 13.4147 9.73651 13.4147 9.41107 13.0892L4.41107 8.08922C4.08563 7.76378 4.08563 7.23614 4.41107 6.9107Z"
                          fill=""
                        />
                      </svg>
                    </NavLink>
                    <div
                      className={`translate transform overflow-hidden transition-all duration-300 ease-in-out ${open ? 'max-h-96' : 'max-h-0'
                        }`}
                    >
                      <ul className="mb-5.5 mt-4 flex flex-col gap-2.5 pl-6">
                        <li>
                          <NavLink
                            to="/ui/alerts"
                            className={({ isActive }) =>
                              'group relative flex items-center gap-2.5 rounded-md px-4 font-medium  duration-300 ease-in-out hover:text-gray-900 dark:hover:text-white ' +
                              (isActive && 'text-gray-900 font-bold dark:text-white')
                            }
                          >
                            Alerts
                          </NavLink>
                        </li>
                        <li>
                          <NavLink
                            to="/ui/buttons"
                            className={({ isActive }) =>
                              'group relative flex items-center gap-2.5 rounded-md px-4 font-medium  duration-300 ease-in-out hover:text-gray-900 dark:hover:text-white ' +
                              (isActive && 'text-gray-900 font-bold dark:text-white')
                            }
                          >
                            Buttons
                          </NavLink>
                        </li>
                      </ul>
                    </div>
                  </React.Fragment>
                )}
              </SidebarLinkGroup>
            </ul>
          </div>
        </nav>
      </div>
    </aside>
  );
};

export default Sidebar;
