import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../store/useAuthStore'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'

export default function AdminLogin() {
    const navigate = useNavigate()
    const { setIsAdmin } = useAuthStore()

    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(false)

    const handleAdminLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        try {
            setIsLoading(true)
            setError(null)

            const { data, error: authError } = await supabase.auth.signInWithPassword({
                email,
                password
            })

            if (authError) throw authError
            if (!data.user) throw new Error('Login failed')

            // Verify if the user is an admin
            const { data: adminRecord, error: adminError } = await supabase
                .from('admin_users')
                .select('id')
                .eq('auth_user_id', data.user.id)
                .single()

            if (adminError || !adminRecord) {
                throw new Error('Unauthorized Access. You do not have admin privileges.')
            }

            setIsAdmin(true)
            navigate('/1234/admin/dashboard', { replace: true })

        } catch (err: any) {
            setError(err.message || 'Failed to login as admin')
            // If they logged in to Auth but aren't an admin, sign them out
            if (err.message.includes('Unauthorized')) {
                await supabase.auth.signOut()
            }
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-zinc-950 p-4">
            <div className="w-full max-w-md p-8 bg-zinc-900 rounded-2xl border border-zinc-800 shadow-xl text-zinc-100">
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-red-500/20 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/30">
                        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                    </div>
                    <h1 className="text-2xl font-bold">Admin Portal</h1>
                    <p className="text-sm text-zinc-400 mt-1">YBT Chat Management</p>
                </div>

                {error && (
                    <div className="mb-6 p-3 bg-red-500/10 text-red-400 text-sm rounded-md border border-red-500/20">
                        {error}
                    </div>
                )}

                <form onSubmit={handleAdminLogin} className="space-y-4">
                    <div className="space-y-1">
                        <label className="text-sm font-medium text-zinc-300">Admin Email</label>
                        <Input
                            type="email"
                            placeholder="admin@ybtchat.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="bg-zinc-950 border-zinc-800 text-zinc-100 placeholder:text-zinc-600 focus-visible:ring-red-500"
                            required
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-sm font-medium text-zinc-300">Password</label>
                        <Input
                            type="password"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="bg-zinc-950 border-zinc-800 text-zinc-100 placeholder:text-zinc-600 focus-visible:ring-red-500"
                            required
                        />
                    </div>

                    <Button
                        type="submit"
                        className="w-full mt-6 bg-red-600 text-white hover:bg-red-700"
                        disabled={isLoading}
                    >
                        {isLoading ? 'Authenticating...' : 'Secure Login'}
                    </Button>
                </form>
            </div>
        </div>
    )
}
