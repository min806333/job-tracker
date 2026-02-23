export function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="bg-zinc-900 rounded-2xl p-6 space-y-4">
      <h2 className="text-sm font-semibold text-zinc-400 tracking-wide">
        {title}
      </h2>
      {children}
    </section>
  )
}