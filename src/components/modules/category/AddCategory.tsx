import React, { useState } from 'react';
import HelmetTitle from '../../utils/others/HelmetTitle';
import InputElement from '../../utils/fields/InputElement';
import { ButtonLoading } from '../../../pages/UiElements/CustomButtons';
import { FiHome, FiSave } from 'react-icons/fi';
import Link from '../../utils/others/Link';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { storeDayClose } from '../settings/settingsSlice'; // ✅ Make sure this path is correct
import { storeCategory } from './categorySlice';
import { setTime } from 'react-datepicker/dist/date_utils';

interface CategoryFormValues {
  category_name: string;
  description: string;
}

const AddCategory: React.FC = () => {
  const dispatch = useDispatch();
  const { isLoading } = useSelector((state: any) => state.settings); // Adjust typing as needed
  const [saveButtonLoading, setSaveButtonLoading] = useState(false);

  const validationSchema = Yup.object({
    category_name: Yup.string().required('Category name is required'),
    description: Yup.string().required('Description is required'),
  });

  const formik = useFormik<CategoryFormValues>({
    initialValues: {
      category_name: '',
      description: '',
    },
    validationSchema,
    onSubmit: async (values, { resetForm }) => {
      try {
        setSaveButtonLoading(true);
        await dispatch(
          storeCategory(values, (message, success) => {
            if (success) {
              toast.success(message);
              setTimeout(() => {
                resetForm();
              }, 1000); // Simulate a delay for the loading state
            } else {
              toast.info(message?.message);
            }
          }),
        );
        setTimeout(() => {
          setSaveButtonLoading(false);
        }, 1000); // Simulate a delay for the loading state
      } catch (error) {
        toast.error('Something went wrong');
      }
    },
  });

  const { handleSubmit, handleChange, values, touched, errors, isSubmitting } =
    formik;

  return (
    <>
      <HelmetTitle title="Add Category" />

      <form
        onSubmit={handleSubmit}
        className="grid grid-cols-1 gap-2 w-full md:w-2/3 lg:w-1/2 justify-center mx-auto mt-5"
      >
        <InputElement
          id="category_name"
          value={values.category_name}
          name="category_name"
          placeholder="Category Name"
          label="Enter Category Name"
          className="mb-0"
          onChange={handleChange}
        />
        {errors.category_name && touched.category_name && (
          <div className="text-red-500 text-sm">{errors.category_name}</div>
        )}

        <InputElement
          id="description"
          value={values.description}
          name="description"
          placeholder="Enter Category Description"
          label="Category Description"
          className="mb-0"
          onChange={handleChange}
        />
        {errors.description && touched.description && (
          <div className="text-red-500 text-sm">{errors.description}</div>
        )}

        <div className="grid grid-cols-1 gap-x-1 gap-y-1 md:grid-cols-2">
          <ButtonLoading
            type="submit"
            buttonLoading={saveButtonLoading}
            disabled={saveButtonLoading}
            label="Save"
            className="whitespace-nowrap text-center mr-0 h-8"
            icon={<FiSave className="text-white text-lg ml-2 mr-2" />}
          />

          <Link
            to="/category/category-list"
            className="flex items-center text-nowrap justify-center mr-0 h-8"
          >
            <FiHome className="text-white text-lg ml-2 mr-2" />
            <span className="hidden md:block">Back</span>
          </Link>
        </div>
      </form>
    </>
  );
};

export default AddCategory;
