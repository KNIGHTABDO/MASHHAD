import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getServerT } from '@/lib/i18n/server'

export default async function AdminDashboardPage() {
  const { t } = await getServerT()
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Check if admin
  const { data: is_admin } = await supabase.rpc('is_admin')
  if (!is_admin) redirect('/')

  // Fetch stats using RLS-bypassed policies (since we are admin)
  const { count: usersCount } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })

  // Fetch recent activity
  const { data: recentWatches } = await supabase
    .from('watch_history')
    .select('id, content_id, content_type, watched_at, profiles(name)')
    .order('watched_at', { ascending: false })
    .limit(10)

  return (
    <div className="min-h-screen pt-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-[1400px] mx-auto">
        <h1 className="text-3xl font-black mb-8">{t.admin?.dashboard || 'Admin Dashboard'}</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {/* Stats Card */}
          <div className="glass rounded-2xl p-6 border border-[var(--border-subtle)]">
            <h3 className="text-[#B3B3B3] text-sm font-medium mb-2">{t.admin?.totalUsers || 'Total Users'}</h3>
            <p className="text-4xl font-bold text-white">{usersCount ?? 0}</p>
          </div>
        </div>

        {/* Recent Activity */}
        <section>
          <h2 className="text-xl font-bold mb-6">{t.admin?.recentActivity || 'Recent Activity'}</h2>
          <div className="glass rounded-2xl border border-[var(--border-subtle)] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-white/5 border-b border-[var(--border-subtle)]">
                  <tr>
                    <th className="px-6 py-4 font-medium text-[#B3B3B3]">User</th>
                    <th className="px-6 py-4 font-medium text-[#B3B3B3]">Content ID</th>
                    <th className="px-6 py-4 font-medium text-[#B3B3B3]">Type</th>
                    <th className="px-6 py-4 font-medium text-[#B3B3B3]">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)]">
                  {recentWatches?.map(watch => (
                    <tr key={watch.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4 font-medium">
                        {(watch.profiles as any)?.name || 'Unknown'}
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
