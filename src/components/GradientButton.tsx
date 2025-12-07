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
  type = "button"
}: GradientButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      className={`
        w-full py-2 rounded-md font-semibold text-white shadow-md 
        bg-gradient-to-r from-[#0593D1] to-[#034B6B]
        hover:opacity-90 active:scale-[0.98] transition-all
        ${className}
      `}
    >
      {children}
    </button>
  );
}
