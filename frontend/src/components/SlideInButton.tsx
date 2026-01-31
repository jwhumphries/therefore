import { motion } from "motion/react";

function ArrowRight({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  );
}

interface SlideInButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  /** Default background color (CSS variable or color value) */
  bgColor?: string;
  /** Hover background color (CSS variable or color value) */
  hoverBgColor?: string;
  /** Default text color */
  textColor?: string;
  /** Hover text color */
  hoverTextColor?: string;
  /** Button size */
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function SlideInButton({
  children,
  onClick,
  bgColor = "var(--default)",
  hoverBgColor = "var(--secondary)",
  textColor = "var(--foreground)",
  hoverTextColor = "var(--secondary-foreground)",
  size = "lg",
  className = "",
}: SlideInButtonProps) {
  const sizeClasses = {
    sm: "px-4 py-2 text-sm",
    md: "px-6 py-3 text-base",
    lg: "px-8 py-4 text-lg",
  };

  const iconSizes = {
    sm: 16,
    md: 18,
    lg: 20,
  };

  return (
    <motion.button
      onClick={onClick}
      className={`relative overflow-hidden font-display font-medium cursor-pointer ${sizeClasses[size]} ${className}`}
      style={{ backgroundColor: bgColor, color: textColor }}
      initial="initial"
      whileHover="hover"
      whileTap={{ scale: 0.98 }}
    >
      {/* Sliding background fill */}
      <motion.div
        className="absolute inset-0 origin-left"
        style={{ backgroundColor: hoverBgColor }}
        variants={{
          initial: { scaleX: 0 },
          hover: { scaleX: 1 },
        }}
        transition={{ type: "spring", duration: 0.5, bounce: 0.1 }}
      />

      {/* Content container */}
      <motion.div
        className="relative flex items-center justify-center gap-2"
        variants={{
          initial: { color: textColor },
          hover: { color: hoverTextColor },
        }}
        transition={{ duration: 0.3 }}
      >
        {/* Text */}
        <span>{children}</span>

        {/* Sliding icon */}
        <motion.div
          className="flex items-center"
          variants={{
            initial: { opacity: 0, x: -10, width: 0 },
            hover: { opacity: 1, x: 0, width: "auto" },
          }}
          transition={{ type: "spring", duration: 0.5, bounce: 0.1 }}
        >
          <ArrowRight size={iconSizes[size]} />
        </motion.div>
      </motion.div>
    </motion.button>
  );
}
