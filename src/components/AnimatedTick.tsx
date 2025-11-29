const AnimatedTick = () => {
  return (
    <div className="inline-flex items-center gap-2 text-green-600 font-medium">
      <span>Payment All Done</span>
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="animate-tick"
      >
        <circle
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="2"
          fill="none"
          className="tick-circle"
        />
        <path
          d="M8 12l3 3l5-6"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="tick-path"
        />
      </svg>
      <style>{`
        @keyframes tickPulse {
          0%, 100% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.1);
            opacity: 0.8;
          }
        }
        
        @keyframes tickDraw {
          0% {
            stroke-dasharray: 0, 100;
          }
          100% {
            stroke-dasharray: 100, 0;
          }
        }
        
        @keyframes circleGrow {
          0% {
            transform: scale(0.9);
          }
          50% {
            transform: scale(1.05);
          }
          100% {
            transform: scale(1);
          }
        }
        
        .animate-tick {
          animation: tickPulse 2s ease-in-out infinite;
        }
        
        .tick-circle {
          animation: circleGrow 2s ease-in-out infinite;
          transform-origin: center;
        }
        
        .tick-path {
          stroke-dasharray: 100;
          animation: tickDraw 1.5s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default AnimatedTick;
