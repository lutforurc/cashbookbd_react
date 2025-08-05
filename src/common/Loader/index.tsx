const Loader = () => {
  return (
    <div className="fixed before:content-[''] before:bg-gray-500 before:bg-opacity-30 before:absolute before:w-full before:-z-99 before:h-full left-[50%] top-[50%] -translate-y-[50%] -translate-x-[50%] w-full h-full z-999 bg-transparent bg-opacity-80 flex items-center justify-center text-sm text-left rtl:text-right text-gray-500 dark:text-gray-400">
      <div className="h-12 w-12 animate-spin rounded-full border-6 border-solid border-blue-600  border-t-transparent"></div>
    </div>
  );
};

export default Loader;
