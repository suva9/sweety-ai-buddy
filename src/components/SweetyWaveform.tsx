import { motion } from "framer-motion";

interface SweetyWaveformProps {
  isActive: boolean;
  isProcessing: boolean;
}

const SweetyWaveform = ({ isActive, isProcessing }: SweetyWaveformProps) => {
  const barCount = 32;

  return (
    <div className="flex items-center justify-center gap-[2px] h-8">
      {Array.from({ length: barCount }).map((_, i) => (
        <motion.div
          key={i}
          className="w-[2px] bg-primary"
          initial={{ height: 2 }}
          animate={
            isProcessing
              ? {
                  height: [4, 20 + Math.random() * 12, 4],
                  opacity: [0.4, 1, 0.4],
                }
              : isActive
              ? { height: [2, 6 + Math.sin(i * 0.5) * 4, 2], opacity: [0.3, 0.7, 0.3] }
              : { height: 2, opacity: 0.3 }
          }
          transition={
            isProcessing
              ? {
                  duration: 0.4 + Math.random() * 0.4,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: i * 0.02,
                }
              : isActive
              ? {
                  duration: 2 + Math.random(),
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: i * 0.05,
                }
              : { duration: 0.5 }
          }
        />
      ))}
    </div>
  );
};

export default SweetyWaveform;
