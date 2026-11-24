import React, { useState } from 'react';
import HelmetTitle from '../../utils/others/HelmetTitle';
import InputElement from '../../utils/fields/InputElement';
import { ButtonLoading } from '../../../pages/UiElements/CustomButtons';
import { FiHome, FiSave } from 'react-icons/fi';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { storeDayClose } from '../settings/settingsSlice'; // ✅ Make sure this path is correct
import { storeCategory } from './categorySlice';
import { setTime } from 'react-datepicker/dist/date_utils';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../../../i18n/useLanguage';
import { useTranslation } from 'react-i18next';
import BilingualInput from '../../utils/fields/BilingualInput';

interface CategoryFormValues {
  category_name: string;
  name_local: string;
  description: string;
  description_local: string;
}

const AddCategory: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { isLoading } = useSelector((state: any) => state.settings); // Adjust typing as needed
  const [saveButtonLoading, setSaveButtonLoading] = useState(false);
  const { localCode, localName } = useLanguage();
  const { t } = useTranslation('common');

  const validationSchema = Yup.object({
    category_name: Yup.string().required('Category name is required'),
    // "Enable Bangla" on: the Bangla name is required too.
    name_local: localCode
      ? Yup.string().required(t('data.localRequired', { field: 'Category Name', language: localName }))
      : Yup.string().nullable(),
    description: Yup.string().required('Description is required'),
    description_local: localCode
      ? Yup.string().required(t('data.localRequired', { field: 'Category Description', language: localName }))
      : Yup.string().nullable(),
  });

  const formik = useFormik<CategoryFormValues>({
    initialValues: {
      category_name: '',
      name_local: '',
      description: '',
      description_local: '',
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
        <BilingualInput
          name="category_name"
          kind="name"
          value={values.category_name}
          localValue={values.name_local}
          placeholder="Category Name"
          label="Enter Category Name"
          onChange={handleChange}
          onLocalChange={(value) => formik.setFieldValue('name_local', value)}
        />
        {errors.category_name && touched.category_name && (
          <div className="text-red-500 text-sm">{errors.category_name}</div>
        )}
        {errors.name_local && touched.name_local && (
          <div className="text-red-500 text-sm">{errors.name_local}</div>
        )}

        <BilingualInput
          name="description"
          kind="description"
          value={values.description}
          localValue={values.description_local}
          placeholder="Enter Category Description"
          label="Category Description"
          onChange={handleChange}
          onLocalChange={(value) => formik.setFieldValue('description_local', value)}
        />
        {errors.description && touched.description && (
          <div className="text-red-500 text-sm">{errors.description}</div>
        )}
        {errors.description_local && touched.description_local && (
          <div className="text-red-500 text-sm">{errors.description_local}</div>
        )}

        <div className="grid grid-cols-1 gap-x-1 gap-y-1 md:grid-cols-2">
          <ButtonLoading
            type="submit"
            buttonLoading={saveButtonLoading}
            disabled={saveButtonLoading}
            label="Save"
            className="whitespace-nowrap text-center mr-0"
            icon={<FiSave className="text-lg ml-2 mr-2" />}
          />

          <ButtonLoading
            onClick={() => navigate('/category/category-list')}
            buttonLoading={false}
            label="Back"
            className="whitespace-nowrap text-center mr-0"
            icon={<FiHome className="text-lg ml-2 mr-2" />}
          />
        </div>
      </form>
    </>
  );
};

export default AddCategory;
