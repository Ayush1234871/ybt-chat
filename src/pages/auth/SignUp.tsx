import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { supabase } from '../../lib/supabase'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'

const step1Schema = z.object({
    full_name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Please enter a valid email address'),
    date_of_birth: z.string().min(1, 'Date of birth is required'),
    gender: z.enum(['male', 'female', 'other'] as const, { message: 'Please select a gender' }),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirm_password: z.string(),
}).refine((data) => data.password === data.confirm_password, {
    message: "Passwords don't match",
    path: ["confirm_password"],
})

const step2Schema = z.object({
    username: z.string()
        .min(3, 'Username must be at least 3 characters')
        .max(20, 'Username must be at most 20 characters')
        .regex(/^[a-zA-Z0-9_]+$/, 'Only letters, numbers, and underscores are allowed'),
})

type Step1Form = z.infer<typeof step1Schema>
type Step2Form = z.infer<typeof step2Schema>

export default function SignUp() {
    const navigate = useNavigate()
    const [step, setStep] = useState<1 | 2>(1)
    const [error, setError] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(false)

    // Store step 1 data temporarily
    const [step1Data, setStep1Data] = useState<Step1Form | null>(null)

    const step1Form = useForm<Step1Form>({
        resolver: zodResolver(step1Schema),
    })

    const step2Form = useForm<Step2Form>({
        resolver: zodResolver(step2Schema),
    })

    const onStep1Submit = (data: Step1Form) => {
        setStep1Data(data)
        setStep(2)
        setError(null)
    }

    const onStep2Submit = async (data: Step2Form) => {
        if (!step1Data) return

        try {
            setIsLoading(true)
            setError(null)

            // 1. Check if username is available using RPC
            // We use RPC for speed and to keep it atomic in the DB logic
            const { data: isAvailable, error: rpcError } = await supabase.rpc(
                'check_username_available',
                { username_to_check: data.username }
            )

            if (rpcError) {
                console.error('RPC Error:', rpcError)
                // Specific handling for network issues common in some environments
                if (rpcError.message === 'Failed to fetch' || rpcError.message?.includes('timeout')) {
                    throw new Error('Could not reach Supabase servers. Please check your internet connection and ensure Supabase is not blocked.')
                }
                throw new Error(`Username verification failed: ${rpcError.message}`)
            }

            if (!isAvailable) {
                step2Form.setError('username', { message: 'Username is already taken' })
                setIsLoading(false)
                return
            }

            // 2. Create Auth User
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email: step1Data.email,
                password: step1Data.password,
            })

            if (authError) {
                if (authError.message.includes('already registered')) {
                    throw new Error('An account with this email already exists.')
                }
                throw authError
            }
            if (!authData.user) throw new Error('Failed to create account. Please try again.')

            // 3. Create Public Profile
            // This links the auth user to the public profile
            const { error: profileError } = await supabase
                .from('users')
                .insert({
                    id: authData.user.id,
                    full_name: step1Data.full_name,
                    username: data.username,
                    email: step1Data.email,
                    date_of_birth: step1Data.date_of_birth,
                    gender: step1Data.gender,
                })

            if (profileError) {
                console.error('Profile creation error:', profileError)
                // If profile fails but auth succeeded, we tell the user to contact support or try logging in
                throw new Error('Account created but profile setup failed. Please try logging in.')
            }

            navigate('/', { replace: true })
        } catch (err: any) {
            console.error('SignUp Error:', err)
            setError(err.message || 'An unexpected error occurred during sign up.')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-secondary/30 p-4">
            <div className="w-full max-w-md p-8 bg-card rounded-2xl border shadow-lg">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-primary mb-2">Create Account</h1>
                    <p className="text-sm text-muted-foreground">
                        {step === 1 ? 'Step 1: Your details' : 'Step 2: Pick a username'}
                    </p>
                </div>

                {error && (
                    <div className="mb-6 p-3 bg-destructive/15 text-destructive text-sm rounded-md border border-destructive/20">
                        {error}
                    </div>
                )}

                {step === 1 && (
                    <form onSubmit={step1Form.handleSubmit(onStep1Submit)} className="space-y-4">
                        <div className="space-y-1">
                            <label className="text-sm font-medium">Full Name</label>
                            <Input placeholder="John Doe" {...step1Form.register('full_name')} />
                            {step1Form.formState.errors.full_name && (
                                <span className="text-xs text-destructive">{step1Form.formState.errors.full_name.message}</span>
                            )}
                        </div>

                        <div className="space-y-1">
                            <label className="text-sm font-medium">Email</label>
                            <Input type="email" placeholder="you@example.com" {...step1Form.register('email')} />
                            {step1Form.formState.errors.email && (
                                <span className="text-xs text-destructive">{step1Form.formState.errors.email.message}</span>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-sm font-medium">Date of Birth</label>
                                <Input type="date" {...step1Form.register('date_of_birth')} />
                                {step1Form.formState.errors.date_of_birth && (
                                    <span className="text-xs text-destructive">{step1Form.formState.errors.date_of_birth.message}</span>
                                )}
                            </div>

                            <div className="space-y-1">
                                <label className="text-sm font-medium">Gender</label>
                                <select
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                                    {...step1Form.register('gender')}
                                >
                                    <option value="">Select...</option>
                                    <option value="male">Male</option>
                                    <option value="female">Female</option>
                                    <option value="other">Other</option>
                                </select>
                                {step1Form.formState.errors.gender && (
                                    <span className="text-xs text-destructive">{step1Form.formState.errors.gender.message}</span>
                                )}
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-sm font-medium">Password</label>
                            <Input type="password" placeholder="••••••••" {...step1Form.register('password')} />
                            {step1Form.formState.errors.password && (
                                <span className="text-xs text-destructive">{step1Form.formState.errors.password.message}</span>
                            )}
                        </div>

                        <div className="space-y-1">
                            <label className="text-sm font-medium">Confirm Password</label>
                            <Input type="password" placeholder="••••••••" {...step1Form.register('confirm_password')} />
                            {step1Form.formState.errors.confirm_password && (
                                <span className="text-xs text-destructive">{step1Form.formState.errors.confirm_password.message}</span>
                            )}
                        </div>

                        <Button type="submit" className="w-full mt-6">Continue</Button>
                    </form>
                )}

                {step === 2 && (
                    <form onSubmit={step2Form.handleSubmit(onStep2Submit)} className="space-y-4">
                        <div className="space-y-1">
                            <label className="text-sm font-medium">Choose a Username</label>
                            <Input
                                placeholder="my_awesome_username"
                                {...step2Form.register('username')}
                                disabled={isLoading}
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                                Only letters, numbers, and underscores (3-20 characters).
                            </p>
                            {step2Form.formState.errors.username && (
                                <span className="text-xs text-destructive">{step2Form.formState.errors.username.message}</span>
                            )}
                        </div>

                        <div className="flex gap-3 mt-6">
                            <Button
                                type="button"
                                variant="outline"
                                className="w-1/3"
                                onClick={() => setStep(1)}
                                disabled={isLoading}
                            >
                                Back
                            </Button>
                            <Button type="submit" className="w-2/3" disabled={isLoading}>
                                {isLoading ? 'Creating account...' : 'Complete Sign Up'}
                            </Button>
                        </div>
                    </form>
                )}

                <div className="mt-6 relative">
                    <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t border-border" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
                    </div>
                </div>

                <div className="mt-6">
                    <Button
                        type="button"
                        variant="outline"
                        className="w-full gap-2"
                        onClick={async () => {
                            try {
                                setIsLoading(true)
                                const { error } = await supabase.auth.signInWithOAuth({
                                    provider: 'google',
                                    options: {
                                        redirectTo: window.location.origin
                                    }
                                })
                                if (error) throw error
                            } catch (err: any) {
                                setError(err.message || 'Failed to sign up with Google')
                            } finally {
                                setIsLoading(false)
                            }
                        }}
                        disabled={isLoading}
                    >
                        <svg className="h-4 w-4" viewBox="0 0 24 24">
                            <path
                                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                fill="#4285F4"
                            />
                            <path
                                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                fill="#34A853"
                            />
                            <path
                                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                                fill="#FBBC05"
                            />
                            <path
                                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                fill="#EA4335"
                            />
                            <path d="M1 1h22v22H1z" fill="none" />
                        </svg>
                        Google
                    </Button>
                </div>

                <div className="mt-6 text-center text-sm">
                    <span className="text-muted-foreground mr-1">Already have an account?</span>
                    <Link to="/signin" className="text-primary hover:underline font-medium">
                        Sign in
                    </Link>
                </div>
            </div>
        </div>
    )
}
