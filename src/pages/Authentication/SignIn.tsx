import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useDispatch, useSelector } from 'react-redux';
import ROUTES from '../../components/services/appRoutes';
import Loader from '../../common/Loader';
import { login } from '../../features/authReducer';
import HelmetTitle from '../../components/utils/others/HelmetTitle';
import { getSettings } from '../../components/modules/settings/settingsSlice';
import coverImg from '../../images/cover/cover-02.png';
import { FiEye, FiEyeOff } from 'react-icons/fi';

const SignIn: React.FC = () => {
  const { isLoading, errors, isLoggedIn } = useSelector((state: any) => state.auth);

  const [checkPassword, setCheckPassword] = useState(true);
  const hostname = window.location.hostname;

  const getTitle = () => {
    if (hostname === 'accounts.nibirnirman.cashbookbd.com') return 'Sign In to Nibir Nirman';
    if (hostname === 'accounts.sinthia.cashbookbd.com') return 'Sign In to Sinthia Electronics';
    return 'Sign In to Cashbook';
  };

  const prevLocation = useLocation();
  const dispatch = useDispatch();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoggedIn) return;

    const { from } = (prevLocation.state as any) || {
      from: { pathname: ROUTES.dashboard },
    };

    navigate(from, { replace: true });
    dispatch(getSettings() as any);
  }, [isLoggedIn, prevLocation.state, navigate, dispatch]);

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    remember: false,
  });

  const handleChange = (e: any) => {
    const { name, value, type, checked } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleCheckPassword = () => setCheckPassword((p) => !p);

  const handleLogin = (e: any) => {
    e.preventDefault();

    if (!formData.email || !formData.password) {
      dispatch({
        type: 'AUTH/login/error',
        payload: { message: 'Please add the required info.' },
      });
      toast.error('Please add the required info.', { toastId: 'login-error' } as any);
      return;
    }

    dispatch(
      login({
        email: formData.email,
        password: formData.password,
        remember: formData.remember,
        callback: () => {},
      }) as any,
    );
  };

  useEffect(() => {
    const msg = errors?.message;
    if (!msg) return;

    toast.info(msg, { toastId: 'login-error' } as any);
  }, [errors?.message]);

  const handleSetUser = () => {
    setFormData({
      ...formData,
      email: 'lutforurc@gmail.com',
      password: 'Lutfor01911282149#',
    });

    if (process.env.NODE_ENV === 'development') {
      (document.getElementById('emailaddress') as HTMLInputElement).value = 'lutforurco@gmail.com';
      (document.getElementById('emailaddress') as HTMLInputElement).focus();

      setTimeout(() => {
        (document.getElementById('password') as HTMLInputElement).value = 'Lutfor01911282149#';
        (document.getElementById('password') as HTMLInputElement).focus();
      }, 100);
    }
  };

  return (
    <>
      {isLoading && <Loader />}

      <div className="fixed inset-0 bg-white shadow-default dark:bg-boxdark overflow-y-auto xl:overflow-hidden">

        <div className="grid h-full grid-cols-1 xl:grid-cols-2">

          <div className="hidden xl:flex items-center justify-center xl:border-r-2 border-stroke dark:border-strokedark bg-strokedark">
            <div className="w-full max-w-lg px-10 py-12 text-center">
              <Link className="mb-6 inline-block" to="/" />

              <p className="mb-6 text-sm text-white/90 font-semibold">
                Accounting, Inventory and HRMS System.
              </p>

              <img
                src={coverImg}
                alt="Inventory & Accounting Management System"
                className="mx-auto w-full max-w-md shadow-sm object-contain"
              />

              <div className="mt-6 grid grid-cols-1 gap-2 text-left text-sm text-white/90">
                <p>• Track Sales, Purchase, Stock</p>
                <p>• Voucher, Ledger, Reports</p>
                <p>• HRMS & Payroll workflow</p>
              </div>
            </div>
          </div>

          {/* RIGHT: Form Panel */}
          <div className="flex h-full items-center justify-center px-4 py-8 sm:px-10 xl:py-0">
            <div className="w-full max-w-md">
              <h2 className="mb-2 text-2xl font-bold text-black dark:text-white sm:text-title-xl2">
                <HelmetTitle title={getTitle()} />
              </h2>

              <p className="mb-1 text-sm text-black/60 dark:text-white/60 text-center w-full">
                Sign in to continue.
              </p>

              {process.env.NODE_ENV === 'development' ? (
                <div className="w-full text-center">
                  <button
                    className="text-sm font-medium text-primary hover:underline"
                    onClick={handleSetUser}
                    type="button"
                  >
                    Set User
                  </button>
                </div>
              ) : null}

              {/* ✅ Card: border ছিল না, add করা হলো */}
              <div className="rounded-xl  border-stroke bg-white p-6 shadow-sm dark:border-strokedark dark:bg-boxdark sm:p-8 mt-6">
                <form onSubmit={handleLogin}>
                  <div className="mb-4">
                    <label className="mb-2.5 block font-medium text-black dark:text-white">
                      Email
                    </label>
                    <div className="relative">
                      <input
                        type="email"
                        name="email"
                        id="emailaddress"
                        value={formData.email}
                        onChange={handleChange}
                        placeholder="Enter your email"
                        className="w-full border border-stroke bg-transparent py-2 pl-4 pr-4 text-black outline-none focus:border-primary focus-visible:shadow-none dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                      />
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="mb-2.5 block font-medium text-black dark:text-white">
                      Password
                    </label>
                    <div className="relative">
                      <input
                        name="password"
                        type={checkPassword ? 'password' : 'text'}
                        id="password"
                        value={formData.password}
                        onChange={handleChange}
                        placeholder="Enter your password"
                        className="w-full border border-stroke bg-transparent py-2 pl-4 pr-14 text-black outline-none focus:border-primary focus-visible:shadow-none dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                      />

                      {/* ✅ Show/Hide Password */}
                      <button
                        type="button"
                        onClick={handleCheckPassword}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-primary hover:opacity-80"
                      >
                        {checkPassword ? <FiEye className="h-5 w-5" /> : <FiEyeOff className="h-5 w-5" />}
                      </button>
                    </div>
                  </div>

                  <div className="mb-6 flex items-center justify-between">
                    <label className="flex cursor-pointer select-none items-center gap-2 text-sm text-black/70 dark:text-white/70">
                      <input
                        type="checkbox"
                        name="remember"
                        checked={formData.remember}
                        onChange={handleChange}
                        className="h-4 w-4 rounded border-stroke text-primary focus:ring-primary"
                      />
                      Remember me
                    </label>
                  </div>

                  <div className="mb-2">
                    <input
                      type="submit"
                      value="Sign In"
                      className="w-full cursor-pointer rounded-lg border border-primary bg-primary p-3 text-white transition hover:bg-opacity-90"
                    />
                  </div>
                </form>
              </div>

              <p className="mt-6 text-center text-xs text-black/50 dark:text-white/50">
                © {new Date().getFullYear()} CashbookBD - All rights reserved.
              </p>
            </div>
          </div>

        </div>
      </div>
    </>
  );
};

export default SignIn;
