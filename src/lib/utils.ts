import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Pakistan Standard Time (PKT) is UTC+5
const PKT_OFFSET = 5 * 60; // 5 hours in minutes

export function toPKT(date: Date | string | null | undefined): Date {
  if (!date) return new Date();
  const d = typeof date === 'string' ? new Date(date) : date;
  // Get the UTC time and add PKT offset
  const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
  return new Date(utc + (PKT_OFFSET * 60000));
}

export function formatDatePKT(date: Date | string | null | undefined, format: 'date' | 'datetime' | 'time' = 'date'): string {
  const pktDate = toPKT(date);
  
  const day = pktDate.getDate().toString().padStart(2, '0');
  const month = (pktDate.getMonth() + 1).toString().padStart(2, '0');
  const year = pktDate.getFullYear();
  const hours = pktDate.getHours().toString().padStart(2, '0');
  const minutes = pktDate.getMinutes().toString().padStart(2, '0');
  
  switch (format) {
    case 'datetime':
      return `${day}/${month}/${year} ${hours}:${minutes}`;
    case 'time':
      return `${hours}:${minutes}`;
    case 'date':
    default:
      return `${day}/${month}/${year}`;
  }
}

export function formatDateInputPKT(date: Date | string | null | undefined): string {
  const pktDate = toPKT(date);
  const year = pktDate.getFullYear();
  const month = (pktDate.getMonth() + 1).toString().padStart(2, '0');
  const day = pktDate.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
}
