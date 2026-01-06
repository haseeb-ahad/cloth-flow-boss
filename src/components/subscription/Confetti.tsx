import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Particle {
  id: number;
  x: number;
  y: number;
  color: string;
  rotation: number;
  scale: number;
  shape: "square" | "circle" | "triangle";
}

const colors = [
  "#FFD700", // Gold
  "#FF6B6B", // Red
  "#4ECDC4", // Teal
  "#45B7D1", // Blue
  "#96CEB4", // Green
  "#FFEAA7", // Yellow
  "#DDA0DD", // Plum
  "#98D8C8", // Mint
  "#F7DC6F", // Light Yellow
  "#BB8FCE", // Purple
];

const Confetti = () => {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    const newParticles: Particle[] = [];
    const particleCount = 100;

    for (let i = 0; i < particleCount; i++) {
      newParticles.push({
        id: i,
        x: Math.random() * 100,
        y: -10 - Math.random() * 20,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        scale: Math.random() * 0.5 + 0.5,
        shape: ["square", "circle", "triangle"][Math.floor(Math.random() * 3)] as "square" | "circle" | "triangle",
      });
    }

    setParticles(newParticles);

    const timer = setTimeout(() => {
      setParticles([]);
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  const getShape = (shape: string, color: string) => {
    switch (shape) {
      case "circle":
        return (
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: color }}
          />
        );
      case "triangle":
        return (
          <div
            className="w-0 h-0 border-l-[6px] border-r-[6px] border-b-[10px] border-l-transparent border-r-transparent"
            style={{ borderBottomColor: color }}
          />
        );
      default:
        return (
          <div
            className="w-3 h-3"
            style={{ backgroundColor: color }}
          />
        );
    }
  };

  return (
    <div className="fixed inset-0 pointer-events-none z-[9999] overflow-hidden">
      <AnimatePresence>
        {particles.map((particle) => (
          <motion.div
            key={particle.id}
            initial={{
              x: `${particle.x}vw`,
              y: `${particle.y}vh`,
              rotate: particle.rotation,
              scale: particle.scale,
              opacity: 1,
            }}
            animate={{
              y: "110vh",
              rotate: particle.rotation + Math.random() * 720,
              x: `${particle.x + (Math.random() - 0.5) * 30}vw`,
            }}
            exit={{ opacity: 0 }}
            transition={{
              duration: Math.random() * 2 + 3,
              ease: "linear",
            }}
            className="absolute"
          >
            {getShape(particle.shape, particle.color)}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export default Confetti;