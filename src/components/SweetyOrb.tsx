import { motion } from "framer-motion";

interface SweetyOrbProps {
  isProcessing?: boolean;
  size?: "sm" | "md" | "lg";
}

const SweetyOrb = ({ isProcessing = false, size = "md" }: SweetyOrbProps) => {
  const sizeMap = { sm: "w-16 h-16", md: "w-32 h-32", lg: "w-48 h-48" };

  return (
    <div className={`relative ${sizeMap[size]} flex items-center justify-center`}>
      {/* Outer glow */}
      <motion.div
        className="absolute inset-0 rounded-full"
        style={{
          background: "radial-gradient(circle, hsl(340 80% 50% / 0.3), hsl(200 100% 50% / 0.2), transparent 70%)",
        }}
        animate={isProcessing ? { scale: [1, 1.3, 1], opacity: [0.3, 0.6, 0.3] } : { scale: [1, 1.1, 1], opacity: [0.2, 0.4, 0.2] }}
        transition={{ duration: isProcessing ? 1 : 3, repeat: Infinity, ease: "easeInOut" }}
      />
      
      {/* Main orb */}
      <motion.div
        className="relative w-3/4 h-3/4 rounded-full overflow-hidden"
        style={{
          background: "linear-gradient(135deg, hsl(340 80% 45%), hsl(280 60% 40%), hsl(200 100% 50%))",
        }}
        animate={
          isProcessing
            ? { rotate: [0, 360], scale: [1, 1.05, 1] }
            : { rotate: [0, 360] }
        }
        transition={{
          rotate: { duration: isProcessing ? 3 : 20, repeat: Infinity, ease: "linear" },
          scale: isProcessing ? { duration: 1, repeat: Infinity, ease: "easeInOut" } : undefined,
        }}
      >
        {/* Inner shimmer layers */}
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{
            background: "radial-gradient(ellipse at 30% 30%, hsl(0 0% 100% / 0.3), transparent 60%)",
          }}
          animate={{ opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{
            background: "radial-gradient(ellipse at 70% 70%, hsl(200 100% 60% / 0.4), transparent 50%)",
          }}
          animate={{ opacity: [0.4, 0.7, 0.4], rotate: [0, -180] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        />
      </motion.div>

      {/* Ring */}
      <motion.div
        className="absolute inset-1 rounded-full border border-foreground/10"
        animate={isProcessing ? { borderColor: ["hsl(200 100% 60% / 0.2)", "hsl(340 80% 55% / 0.3)", "hsl(200 100% 60% / 0.2)"] } : {}}
        transition={{ duration: 2, repeat: Infinity }}
      />
    </div>
  );
};

export default SweetyOrb;
