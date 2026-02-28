import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { supabase } from '../../lib/supabase'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'

const signInSchema = z.object({
    email: z.string().email('Please enter a valid email address'),
    password: z.string().min(1, 'Password is required'),
})

type SignInForm = z.infer<typeof signInSchema>

export default function SignIn() {
    const navigate = useNavigate()
    const [error, setError] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(false)

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<SignInForm>({
        resolver: zodResolver(signInSchema),
    })

    const onSubmit = async (data: SignInForm) => {
        try {
            setIsLoading(true)
            setError(null)

            const { error: authError } = await supabase.auth.signInWithPassword({
                email: data.email,
                password: data.password,
            })

            if (authError) throw authError

            // Session is automatically handled by the listener in App.tsx
            navigate('/', { replace: true })
        } catch (err: any) {
            setError(err.message || 'Failed to sign in')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-secondary/30 p-4">
            <div className="w-full max-w-md p-8 bg-card rounded-2xl border shadow-lg">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-primary mb-2">Welcome Back</h1>
                    <p className="text-sm text-muted-foreground">Sign in to your YBT Chat account</p>
                </div>

                {error && (
                    <div className="mb-6 p-3 bg-destructive/15 text-destructive text-sm rounded-md border border-destructive/20">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                            Email
                        </label>
                        <Input
                            type="email"
                            placeholder="you@example.com"
                            {...register('email')}
                            disabled={isLoading}
                        />
                        {errors.email && <span className="text-xs text-destructive">{errors.email.message}</span>}
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                            Password
                        </label>
                        <Input
                            type="password"
                            placeholder="••••••••"
                            {...register('password')}
                            disabled={isLoading}
                        />
                        {errors.password && <span className="text-xs text-destructive">{errors.password.message}</span>}
                    </div>

                    <Button type="submit" className="w-full mt-6" disabled={isLoading}>
                        {isLoading ? 'Signing in...' : 'Sign In'}
                    </Button>
                </form>

                <div className="mt-6 text-center text-sm">
                    <span className="text-muted-foreground mr-1">Don't have an account?</span>
                    <Link to="/signup" className="text-primary hover:underline font-medium">
                        Sign up
                    </Link>
                </div>
            </div>
        </div>
    )
}
