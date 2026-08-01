import { useEffect, useState } from "react";
import { Formik, Form, Field, ErrorMessage } from "formik";
import * as Yup from "yup";
import { useLocation, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { FiAlertCircle, FiEye, FiEyeOff, FiLock, FiLogIn, FiSmartphone } from "react-icons/fi";
import { customerLogin } from "../../features/customerAuthReducer";
import ROUTES from "../../components/services/appRoutes";

/**
 * Dressed to match the staff sign-in rather than the plain form it replaced:
 * the same bordered inputs, the same leading icons and eye toggle, the same
 * brand primary. A customer arriving here has usually followed a link from an
 * invoice, so the page has to look like it belongs to the same company.
 */
const CustomerLogin = () => {
  const { isLoading, isLoggedIn } = useSelector((state: any) => state.customerAuth);

  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();

  const [formError, setFormError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const initialValues = { mobile: "", password: "" };

  const validationSchema = Yup.object({
    mobile: Yup.string()
      .matches(/^01[0-9]{9}$/, "Must be a valid 11-digit Bangladeshi number")
      .required("Mobile number is required"),
    password: Yup.string().required("Password is required"),
  });

  // Set directly rather than through HelmetTitle, which also draws a visible
  // heading -- on a centred card that would repeat the title and push the card
  // off centre.
  useEffect(() => {
    document.title = "Customer Login";
  }, []);

  useEffect(() => {
    if (isLoggedIn) {
      const { from } = (location.state as any) || { from: { pathname: ROUTES.customerHome } };
      navigate(from, { replace: true });
    }
  }, [isLoggedIn, location, navigate]);

  const handleSubmit = async (values: any, { setSubmitting }: any) => {
    setFormError("");

    dispatch(
      customerLogin({
        mobile: values.mobile,
        password: values.password,
        callback: () => {
          navigate(ROUTES.customerHome);
        },
        onError: (errorMessage: string) => {
          setFormError(errorMessage);
          setSubmitting(false);
        },
      })
    );
  };

  const fieldClass =
    "w-full rounded-lg border border-stroke bg-transparent py-2.5 pl-11 text-black outline-none transition focus:border-primary focus-visible:shadow-none dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary";

  return (
    <>
      <div className="flex min-h-screen items-center justify-center bg-gray-100 px-4 py-10 dark:bg-boxdark-2">
        <div className="w-full max-w-md">
          <div className="mb-6 text-center">
            {/* The mark is drawn rather than fetched: this page can be the first
                thing a customer loads, and it should not wait on an image. */}
            <span className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary dark:bg-primary/20">
              <FiLogIn className="h-7 w-7" />
            </span>
            <h1 className="text-2xl font-semibold text-black dark:text-white">
              Customer Login
            </h1>
            <p className="mt-1 text-sm text-body dark:text-bodydark2">
              See your statement, payments and dues.
            </p>
          </div>

          <div className="rounded-xl bg-white p-6 shadow-default dark:bg-boxdark sm:p-7">
            {/* A refusal is worth more room than a line of red text: the reason
                is the one thing the customer needs, and they are often here
                because something already went wrong. */}
            {formError && (
              <div
                role="alert"
                className="mb-5 flex items-start gap-2.5 rounded-lg border border-danger/30 bg-danger/10 p-3 text-sm text-danger"
              >
                <FiAlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <Formik
              initialValues={initialValues}
              validationSchema={validationSchema}
              onSubmit={handleSubmit}
            >
              {({ isSubmitting }) => {
                const busy = isSubmitting || isLoading;

                return (
                  <Form>
                    <div className="mb-4">
                      <label
                        htmlFor="mobile"
                        className="mb-2.5 block font-medium text-black dark:text-white"
                      >
                        Mobile Number
                      </label>
                      <div className="relative">
                        <FiSmartphone className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-body dark:text-bodydark2" />
                        <Field
                          id="mobile"
                          name="mobile"
                          type="tel"
                          // A number pad on a phone, and the field stops at the
                          // eleven digits the validator will accept anyway.
                          inputMode="numeric"
                          maxLength={11}
                          autoComplete="tel"
                          placeholder="01XXXXXXXXX"
                          className={`${fieldClass} pr-4`}
                        />
                      </div>
                      <ErrorMessage
                        name="mobile"
                        component="div"
                        className="mt-1.5 text-sm text-danger"
                      />
                    </div>

                    <div className="mb-5">
                      <label
                        htmlFor="password"
                        className="mb-2.5 block font-medium text-black dark:text-white"
                      >
                        Password
                      </label>
                      <div className="relative">
                        <FiLock className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-body dark:text-bodydark2" />
                        <Field
                          id="password"
                          name="password"
                          type={showPassword ? "text" : "password"}
                          autoComplete="current-password"
                          placeholder="Enter your password"
                          className={`${fieldClass} pr-12`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((shown) => !shown)}
                          aria-label={showPassword ? "Hide password" : "Show password"}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-primary hover:opacity-80"
                        >
                          {showPassword ? (
                            <FiEyeOff className="h-5 w-5" />
                          ) : (
                            <FiEye className="h-5 w-5" />
                          )}
                        </button>
                      </div>
                      <ErrorMessage
                        name="password"
                        component="div"
                        className="mt-1.5 text-sm text-danger"
                      />
                      <p className="mt-2 text-xs text-body dark:text-bodydark2">
                        First time? Your default password is your mobile number.
                      </p>
                    </div>

                    <button
                      type="submit"
                      disabled={busy}
                      className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-3 font-medium text-white transition hover:bg-opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {busy ? (
                        <>
                          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                          Logging in...
                        </>
                      ) : (
                        <>
                          <FiLogIn className="h-5 w-5" />
                          Login
                        </>
                      )}
                    </button>
                  </Form>
                );
              }}
            </Formik>
          </div>

          <p className="mt-5 text-center text-xs text-body dark:text-bodydark2">
            Trouble signing in? Please contact your branch office.
          </p>
        </div>
      </div>
    </>
  );
};

export default CustomerLogin;
