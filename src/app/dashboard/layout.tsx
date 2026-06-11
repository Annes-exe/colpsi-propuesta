import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/layout/Sidebar'
import { CurrencyCalculator } from '@/components/layout/CurrencyCalculator'
import type { Profile } from '@/types/database.types'

export const metadata: Metadata = {
  title: 'Dashboard',
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Obtener perfil del usuario
  const profileResult = await supabase
    .from('profiles')
    .select('username, full_name, role')
    .eq('id', user.id!)
    .single()

  const profile = profileResult.data as Pick<Profile, 'username' | 'full_name' | 'role'> | null

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="main-content">
        {/* Topbar */}
        <header className="topbar">
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 600, color: '#0f172a' }}>
              Sistema de Gestión de Agremiados
            </h2>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <CurrencyCalculator />
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '6px 12px',
              background: '#f8fafc',
              borderRadius: 8,
              border: '1px solid #e2e8f0'
            }}>
              <div style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #2563eb, #0ea5e9)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: 13,
                fontWeight: 700,
              }}>
                {(profile?.full_name || profile?.username || 'A')[0].toUpperCase()}
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>
                  {profile?.full_name || profile?.username}
                </div>
                <div style={{ fontSize: 11, color: '#64748b', textTransform: 'capitalize' }}>
                  {profile?.role || 'admin'}
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="page-content">
          {children}
        </main>
      </div>
    </div>
  )
}
