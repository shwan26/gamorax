interface GradientButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  type?: "button" | "submit";
}

export default function GradientButton({
  children,
  onClick,
  className = "",
  type = "button",
}: GradientButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      className={`
        w-full rounded-xl px-4 py-2 font-semibold text-white shadow-sm
        bg-gradient-to-r from-[#00D4FF] to-[#020024]
        hover:opacity-95 active:scale-[0.99] transition-all
        focus:outline-none focus:ring-2 focus:ring-[#00D4FF]/50
        ${className}
      `}
    >
      {children}
    </button>
  );
}
