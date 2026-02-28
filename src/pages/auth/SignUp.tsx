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
