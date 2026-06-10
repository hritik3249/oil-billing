'use client'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { LayoutDashboard, Users, FileText, PlusCircle, LogOut, Droplets, Menu, X, ShoppingCart, UserCog, BarChart2, IndianRupee, Package } from 'lucide-react'
import { useState } from 'react'

const navItems = [
  { href: '/dashboard',  label: 'Dashboard',  icon: LayoutDashboard },
  { href: '/bills',      label: 'Bills',       icon: FileText },
  { href: '/bills/new',  label: 'New Bill',    icon: PlusCircle },
  { href: '/dues',       label: 'Dues',        icon: IndianRupee },
  { href: '/stock',      label: 'Stock',       icon: Package },
  { href: '/purchases',  label: 'Purchases',   icon: ShoppingCart },
  { href: '/employees',  label: 'Employees',   icon: UserCog },
  { href: '/customers',  label: 'Customers',   icon: Users },
  { href: '/pnl',        label: 'P&L Report',  icon: BarChart2 },
]

const bottomNav = [
  { href: '/dashboard',  label: 'Home',      icon: LayoutDashboard },
  { href: '/bills',      label: 'Bills',     icon: FileText },
  { href: '/bills/new',  label: 'New Bill',  icon: PlusCircle },
  { href: '/dues',       label: 'Dues',      icon: IndianRupee },
  { href: '/purchases',  label: 'Purchases', icon: ShoppingCart },
]

// Section-aware active state: /bills/abc123 highlights "Bills",
// but /bills/new only highlights "New Bill"
function isActive(pathname: string, href: string) {
  if (pathname === href) return true
  if (href === '/bills') return pathname.startsWith('/bills/') && pathname !== '/bills/new'
  if (href === '/bills/new') return false
  return pathname.startsWith(`${href}/`)
}

export default function Navbar() {
  const router   = useRouter()
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  const logout = async () => {
    await fetch('/api/auth', { method: 'DELETE' })
    router.push('/login')
    router.refresh()
  }

  return (
    <>
      <header className="bg-gradient-to-r from-amber-900 to-orange-700 text-white shadow-lg sticky top-0 z-50">
        <div className="flex items-center justify-between px-4 py-3 max-w-5xl mx-auto">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="w-9 h-9 bg-orange-400 rounded-xl flex items-center justify-center">
              <Droplets className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg tracking-wide">EMTA TRADERS</span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {navItems.map(({ href, label, icon: Icon }) => (
              <Link key={href} href={href}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-all
                  ${isActive(pathname, href) ? 'bg-white/20 text-white' : 'text-orange-100 hover:bg-white/10'}`}
              >
                <Icon className="w-4 h-4" />{label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <button onClick={logout} className="hidden md:flex items-center gap-1.5 text-orange-200 hover:text-white text-sm font-medium px-3 py-2 rounded-xl hover:bg-white/10 transition-all">
              <LogOut className="w-4 h-4" /> Logout
            </button>
            <button onClick={() => setOpen(!open)} className="md:hidden p-2 rounded-xl hover:bg-white/20">
              {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {open && (
          <div className="md:hidden border-t border-orange-600 bg-amber-900 px-4 py-3 space-y-1">
            {navItems.map(({ href, label, icon: Icon }) => (
              <Link key={href} href={href} onClick={() => setOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-base font-semibold transition-all
                  ${isActive(pathname, href) ? 'bg-orange-500 text-white' : 'text-orange-100 hover:bg-white/10'}`}
              >
                <Icon className="w-5 h-5" />{label}
              </Link>
            ))}
            <button onClick={logout} className="flex items-center gap-3 px-4 py-3 rounded-xl text-red-300 hover:bg-white/10 w-full text-base font-semibold">
              <LogOut className="w-5 h-5" /> Logout
            </button>
          </div>
        )}
      </header>

      {/* Bottom mobile nav - 5 items */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur border-t-2 border-amber-100 z-50 shadow-xl pb-safe">
        <div className="grid grid-cols-5 gap-0">
          {bottomNav.map(({ href, label, icon: Icon }) => {
            const active = isActive(pathname, href)
            return (
              <Link key={href} href={href}
                className={`flex flex-col items-center justify-center py-2 gap-0.5 transition-all active:scale-95
                  ${active ? 'text-orange-600' : 'text-gray-400'}`}
              >
                <span className={`px-3 py-0.5 rounded-full transition-colors ${active ? 'bg-orange-100' : ''}`}>
                  <Icon className="w-5 h-5" />
                </span>
                <span className={`text-xs ${active ? 'font-bold' : 'font-medium'}`}>{label}</span>
              </Link>
            )
          })}
        </div>
      </nav>
    </>
  )
}
