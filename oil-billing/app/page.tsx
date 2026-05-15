import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'

export default function Home() {
  const cookieStore = cookies()
  const auth = cookieStore.get('oil_admin_auth')
  if (auth?.value === 'true') redirect('/dashboard')
  else redirect('/login')
}
