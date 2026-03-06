import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { supabase } from '../../lib/supabase'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react'

const forgotPasswordSchema = z.object({
    email: z.string().email('Please enter a valid email address'),
})

type ForgotPasswordForm = z.infer<typeof forgotPasswordSchema>

export default function ForgotPassword() {
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [isSubmitted, setIsSubmitted] = useState(false)

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<ForgotPasswordForm>({
        resolver: zodResolver(forgotPasswordSchema),
    })

    const onSubmit = async (data: ForgotPasswordForm) => {
        try {
            setIsLoading(true)
            setError(null)

            const { error: resetError } = await supabase.auth.resetPasswordForEmail(data.email, {
                redirectTo: `${window.location.origin}/reset-password`,
            })

            if (resetError) throw resetError

            setIsSubmitted(true)
        } catch (err: any) {
            setError(err.message || 'Failed to send reset link')
        } finally {
            setIsLoading(false)
        }
    }

    if (isSubmitted) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-secondary/30 p-4">
                <div className="w-full max-w-md p-8 bg-card rounded-2xl border shadow-lg text-center">
                    <div className="flex justify-center mb-6">
                        <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center">
                            <CheckCircle className="h-10 w-10" />
                        </div>
                    </div>
                    <h1 className="text-2xl font-bold text-foreground mb-4">Check Your Email</h1>
                    <p className="text-muted-foreground mb-8">
                        We've sent a password reset link to your email address. Please follow the link to reset your password.
                    </p>
                    <Link to="/signin">
                        <Button className="w-full">Back to Sign In</Button>
                    </Link>
                </div>
            </div>
        )
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-secondary/30 p-4">
            <div className="w-full max-w-md p-8 bg-card rounded-2xl border shadow-lg">
                <div className="mb-6">
                    <Link to="/signin" className="flex items-center text-sm text-muted-foreground hover:text-primary transition-colors">
                        <ArrowLeft className="h-4 w-4 mr-1" />
                        Back to sign in
                    </Link>
                </div>

                <div className="text-center mb-8">
                    <div className="flex justify-center mb-4">
                        <div className="w-12 h-12 bg-primary/10 text-primary rounded-full flex items-center justify-center">
                            <Mail className="h-6 w-6" />
                        </div>
                    </div>
                    <h1 className="text-3xl font-bold text-foreground mb-2">Forgot Password?</h1>
                    <p className="text-sm text-muted-foreground">Enter your email and we'll send you a link to reset your password.</p>
                </div>

                {error && (
                    <div className="mb-6 p-3 bg-destructive/15 text-destructive text-sm rounded-md border border-destructive/20">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium leading-none">
                            Email Address
                        </label>
                        <Input
                            type="email"
                            placeholder="you@example.com"
                            {...register('email')}
                            disabled={isLoading}
                        />
                        {errors.email && <span className="text-xs text-destructive">{errors.email.message}</span>}
                    </div>

                    <Button type="submit" className="w-full mt-6" disabled={isLoading}>
                        {isLoading ? 'Sending link...' : 'Send Reset Link'}
                    </Button>
                </form>
            </div>
        </div>
    )
}
