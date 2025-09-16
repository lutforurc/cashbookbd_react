import { useRef, useState, useEffect } from 'react';
import { FiEdit2, FiTrash2 } from 'react-icons/fi';

type ActionButtonsProps = {
  row: { id: number; [key: string]: any };
  showEdit?: boolean;
  showDelete?: boolean;
  showToggle?: boolean;
  handleEdit?: (id: number) => void;
  handleDelete?: (id: number) => void;
  handleToggle?: (id: number, enabled: boolean) => void;
  showConfirmId?: number | null;
  setShowConfirmId?: React.Dispatch<React.SetStateAction<number | null>>;
  initialEnabled?: boolean;
};

const ActionButtons: React.FC<ActionButtonsProps> = ({
  row,
  showEdit = false,
  showDelete = false,
  showToggle = false,
  handleEdit,
  handleDelete,
  handleToggle,
  showConfirmId,
  setShowConfirmId,
}) => {
  const btnRef = useRef<HTMLDivElement | null>(null);
  const [popupPos, setPopupPos] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const [enabled, setEnabled] = useState(row.status === 1);

  useEffect(() => {
    if (showConfirmId === row.id && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setPopupPos({
        top: rect.bottom + window.scrollY + 15,
        left: rect.left + window.scrollX - 100,
      });
    }
  }, [showConfirmId, row.id]);

  useEffect(() => {
    setEnabled(row.status === 1);
  }, [row.status]);

  const handleToggleClick = () => {
    const newState = !enabled;
    setEnabled(newState);
    handleToggle && handleToggle(row.id, newState);
  };

  return (
    <div className="relative flex gap-2 justify-center items-center">
      {/* Edit Button */}
      {showEdit && handleEdit && (
        <div
          className="btn btn-sm btn-outline cursor-pointer w-5 h-5 flex items-center justify-center"
          onClick={() => handleEdit(row.id)}
        >
          <FiEdit2 className="text-blue-600" />
        </div>
      )}

      {/* Delete Button */}
      {showDelete && handleDelete && (
        <div
          ref={btnRef}
          className="btn btn-sm btn-outline cursor-pointer w-5 h-5 flex items-center justify-center"
          onClick={() => setShowConfirmId?.(row.id)}
        >
          <FiTrash2 className="text-red-600" />
        </div>
      )}

      {/* Delete Confirmation Popup */}
      {showDelete && showConfirmId === row.id && popupPos && (
        <div
          className="fixed z-50"
          style={{ top: popupPos.top, left: popupPos.left }}
        >
          <div className="relative bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 shadow-md rounded-md px-4 py-3">
            <div className="absolute -top-2 right-8 w-4 h-4 bg-white dark:bg-gray-800 border-l border-t border-gray-300 dark:border-gray-700 rotate-45"></div>
            <p className="text-sm text-black-900 dark:text-gray-200 mb-3 text-center">
              Are you sure?
            </p>
            <div className="flex justify-center gap-3">
              <button
                onClick={() => {
                  handleDelete?.(row.id);
                  setShowConfirmId?.(null);
                }}
                className="px-4 py-1.5 text-sm text-white bg-red-600 hover:bg-red-700 rounded"
              >
                Yes
              </button>
              <button
                onClick={() => setShowConfirmId?.(null)}
                className="px-4 py-1.5 text-sm bg-gray-500 hover:bg-gray-600 text-white rounded"
              >
                No
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Enable/Disable Toggle */}
      {showToggle && handleToggle && (
        <div
          onClick={handleToggleClick}
          className={`relative w-12 h-6 flex items-center  bg-gray-300 dark:bg-gray-700 rounded-full p-1 cursor-pointer transition-colors duration-300 border ${enabled ? 'border-blue-600' : 'border-gray-400'}`}
        >
          <div
            className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform duration-300 ${
              row.status === 1 || enabled
                ? 'translate-x-5 duration-300 !bg-blue-600'
                : 'translate-x-0'
            }`}
          ></div>
        </div>
      )}
    </div>
  );
};

export default ActionButtons;
