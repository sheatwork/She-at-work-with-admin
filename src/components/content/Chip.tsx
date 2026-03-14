import { motion } from "framer-motion";

import { X } from "lucide-react";
export const COLOR_MAP: Record<string, string> = {
  primary: "bg-primary/10 text-primary hover:bg-primary/20",
  blue: "bg-blue-100 text-blue-700 hover:bg-blue-200",
  green: "bg-green-100 text-green-700 hover:bg-green-200",
  purple: "bg-purple-100 text-purple-700 hover:bg-purple-200",
  amber: "bg-amber-100 text-amber-700 hover:bg-amber-200",
};
export function Chip({
  children,
  color,
  icon,
  onRemove,
}: {
  children: React.ReactNode;
  color: string;
  icon: React.ReactNode;
  onRemove: () => void;
}) {
  return (
    <motion.span
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${COLOR_MAP[color] ?? COLOR_MAP.primary}`}
    >
      {icon}
      {children}
      <button
        onClick={onRemove}
        className="ml-1 rounded-full p-0.5 transition-colors"
      >
        <X className="h-3 w-3" />
      </button>
    </motion.span>
  );
}