import JournalTable from "./JournalTable";

const JournalSection = ({ label, data, coaNameMap }) => {
  const masters = data?.acc_transaction_master || [];

  return (
    <div>
      <p className="font-semibold text-sm mb-1 text-gray-700 dark:text-gray-300">
        {label}
      </p>

      {!masters.length ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">No entries</p>
      ) : (
        masters.map((m, mi) => (
          <JournalTable
            key={m?.id ?? mi}
            tableKey={m?.id ?? mi}
            details={m?.acc_transaction_details || []}
            coaNameMap={coaNameMap}
          />
        ))
      )}
    </div>
  );
};

export default JournalSection;