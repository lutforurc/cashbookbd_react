import React from 'react';
import {
  BiErrorCircle,
  BiTimeFive,
  BiLoaderCircle,
  BiAlarm,
  BiCheckCircle,
  BiAdjust
} from 'react-icons/bi';
import { firstCharacterUppercase, formatRoleName } from './formatRoleName';

const StatusIcon = ({ status }: { status: string }) => {
  if (status === 'overdue') {
    return (
      <div className="flex items-center gap-1 text-red-600 font-semibold">
        <BiErrorCircle /> Overdue
      </div>
    );
  } else if (status === 'upcoming') {
    return (
      <div className="flex items-center gap-1 text-orange-600 font-semibold">
        <BiTimeFive /> Upcoming
      </div>
    );
  } else if (status === 'pending') {
    return (
      <div className="flex items-center gap-1 text-sky-600 font-semibold">
        <BiLoaderCircle /> Pending
      </div>
    );
  } 
  else if (status === 'due today') {
    return (
      <div className="flex items-center gap-1 text-orange-500 font-semibold">
        <BiAlarm /> Today
      </div>
    );
  } else if (status === 'paid (good)') {
    return (
      <div className="flex items-center gap-1 text-green-600 font-semibold">
        <BiAlarm /> Paid (good)
      </div>
    );
  } 
  else if (status === 'paid (bad)') {
    return (
      <div className="flex items-center gap-1 text-red-600 font-semibold">
        <BiAlarm /> Paid (bad)
      </div>
    );
  } 
  else if (status === 'partial' ) {
    return (
      <div className="flex items-center gap-1 text-yellow-600 font-semibold">
        <BiAdjust /> Partial
      </div>
    );
  } 
  else if (status === 'upcoming (partial)' ) {
    return (
      <div className="flex items-center gap-1 text-green-600 font-semibold">
        <BiAdjust /> Upcoming (partial)
      </div>
    );
  } 
  
  else if (status === 'on-time') {
    return (
      <div className="flex items-center gap-1 text-emerald-600 font-semibold">
        <BiCheckCircle /> On Time
      </div>
    );
  } else {
    return (
      <span className=" flex  items-center gap-1 text-green-700 text-left font-semibold">
        <BiCheckCircle /> { firstCharacterUppercase( status)}
      </span>
    );
  }
};

export default StatusIcon;
