import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { supabase } from '../../lib/supabase'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Lock, CheckCircle } from 'lucide-react'

const resetPasswordSchema = z.object({
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
})

type ResetPasswordForm = z.infer<typeof resetPasswordSchema>

export default function ResetPassword() {
    const navigate = useNavigate()
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [isSuccess, setIsSuccess] = useState(false)

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<ResetPasswordForm>({
        resolver: zodResolver(resetPasswordSchema),
    })

    const onSubmit = async (data: ResetPasswordForm) => {
        try {
            setIsLoading(true)
            setError(null)

            const { error: updateError } = await supabase.auth.updateUser({
                password: data.password,
            })

            if (updateError) throw updateError

            setIsSuccess(true)
            setTimeout(() => {
                navigate('/signin', { replace: true })
            }, 3000)
        } catch (err: any) {
            setError(err.message || 'Failed to update password')
        } finally {
            setIsLoading(false)
        }
    }

    if (isSuccess) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-secondary/30 p-4">
                <div className="w-full max-w-md p-8 bg-card rounded-2xl border shadow-lg text-center">
                    <div className="flex justify-center mb-6">
                        <div className="w-16 h-16 bg-green-500/10 text-green-500 rounded-full flex items-center justify-center">
                            <CheckCircle className="h-10 w-10" />
                        </div>
                    </div>
                    <h1 className="text-2xl font-bold text-foreground mb-4">Password Reset Successful</h1>
                    <p className="text-muted-foreground mb-8">
                        Your password has been updated. You will be redirected to the sign-in page in a few seconds.
                    </p>
                    <Button onClick={() => navigate('/signin')} className="w-full">
                        Sign In Now
                    </Button>
                </div>
            </div>
        )
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-secondary/30 p-4">
            <div className="w-full max-w-md p-8 bg-card rounded-2xl border shadow-lg">
                <div className="text-center mb-8">
                    <div className="flex justify-center mb-4">
                        <div className="w-12 h-12 bg-primary/10 text-primary rounded-full flex items-center justify-center">
                            <Lock className="h-6 w-6" />
                        </div>
                    </div>
                    <h1 className="text-3xl font-bold text-foreground mb-2">Set New Password</h1>
                    <p className="text-sm text-muted-foreground">Please enter your new password below.</p>
                </div>

                {error && (
                    <div className="mb-6 p-3 bg-destructive/15 text-destructive text-sm rounded-md border border-destructive/20">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium leading-none">
                            New Password
                        </label>
                        <Input
                            type="password"
                            placeholder="••••••••"
                            {...register('password')}
                            disabled={isLoading}
                        />
                        {errors.password && <span className="text-xs text-destructive">{errors.password.message}</span>}
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium leading-none">
                            Confirm New Password
                        </label>
                        <Input
                            type="password"
                            placeholder="••••••••"
                            {...register('confirmPassword')}
                            disabled={isLoading}
                        />
                        {errors.confirmPassword && <span className="text-xs text-destructive">{errors.confirmPassword.message}</span>}
                    </div>

                    <Button type="submit" className="w-full mt-6" disabled={isLoading}>
                        {isLoading ? 'Updating password...' : 'Update Password'}
                    </Button>
                </form>
            </div>
        </div>
    )
}
