import Button from '../components/ui/Button'

export default function NotFoundPage() {
  return (
    <div className="mx-auto max-w-[88rem] px-4 py-24 sm:px-8">
      <h1 className="t-display">Nothing resolves here.</h1>
      <p className="t-lead mt-6">The page you asked for does not exist, or has moved.</p>
      <div className="mt-8 flex gap-3">
        <Button to="/">Go to the overview</Button>
        <Button to="/analyze" variant="secondary">
          Open an investigation
        </Button>
      </div>
    </div>
  )
}
