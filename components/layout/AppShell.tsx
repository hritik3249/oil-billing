import { redirect } from 'next/navigation'
import Navbar from '@/components/layout/Navbar'
import { isAuthenticated } from '@/lib/auth-server'

// Shared auth-protected layout. The middleware already verifies the signed
// cookie; this is a second check so pages fail closed even without it.
export default async function AppShell({ children }: { children: React.ReactNode }) {
  if (!(await isAuthenticated())) redirect('/login')

  return (
    <div className="min-h-screen bg-amber-50">
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 py-5 pb-24 md:pb-8 animate-page-in">
        {children}
      </main>
    </div>
  )
}
