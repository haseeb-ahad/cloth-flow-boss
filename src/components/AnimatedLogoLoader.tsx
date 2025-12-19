import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface AnimatedLogoLoaderProps {
  size?: "sm" | "md" | "lg";
  text?: string;
  showMessage?: boolean;
  message?: string;
}

const AnimatedLogoLoader = ({
  size = "md",
  text,
  showMessage = false,
  message = "Loading...",
}: AnimatedLogoLoaderProps) => {
  const [loaderText, setLoaderText] = useState(text || "INVOICE");

  useEffect(() => {
    if (!text) {
      // Fetch loader text from system settings
      const fetchLoaderText = async () => {
        try {
          const { data, error } = await supabase
            .from("system_settings")
            .select("setting_value")
            .eq("setting_key", "loader_text")
            .single();

          if (!error && data?.setting_value) {
            setLoaderText(data.setting_value);
          }
        } catch (error) {
          console.error("Error fetching loader text:", error);
        }
      };
      fetchLoaderText();
    }
  }, [text]);

  const sizeClasses = {
    sm: { icon: "w-6 h-6", text: "text-sm", gap: "gap-1" },
    md: { icon: "w-10 h-10", text: "text-lg", gap: "gap-2" },
    lg: { icon: "w-16 h-16", text: "text-2xl", gap: "gap-3" },
  };

  const currentSize = sizeClasses[size];
  const letters = loaderText.split("");

  return (
    <div className="flex flex-col items-center justify-center space-y-4">
      <div className={`flex items-center ${currentSize.gap}`}>
        {/* Animated "i" icon similar to the logo */}
        <div className="relative">
          <svg
            viewBox="0 0 50 120"
            className={`${currentSize.icon} text-primary`}
            fill="currentColor"
          >
            {/* The "i" dot */}
            <rect
              x="8"
              y="0"
              width="34"
              height="34"
              rx="2"
              className="animate-pulse"
            />
            {/* The "i" body with curved bottom */}
            <path
              d="M42 45 L42 120 L42 120 C28 120 17 109 17 95 L17 65 L2 65 L2 65 C2 51 13 40 27 40 L42 40 L42 45 Z"
              className="animate-[pulse_1.5s_ease-in-out_infinite]"
              style={{ animationDelay: "0.2s" }}
            />
          </svg>
        </div>

        {/* Vertical divider */}
        <div
          className="w-px bg-foreground/30 self-stretch mx-1"
          style={{
            animation: "fadeIn 0.5s ease-out forwards",
            animationDelay: "0.3s",
            opacity: 0,
          }}
        />

        {/* Animated text - letter by letter */}
        <div className={`flex ${currentSize.gap} font-bold ${currentSize.text} text-foreground tracking-wider`}>
          {letters.map((letter, index) => (
            <span
              key={index}
              className="inline-block"
              style={{
                animation: `letterWave 1.2s ease-in-out infinite`,
                animationDelay: `${index * 0.1}s`,
              }}
            >
              {letter}
            </span>
          ))}
        </div>
      </div>

      {showMessage && (
        <p className="text-muted-foreground text-sm animate-pulse">{message}</p>
      )}

      <style>{`
        @keyframes letterWave {
          0%, 100% {
            transform: translateY(0);
            opacity: 1;
          }
          25% {
            transform: translateY(-4px);
            opacity: 0.8;
          }
          50% {
            transform: translateY(0);
            opacity: 1;
          }
          75% {
            transform: translateY(4px);
            opacity: 0.8;
          }
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
};

export default AnimatedLogoLoader;
