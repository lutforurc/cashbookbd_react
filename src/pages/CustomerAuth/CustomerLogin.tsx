import { useEffect, useState } from "react";
import { Formik, Form, Field, ErrorMessage } from "formik";
import * as Yup from "yup";
import { useLocation, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { customerLogin } from "../../features/customerAuthReducer";
import ROUTES from "../../components/services/appRoutes";

const CustomerLogin = () => {
  const { isLoading, errors, isLoggedIn } = useSelector((state: any) => state.customerAuth);

  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();

  const [formError, setFormError] = useState("");

  const initialValues = { mobile: "" };

  const validationSchema = Yup.object({
    mobile: Yup.string()
      .matches(/^01[0-9]{9}$/, "Must be a valid 11-digit Bangladeshi number")
      .required("Mobile number is required"),
  });

  useEffect(() => {
    if (isLoggedIn) {
      const { from } = location.state || { from: { pathname: ROUTES.customerHome } };
      navigate(from, { replace: true });
    }
  }, [isLoggedIn, location, navigate]);

  const handleSubmit = async (values: any, { setSubmitting }: any) => {
    setFormError("");

    dispatch(
      customerLogin({
        mobile: values.mobile,
        callback: (res: any) => {
          // ✅ You can extract token/data here if needed from res
          // localStorage.setItem("customer_token", res.token);
          // localStorage.setItem("customer_info", JSON.stringify(res.data));
          navigate(ROUTES.customerHome);
        },
        onError: (errorMessage: string) => {
          setFormError(errorMessage);
          setSubmitting(false);
        },
      })
    );
  };

return (
  <div className="min-h-screen flex items-center justify-center bg-gray-100">
    <div className="max-w-md w-full p-4 bg-white rounded shadow">
      <h2 className="text-xl font-semibold mb-4 text-center">Customer Login</h2>

      {formError && <div className="text-red-600 mb-4 text-center">{formError}</div>}

      <Formik initialValues={initialValues} validationSchema={validationSchema} onSubmit={handleSubmit}>
        {({ isSubmitting }) => (
          <Form className="space-y-4">
            <div>
              <label htmlFor="mobile" className="block mb-1 font-medium">
                Mobile Number
              </label>
              {/* <Field name="mobile" className="border p-2 w-full rounded focus-visible:none focus-visible:ring-blue-500" /> */}
              <Field name="mobile" className="border border-gray-300 p-2 w-full rounded focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500"
/>
              <ErrorMessage name="mobile" component="div" className="text-red-500 text-sm" />
            </div>

            <button
              type="submit"
              disabled={isSubmitting || isLoading}
              className="w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              {isSubmitting || isLoading ? "Logging in..." : "Login"}
            </button>
          </Form>
        )}
      </Formik>
    </div>
  </div>
);
};

export default CustomerLogin;
