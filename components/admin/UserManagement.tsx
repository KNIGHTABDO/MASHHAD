'use client'

import { useState, useEffect } from 'react'

interface User {
  id: string
  firstName: string
  lastName: string
  email: string
  isPro: boolean
  plan: string
  createdAt: string
}

export function UserManagement() {
  const [users, setUsers] = useState<User[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async (query = '') => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/users?query=${query}`)
      const data = await res.json()
      if (data.users) {
        setUsers(data.users)
      }
    } catch (err) {
      console.error('Failed to fetch users:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    fetchUsers(search)
  }

  const togglePro = async (userId: string, currentIsPro: boolean) => {
    setActionLoading(userId)
    const action = currentIsPro ? 'downgrade' : 'upgrade'
    try {
      const res = await fetch('/api/admin/users/update-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, action })
      })
      if (res.ok) {
        setUsers(users.map(u => u.id === userId ? { ...u, isPro: !currentIsPro, plan: !currentIsPro ? 'lifetime' : 'free' } : u))
      }
    } catch (err) {
      console.error('Failed to update user:', err)
    } finally {
      setActionLoading(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-xl font-bold">User Management</h2>
        <form onSubmit={handleSearch} className="relative w-full sm:w-72">
          <input
            type="text"
            placeholder="Search users..."
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 focus:outline-none focus:border-red-600 transition-colors"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2 text-[#B3B3B3] hover:text-white">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>
        </form>
      </div>

      <div className="glass rounded-2xl border overflow-hidden" style={{ borderColor: 'var(--border-subtle)' }}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-white/5 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
              <tr>
                <th className="px-6 py-4 font-medium text-[#B3B3B3]">User</th>
                <th className="px-6 py-4 font-medium text-[#B3B3B3]">Email</th>
                <th className="px-6 py-4 font-medium text-[#B3B3B3]">Status</th>
                <th className="px-6 py-4 font-medium text-[#B3B3B3]">Joined</th>
                <th className="px-6 py-4 font-medium text-[#B3B3B3] text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <div className="flex justify-center">
                      <div className="w-6 h-6 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  </td>
                </tr>
              ) : users.map(user => (
                <tr key={user.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-medium text-white">{user.firstName} {user.lastName}</div>
                    <div className="text-xs text-[#666]">{user.id}</div>
                  </td>
                  <td className="px-6 py-4 text-[#B3B3B3]">{user.email}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${user.isPro ? 'bg-red-600/20 text-red-600' : 'bg-white/10 text-[#B3B3B3]'}`}>
                      {user.plan}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-[#B3B3B3]">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => togglePro(user.id, user.isPro)}
                      disabled={actionLoading === user.id}
                      className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        user.isPro 
                          ? 'bg-white/10 text-white hover:bg-white/20' 
                          : 'bg-red-600 text-white hover:bg-red-700 shadow-lg shadow-red-600/20'
                      } disabled:opacity-50`}
                    >
                      {actionLoading === user.id ? 'Updating...' : user.isPro ? 'Make Free' : 'Make Pro'}
                    </button>
                  </td>
                </tr>
              ))}
              {!loading && users.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-[#666]">
                    No users found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
