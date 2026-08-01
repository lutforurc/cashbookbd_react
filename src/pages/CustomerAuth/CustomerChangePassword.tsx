import { useEffect, useState } from "react";
import { Formik, Form, Field, ErrorMessage } from "formik";
import * as Yup from "yup";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import { FiAlertCircle, FiCheck, FiEye, FiEyeOff, FiLock, FiShield } from "react-icons/fi";
import { changeCustomerPassword } from "../../features/customerAuthReducer";
import ROUTES from "../../components/services/appRoutes";

// Kept in step with the API's own rule; the hint, the validator and the
// "matched" tick all read from here.
const MIN_LENGTH = 6;

/**
 * The step straight after a first sign-in, so it wears the same clothes as the
 * login page the customer has just come from -- same card, same inputs, same
 * eye toggle. Arriving somewhere that looks unrelated is exactly what makes a
 * password prompt feel untrustworthy.
 */
const CustomerChangePassword = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { mustChange } = useSelector((state: any) => state.customerAuth);

  const [formError, setFormError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const initialValues = { password: "", password_confirmation: "" };

  const validationSchema = Yup.object({
    password: Yup.string()
      .min(MIN_LENGTH, `Password must be at least ${MIN_LENGTH} characters`)
      .required("New password is required"),
    password_confirmation: Yup.string()
      .oneOf([Yup.ref("password")], "Passwords do not match")
      .required("Please confirm your password"),
  });

  useEffect(() => {
    document.title = "Set a New Password";
  }, []);

  const handleSubmit = (values: any, { setSubmitting }: any) => {
    setFormError("");
    dispatch(
      changeCustomerPassword({
        password: values.password,
        password_confirmation: values.password_confirmation,
        callback: () => {
          toast.success("Password changed successfully");
          navigate(ROUTES.customerHome, { replace: true });
        },
        onError: (message: string) => {
          setFormError(message);
          setSubmitting(false);
        },
      }) as any
    );
  };

  const fieldClass =
    "w-full rounded-lg border border-stroke bg-transparent py-2.5 pl-11 pr-12 text-black outline-none transition focus:border-primary focus-visible:shadow-none dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary";

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 px-4 py-10 dark:bg-boxdark-2">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <span className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary dark:bg-primary/20">
            <FiShield className="h-7 w-7" />
          </span>
          <h1 className="text-2xl font-semibold text-black dark:text-white">
            Set a New Password
          </h1>
          {mustChange && (
            // A sentence to a line, rather than left to wrap where it likes --
            // free wrapping left "only you know." stranded on a line of its own.
            <p className="mt-1.5 text-sm leading-relaxed text-body dark:text-bodydark2">
              <span className="block">Your account still uses the default password.</span>
              <span className="block">Please replace it with one only you know.</span>
            </p>
          )}
        </div>

        <div className="rounded-xl bg-white p-6 shadow-default dark:bg-boxdark sm:p-7">
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
            {({ isSubmitting, values }) => {
              // Both boxes reveal together. They hold the same secret, and
              // showing one while the other stays hidden helps nobody.
              const matched =
                values.password.length >= MIN_LENGTH &&
                values.password === values.password_confirmation;

              return (
                <Form>
                  <div className="mb-4">
                    <label
                      htmlFor="password"
                      className="mb-2.5 block font-medium text-black dark:text-white"
                    >
                      New Password
                    </label>
                    <div className="relative">
                      <FiLock className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-body dark:text-bodydark2" />
                      <Field
                        id="password"
                        name="password"
                        type={showPassword ? "text" : "password"}
                        autoComplete="new-password"
                        placeholder="Choose a new password"
                        className={fieldClass}
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
                      At least {MIN_LENGTH} characters. Avoid your mobile number
                      or date of birth.
                    </p>
                  </div>

                  <div className="mb-5">
                    <label
                      htmlFor="password_confirmation"
                      className="mb-2.5 block font-medium text-black dark:text-white"
                    >
                      Confirm Password
                    </label>
                    <div className="relative">
                      <FiLock className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-body dark:text-bodydark2" />
                      <Field
                        id="password_confirmation"
                        name="password_confirmation"
                        type={showPassword ? "text" : "password"}
                        autoComplete="new-password"
                        placeholder="Type it once more"
                        className={fieldClass}
                      />
                      {/* Said as soon as it is true, so a mismatch is caught
                          here rather than after the form has been sent. */}
                      {matched && (
                        <FiCheck className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-meta-3" />
                      )}
                    </div>
                    <ErrorMessage
                      name="password_confirmation"
                      component="div"
                      className="mt-1.5 text-sm text-danger"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-3 font-medium text-white transition hover:bg-opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSubmitting ? (
                      <>
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <FiShield className="h-5 w-5" />
                        Save Password
                      </>
                    )}
                  </button>
                </Form>
              );
            }}
          </Formik>
        </div>

        <p className="mt-5 text-center text-xs text-body dark:text-bodydark2">
          You will use this password the next time you sign in.
        </p>
      </div>
    </div>
  );
};

export default CustomerChangePassword;
