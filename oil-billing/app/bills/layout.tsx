import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Navbar from '@/components/layout/Navbar'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = cookies()
  const auth = cookieStore.get('oil_admin_auth')
  if (auth?.value !== 'true') redirect('/login')

  return (
    <div className="min-h-screen bg-amber-50">
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 py-5 pb-24 md:pb-8">
        {children}
      </main>
    </div>
  )
}
