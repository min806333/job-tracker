export function PrimaryButton({
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className="
        bg-emerald-600
        hover:bg-emerald-500
        active:scale-[0.98]
        text-white
        rounded-lg
        px-4 py-2
        transition-all
        shadow-md
      "
      {...props}
    >
      {children}
    </button>
  )
}