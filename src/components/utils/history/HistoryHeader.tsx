import React from "react";
import * as formatDate from "../utils-functions/formatDate";

type Props = {
  title: string;
  actionByName?: string | null;
  createdAt?: string | number | Date | null;
};

// ✅ named export / default export—দুইটাই সাপোর্ট
const chartDateTimeFn: unknown =
  (formatDate as any).chartDateTime ?? (formatDate as any).default;

function safeFormatDate(createdAt: Props["createdAt"]): string {
  if (createdAt == null) return "";

  // number হলে seconds হতে পারে—সেটাও ধরলাম
  const dateObj =
    createdAt instanceof Date
      ? createdAt
      : typeof createdAt === "number"
      ? new Date(createdAt > 1e12 ? createdAt : createdAt * 1000) // ms vs sec
      : new Date(createdAt);

  if (Number.isNaN(dateObj.getTime())) return "";

  // ✅ chartDateTime থাকলে সেটি try, না হলে fallback
  if (typeof chartDateTimeFn === "function") {
    try {
      // অনেক সময় chartDateTime Date নেয়
      return (chartDateTimeFn as any)(dateObj);
    } catch {
      try {
        // কিছু ক্ষেত্রে chartDateTime string নেয়
        return (chartDateTimeFn as any)(dateObj.toLocaleString("en-US"));
      } catch {
        // ignore
      }
    }
  }

  // fallback (never crash)
  return dateObj.toLocaleString("en-US");
}

const HistoryHeader: React.FC<Props> = ({ title, actionByName, createdAt }) => {
  const formattedDate = safeFormatDate(createdAt);

  return (
    <div className="flex justify-between mb-3">
      <div className="font-semibold text-gray-700 dark:text-gray-200">
        {title}
        {actionByName ? (
          <span className="ml-2 text-sm font-medium text-red-500 dark:text-gray-400">
            (Updated by: {actionByName})
          </span>
        ) : null}
      </div>

      <div className="text-sm text-gray-500 dark:text-gray-400">{formattedDate}</div>
    </div>
  );
};

export default HistoryHeader;
