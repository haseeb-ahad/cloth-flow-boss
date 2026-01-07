import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

// Common timezones with labels
export const TIMEZONES = [
  { value: "Pacific/Midway", label: "(UTC-11:00) Midway Island" },
  { value: "Pacific/Honolulu", label: "(UTC-10:00) Hawaii" },
  { value: "America/Anchorage", label: "(UTC-09:00) Alaska" },
  { value: "America/Los_Angeles", label: "(UTC-08:00) Pacific Time (US & Canada)" },
  { value: "America/Denver", label: "(UTC-07:00) Mountain Time (US & Canada)" },
  { value: "America/Chicago", label: "(UTC-06:00) Central Time (US & Canada)" },
  { value: "America/New_York", label: "(UTC-05:00) Eastern Time (US & Canada)" },
  { value: "America/Caracas", label: "(UTC-04:00) Caracas" },
  { value: "America/Sao_Paulo", label: "(UTC-03:00) Brasilia" },
  { value: "Atlantic/South_Georgia", label: "(UTC-02:00) Mid-Atlantic" },
  { value: "Atlantic/Azores", label: "(UTC-01:00) Azores" },
  { value: "UTC", label: "(UTC+00:00) UTC" },
  { value: "Europe/London", label: "(UTC+00:00) London, Dublin" },
  { value: "Europe/Paris", label: "(UTC+01:00) Paris, Berlin, Rome" },
  { value: "Europe/Istanbul", label: "(UTC+03:00) Istanbul" },
  { value: "Asia/Dubai", label: "(UTC+04:00) Dubai, Abu Dhabi" },
  { value: "Asia/Karachi", label: "(UTC+05:00) Pakistan Standard Time (PKT)" },
  { value: "Asia/Kolkata", label: "(UTC+05:30) India Standard Time" },
  { value: "Asia/Dhaka", label: "(UTC+06:00) Dhaka" },
  { value: "Asia/Bangkok", label: "(UTC+07:00) Bangkok, Jakarta" },
  { value: "Asia/Shanghai", label: "(UTC+08:00) Beijing, Singapore" },
  { value: "Asia/Tokyo", label: "(UTC+09:00) Tokyo, Seoul" },
  { value: "Australia/Sydney", label: "(UTC+10:00) Sydney, Melbourne" },
  { value: "Pacific/Auckland", label: "(UTC+12:00) Auckland" },
];

// Get timezone offset in minutes for a given IANA timezone
export function getTimezoneOffset(timezone: string): number {
  const date = new Date();
  const utcDate = new Date(date.toLocaleString("en-US", { timeZone: "UTC" }));
  const tzDate = new Date(date.toLocaleString("en-US", { timeZone: timezone }));
  return (tzDate.getTime() - utcDate.getTime()) / 60000;
}

// Convert date to specified timezone
export function toTimezone(date: Date | string | null | undefined, timezone: string): Date {
  if (!date) return new Date();
  const d = typeof date === "string" ? new Date(date) : new Date(date);
  
  // Get the UTC time
  const utcTime = d.getTime() + d.getTimezoneOffset() * 60000;
  
  // Get offset for target timezone
  const offset = getTimezoneOffset(timezone);
  
  return new Date(utcTime + offset * 60000);
}

// Format date in specified timezone
export function formatDateInTimezone(
  date: Date | string | null | undefined,
  timezone: string,
  format: "date" | "datetime" | "time" = "date"
): string {
  if (!date) return "";
  
  const d = typeof date === "string" ? new Date(date) : date;
  
  try {
    const options: Intl.DateTimeFormatOptions = {
      timeZone: timezone,
    };
    
    switch (format) {
      case "datetime":
        options.day = "2-digit";
        options.month = "2-digit";
        options.year = "numeric";
        options.hour = "2-digit";
        options.minute = "2-digit";
        options.second = "2-digit";
        options.hour12 = true;
        break;
      case "time":
        options.hour = "2-digit";
        options.minute = "2-digit";
        options.hour12 = false;
        break;
      case "date":
      default:
        options.day = "2-digit";
        options.month = "2-digit";
        options.year = "numeric";
    }
    
    const formatted = new Intl.DateTimeFormat("en-GB", options).format(d);
    return formatted;
  } catch (error) {
    // Fallback to PKT if timezone is invalid
    return formatDateInTimezone(date, "Asia/Karachi", format);
  }
}

// Format date for input fields (YYYY-MM-DD)
export function formatDateInputInTimezone(date: Date | string | null | undefined, timezone: string): string {
  if (!date) return "";
  
  const d = typeof date === "string" ? new Date(date) : date;
  
  try {
    const options: Intl.DateTimeFormatOptions = {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    };
    
    const parts = new Intl.DateTimeFormat("en-CA", options).formatToParts(d);
    const year = parts.find(p => p.type === "year")?.value || "";
    const month = parts.find(p => p.type === "month")?.value || "";
    const day = parts.find(p => p.type === "day")?.value || "";
    
    return `${year}-${month}-${day}`;
  } catch (error) {
    return formatDateInputInTimezone(date, "Asia/Karachi");
  }
}

interface TimezoneContextType {
  timezone: string;
  setTimezone: (tz: string) => void;
  formatDate: (date: Date | string | null | undefined, format?: "date" | "datetime" | "time") => string;
  formatDateInput: (date: Date | string | null | undefined) => string;
  loading: boolean;
}

const TimezoneContext = createContext<TimezoneContextType | undefined>(undefined);

export const TimezoneProvider = ({ children }: { children: ReactNode }) => {
  const [timezone, setTimezoneState] = useState("Asia/Karachi");
  const [loading, setLoading] = useState(true);
  const [ownerId, setOwnerId] = useState<string | null>(null);

  useEffect(() => {
    const loadUserAndTimezone = async () => {
      try {
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setLoading(false);
          return;
        }

        // Get owner_id from user_roles
        const { data: roleData } = await supabase
          .from("user_roles")
          .select("role, admin_id")
          .eq("user_id", user.id)
          .single();

        const resolvedOwnerId = roleData?.role === "admin" ? user.id : roleData?.admin_id;
        setOwnerId(resolvedOwnerId || null);

        if (resolvedOwnerId) {
          const { data } = await supabase
            .from("app_settings")
            .select("timezone")
            .eq("owner_id", resolvedOwnerId)
            .maybeSingle();
          
          if (data?.timezone) {
            setTimezoneState(data.timezone);
          }
        }
      } catch (error) {
        console.error("Error loading timezone:", error);
      } finally {
        setLoading(false);
      }
    };
    
    loadUserAndTimezone();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      loadUserAndTimezone();
    });

    return () => subscription.unsubscribe();
  }, []);

  const setTimezone = async (tz: string) => {
    setTimezoneState(tz);
    
    if (!ownerId) return;
    
    try {
      await supabase
        .from("app_settings")
        .update({ timezone: tz } as any)
        .eq("owner_id", ownerId);
    } catch (error) {
      console.error("Error saving timezone:", error);
    }
  };

  const formatDate = (date: Date | string | null | undefined, format: "date" | "datetime" | "time" = "date") => {
    return formatDateInTimezone(date, timezone, format);
  };

  const formatDateInput = (date: Date | string | null | undefined) => {
    return formatDateInputInTimezone(date, timezone);
  };

  return (
    <TimezoneContext.Provider value={{ timezone, setTimezone, formatDate, formatDateInput, loading }}>
      {children}
    </TimezoneContext.Provider>
  );
};

export const useTimezone = () => {
  const context = useContext(TimezoneContext);
  if (context === undefined) {
    throw new Error("useTimezone must be used within a TimezoneProvider");
  }
  return context;
};

export default TimezoneContext;