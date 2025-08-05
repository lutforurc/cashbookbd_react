// CustomerLoginForm.tsx
import { useState } from "react";
import axios from "axios";
import { Formik, Form, Field, ErrorMessage } from "formik";
import * as Yup from "yup";
import { API_BASE_URL } from "../../../services/apiRoutes";

const CustomerLoginForm = () => {
  const [error, setError] = useState("");

  const initialValues = { mobile: "" };

  const validationSchema = Yup.object({
    mobile: Yup.string()
      .matches(/^01[0-9]{9}$/, "Must be a valid 11-digit Bangladeshi number")
      .required("Mobile number is required"),
  });

  const handleSubmit = async (values: any, { setSubmitting }: any) => {
    try {

      const response = await axios.post(`${API_BASE_URL}/customer-login`, values);
      const { token, customer } = response.data;

      localStorage.setItem("customer_token", token);
      localStorage.setItem("customer", JSON.stringify(customer));
      setError("");
      // Redirect or set logged-in state
    } catch (err: any) {
      if (err.response?.data?.message) {
        setError(err.response.data.message);
      } else {
        setError("Something went wrong.");
      }
    }
    setSubmitting(false);
  };

  return (
    <div className="max-w-md mx-auto mt-10 p-4 bg-white rounded shadow">
      <h2 className="text-xl font-semibold mb-4">Customer Login</h2>
      {error && <p className="text-red-500">{error}</p>}

      <Formik initialValues={initialValues} validationSchema={validationSchema} onSubmit={handleSubmit}>
        {({ isSubmitting }) => (
          <Form className="space-y-4">
            <div>
              <label className="block">Mobile Number</label>
              <Field name="mobile" className="border p-2 w-full" />
              <ErrorMessage name="mobile" component="div" className="text-red-500" />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              {isSubmitting ? "Logging in..." : "Login"}
            </button>
          </Form>
        )}
      </Formik>
    </div>
  );
};

export default CustomerLoginForm;
