import React, { useMemo, useRef } from 'react';
import { useSelector } from 'react-redux';
import { FiTrash2, FiUpload } from 'react-icons/fi';
import { toast } from 'react-toastify';
import { API_REMOTE_URL } from '../../services/apiRoutes';

/** Matches the API's limit so an oversized file fails before the upload. */
const MAX_PHOTO_KB = 150;
const MAX_PHOTO_BYTES = MAX_PHOTO_KB * 1024;

interface PhotoInputProps {
  id?: string;
  name: string;
  label?: string;
  /** A stored path from the API, or a data URL for a freshly picked file. */
  value?: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

/**
 * Reads the picked file as a data URL and hands it back as a plain string, so
 * the photo travels inside the same JSON payload as the rest of the form — the
 * API decodes it and stores the file. An untouched photo keeps the path it was
 * loaded with and is saved unchanged; clearing it removes the stored file.
 */
const PhotoInput: React.FC<PhotoInputProps> = ({
  id,
  name,
  label = 'Photo',
  value = '',
  onChange,
  disabled = false,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const environment = useSelector((state: any) => state.settings?.data?.env);

  // Same rule as the voucher images: production serves the Laravel project root,
  // so the stored path needs the `public/` segment there but not on local.
  const previewUrl = useMemo(() => {
    if (!value) return '';
    if (/^(https?:|data:|blob:)/i.test(value)) return value;

    const base = environment === 'local' ? API_REMOTE_URL : `${API_REMOTE_URL}/public`;

    return `${base}/${value.replace(/^\/+/, '')}`;
  }, [value, environment]);

  const clearFileInput = () => {
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please choose an image file.');
      clearFileInput();
      return;
    }

    if (file.size > MAX_PHOTO_BYTES) {
      toast.error(`The photo must be smaller than ${MAX_PHOTO_KB} KB.`);
      clearFileInput();
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      onChange(typeof reader.result === 'string' ? reader.result : '');
    };
    reader.onerror = () => {
      toast.error('The photo could not be read. Please try again.');
      clearFileInput();
    };
    reader.readAsDataURL(file);
  };

  const handleRemove = () => {
    onChange('');
    clearFileInput();
  };

  return (
    <div className="text-left flex flex-col">
      <label htmlFor={id || name} className="text-black dark:text-white">
        {label}
      </label>

      <div className="flex items-center gap-2">
        {previewUrl ? (
          <img
            src={previewUrl}
            alt={label}
            className="h-[2.4rem] w-[2.4rem] shrink-0 rounded-sm border border-gray-300 object-cover dark:border-gray-600"
          />
        ) : (
          <div className="flex h-[2.4rem] w-[2.4rem] shrink-0 items-center justify-center rounded-sm border border-dashed border-gray-300 text-gray-400 dark:border-gray-600">
            <FiUpload />
          </div>
        )}

        {/* Sits beside the preview so it is obvious which photo it clears. */}
        {value ? (
          <button
            type="button"
            onClick={handleRemove}
            disabled={disabled}
            title="Remove photo"
            aria-label="Remove photo"
            className="flex h-[2.4rem] w-[2.4rem] shrink-0 items-center justify-center rounded-sm border border-red-300 bg-red-50 text-red-600 hover:bg-red-100 disabled:opacity-50 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20"
          >
            <FiTrash2 size={20} />
          </button>
        ) : null}

        <input
          ref={inputRef}
          id={id || name}
          name={name}
          type="file"
          accept="image/*"
          disabled={disabled}
          onChange={handleFileChange}
          className="w-full text-sm text-black file:mr-2 file:rounded-sm file:border-0 file:bg-primary file:px-3 file:py-1 file:text-white dark:text-white"
        />
      </div>
    </div>
  );
};

export default PhotoInput;
