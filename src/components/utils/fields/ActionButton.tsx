import { FiEdit2, FiTrash2 } from 'react-icons/fi';

type ActionButtonsProps = {
  row: {
    id: number;
    [key: string]: any;
  };
  handleEdit: (id: number) => void;
  handleDelete: (id: number) => void;
  showConfirmId: number | null;
  setShowConfirmId: (id: number | null) => void;
};

const ActionButtons: React.FC<ActionButtonsProps> = ({
  row,
  handleEdit,
  handleDelete,
  showConfirmId,
  setShowConfirmId,
}) => {
  return (
    <div className="relative flex gap-2 justify-center">
      {/* Edit Button */}
      <div
        className="btn btn-sm btn-outline"
        onClick={() => handleEdit(row.id)}
      >
        <span className="rounded">
          <FiEdit2 className="cursor-pointer" />
        </span>
      </div>

      {/* Delete Button */}
      <div
        className="btn btn-sm btn-outline"
        onClick={() => setShowConfirmId(row.id)}
      >
        <span className="rounded">
          <FiTrash2 className="cursor-pointer" />
          {/* <KeenIcon icon="trash" className="text-red-600" /> */}
        </span>
      </div>

      {/* Confirmation Popup */}
      {showConfirmId === row.id && (
        <div className="absolute top-12 right-0 z-50">
          {/* Arrow */}
          <div className="absolute -top-2 right-4 w-4 h-4 rotate-45 bg-white dark:bg-gray-300 border-t border-l border-gray-300 dark:border-gray-800"></div>

          {/* Popup Box */}
          <div className="bg-white dark:bg-gray-300 border border-gray-300 dark:border-gray-800 shadow-md rounded-md px-4 py-3">
            <p className="text-sm text-gray-800 dark:text-white mb-3">
              Are you sure?
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  handleDelete(row.id);
                  setShowConfirmId(null);
                }}
                className="px-3 py-1 text-sm text-white bg-red-600 hover:bg-red-700 rounded"
              >
                Yes
              </button>
              <button
                onClick={() => setShowConfirmId(null)}
                className="px-3 py-1 text-sm bg-gray-600 hover:bg-gray-300 text-gray-100 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-white rounded"
              >
                No
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ActionButtons;
