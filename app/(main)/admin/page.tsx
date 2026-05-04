import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'
import { getServerT } from '@/lib/i18n/server'
import { UserManagement } from '@/components/admin/UserManagement'

export default async function AdminDashboardPage() {
  const { t } = await getServerT()
  const { userId } = await auth()
  if (!userId) redirect('/login')

  const supabase = await createClient()

  const cookieStore = await cookies()
  const activeProfileId = cookieStore.get('active_profile_id')?.value
  if (!activeProfileId) redirect('/profiles')

  const { data: activeProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', activeProfileId)
    .maybeSingle()

  if (activeProfile?.role !== 'admin') redirect('/')

  // Fetch stats using RLS-bypassed policies (since we are admin)
  const { count: profilesCount } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })

  // Fetch recent activity
  const { data: recentWatches } = await supabase
    .from('watch_history')
    .select('id, content_id, content_type, watched_at, profiles(name)')
    .order('watched_at', { ascending: false })
    .limit(10)

  return (
    <div className="min-h-screen pt-24 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto space-y-12" style={{ maxWidth: '1400px' }}>
        <h1 className="text-4xl font-black">{t.admin?.dashboard || 'Admin Dashboard'}</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Stats Card */}
          <div className="glass rounded-2xl p-6 border transition-transform hover:scale-[1.02]" style={{ borderColor: 'var(--border-subtle)' }}>
            <h3 className="text-[#B3B3B3] text-sm font-medium mb-2">{t.admin?.totalProfiles || 'Total Profiles'}</h3>
            <p className="text-4xl font-bold text-white">{profilesCount ?? 0}</p>
          </div>
        </div>

        {/* User Management Section */}
        <section className="animate-in fade-in slide-in-from-bottom-4 duration-700">
          <UserManagement />
        </section>

        {/* Recent Activity */}
        <section className="animate-in fade-in slide-in-from-bottom-4 duration-700 delay-150">
          <h2 className="text-xl font-bold mb-6">{t.admin?.recentActivity || 'Recent Activity'}</h2>
          <div className="glass rounded-2xl border overflow-hidden" style={{ borderColor: 'var(--border-subtle)' }}>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-white/5 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
                  <tr>
                    <th className="px-6 py-4 font-medium text-[#B3B3B3]">User</th>
                    <th className="px-6 py-4 font-medium text-[#B3B3B3]">Content ID</th>
                    <th className="px-6 py-4 font-medium text-[#B3B3B3]">Type</th>
                    <th className="px-6 py-4 font-medium text-[#B3B3B3]">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
                  {recentWatches?.map(watch => (
                    <tr key={watch.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4 font-medium">
                        {(watch.profiles as unknown as { name: string })?.name || 'Unknown'}
                      </td>
                      <td className="px-6 py-4">{watch.content_id}</td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 rounded bg-white/10 text-xs">
                          {watch.content_type}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-[#B3B3B3]">
                        {new Date(watch.watched_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                  {(!recentWatches || recentWatches.length === 0) && (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-[#666]">
                        No activity found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

