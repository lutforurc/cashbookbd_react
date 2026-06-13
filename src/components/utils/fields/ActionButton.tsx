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
  // Positioned with `fixed` so the confirm escapes the table cell's
  // `overflow:hidden` (truncate) and shows right beside the delete button.
  const [popupPos, setPopupPos] = useState<{ top: number; left: number } | null>(null);
  const [enabled, setEnabled] = useState(row.status === 1);

  useEffect(() => {
    if (showConfirmId === row.id && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setPopupPos({
        top: rect.top + rect.height / 2, // vertical centre of the button
        left: rect.left - 8,             // just to the left of the button
      });
    } else {
      setPopupPos(null);
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
          onClick={() => handleEdit(row)}
        >
          <FiEdit2 className="text-blue-600 text-lg" />
        </div>
      )}

      {/* Delete Button */}
      {showDelete && handleDelete && (
        <div
          ref={btnRef}
          className="btn btn-sm btn-outline cursor-pointer w-5 h-5 flex items-center justify-center"
          onClick={() => setShowConfirmId?.(row.id)}
        >
          <FiTrash2 className="text-red-600 text-lg" />
        </div>
      )}

      {/* Inline Confirm — shown right beside the delete button */}
      {showDelete && showConfirmId === row.id && popupPos && (
        <div
          className="fixed z-50 flex items-center gap-1 whitespace-nowrap rounded-md border border-gray-300 bg-white px-2 py-1 shadow-md dark:border-gray-700 dark:bg-gray-800"
          style={{
            top: popupPos.top,
            left: popupPos.left,
            transform: 'translate(-100%, -50%)',
          }}
        >
          <span className="text-xs text-gray-600 dark:text-gray-300">Sure?</span>
          <button
            onClick={() => {
              handleDelete?.(row.id);
              setShowConfirmId?.(null);
            }}
            className="rounded bg-red-600 px-2 py-0.5 text-xs text-white hover:bg-red-700"
          >
            Yes
          </button>
          <button
            onClick={() => setShowConfirmId?.(null)}
            className="rounded bg-gray-500 px-2 py-0.5 text-xs text-white hover:bg-gray-600"
          >
            No
          </button>
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
