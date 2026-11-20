export default function PageHeader({ title, description, action }) {
  return (
    <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-veritas-text">{title}</h1>
        {description && <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-veritas-muted">{description}</p>}
      </div>
      {action}
    </div>
  )
}
