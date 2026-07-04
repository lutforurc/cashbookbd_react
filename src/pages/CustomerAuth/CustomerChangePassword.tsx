import { useState } from "react";
import { Formik, Form, Field, ErrorMessage } from "formik";
import * as Yup from "yup";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import { changeCustomerPassword } from "../../features/customerAuthReducer";
import ROUTES from "../../components/services/appRoutes";

const CustomerChangePassword = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { mustChange } = useSelector((state: any) => state.customerAuth);

  const [formError, setFormError] = useState("");

  const initialValues = { password: "", password_confirmation: "" };

  const validationSchema = Yup.object({
    password: Yup.string()
      .min(4, "Password must be at least 4 characters")
      .required("New password is required"),
    password_confirmation: Yup.string()
      .oneOf([Yup.ref("password")], "Passwords do not match")
      .required("Please confirm your password"),
  });

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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="max-w-md w-full p-4 bg-white rounded shadow">
        <h2 className="text-xl font-semibold mb-1 text-center">Set a New Password</h2>
        {mustChange && (
          <p className="text-sm text-gray-600 mb-4 text-center">
            For your security, please replace the default password with one of your own.
          </p>
        )}

        {formError && <div className="text-red-600 mb-4 text-center">{formError}</div>}

        <Formik initialValues={initialValues} validationSchema={validationSchema} onSubmit={handleSubmit}>
          {({ isSubmitting }) => (
            <Form className="space-y-4">
              <div>
                <label htmlFor="password" className="block mb-1 font-medium">
                  New Password
                </label>
                <Field
                  type="password"
                  name="password"
                  className="border border-gray-300 p-2 w-full rounded focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500"
                />
                <ErrorMessage name="password" component="div" className="text-red-500 text-sm" />
              </div>

              <div>
                <label htmlFor="password_confirmation" className="block mb-1 font-medium">
                  Confirm Password
                </label>
                <Field
                  type="password"
                  name="password_confirmation"
                  className="border border-gray-300 p-2 w-full rounded focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500"
                />
                <ErrorMessage
                  name="password_confirmation"
                  component="div"
                  className="text-red-500 text-sm"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                {isSubmitting ? "Saving..." : "Save Password"}
              </button>
            </Form>
          )}
        </Formik>
      </div>
    </div>
  );
};

export default CustomerChangePassword;
