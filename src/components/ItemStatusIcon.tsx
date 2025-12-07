import { Check, X } from "lucide-react";

interface ItemStatusIconProps {
  isComplete: boolean;
}

const ItemStatusIcon = ({ isComplete }: ItemStatusIconProps) => {
  if (isComplete) {
    return (
      <div className="flex items-center justify-center">
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="text-green-500 animate-item-complete"
        >
          <circle
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="2"
            fill="none"
            className="item-complete-circle"
          />
          <path
            d="M8 12l3 3l5-6"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="item-complete-path"
          />
        </svg>
        <style>{`
          @keyframes itemCompletePulse {
            0%, 100% {
              transform: scale(1);
              opacity: 1;
            }
            50% {
              transform: scale(1.15);
              opacity: 0.9;
            }
          }
          
          @keyframes itemCompleteCircle {
            0% {
              stroke-dasharray: 0, 100;
            }
            100% {
              stroke-dasharray: 100, 0;
            }
          }
          
          @keyframes itemCompleteTick {
            0% {
              stroke-dasharray: 0, 50;
            }
            100% {
              stroke-dasharray: 50, 0;
            }
          }
          
          .animate-item-complete {
            animation: itemCompletePulse 1.5s ease-in-out infinite;
          }
          
          .item-complete-circle {
            stroke-dasharray: 100;
            animation: itemCompleteCircle 0.6s ease-out forwards;
            transform-origin: center;
          }
          
          .item-complete-path {
            stroke-dasharray: 50;
            animation: itemCompleteTick 0.4s ease-out 0.3s forwards;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center">
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="text-red-500 animate-item-incomplete"
      >
        <circle
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="2"
          fill="none"
          className="item-incomplete-circle"
        />
        <path
          d="M15 9l-6 6M9 9l6 6"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="item-incomplete-path"
        />
      </svg>
      <style>{`
        @keyframes itemIncompleteShake {
          0%, 100% {
            transform: translateX(0);
          }
          20%, 60% {
            transform: translateX(-2px);
          }
          40%, 80% {
            transform: translateX(2px);
          }
        }
        
        @keyframes itemIncompleteGlow {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.6;
          }
        }
        
        .animate-item-incomplete {
          animation: itemIncompleteGlow 1s ease-in-out infinite;
        }
        
        .item-incomplete-circle {
          transform-origin: center;
        }
        
        .item-incomplete-path {
          stroke-dasharray: 50;
        }
      `}</style>
    </div>
  );
};

export default ItemStatusIcon;
