import { Link } from 'react-router-dom'
import PageHeader from '../components/common/PageHeader'

export default function NotFoundPage() {
  return (
    <>
      <PageHeader title="Page not found" description="The page you asked for does not exist." />
      <Link to="/" className="text-sm text-veritas-cyan hover:underline">
        Go to the overview
      </Link>
    </>
  )
}
