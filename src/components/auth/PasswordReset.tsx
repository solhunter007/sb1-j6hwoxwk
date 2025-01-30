import React from 'react';
import { useForm } from 'react-hook-form';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';

export function PasswordReset() {
  const { register, handleSubmit, formState: { errors } } = useForm();

  const onSubmit = async (data: { email: string }) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });
      if (error) throw error;
      toast.success('Password reset instructions sent to your email');
    } catch (error) {
      toast.error('Failed to send reset instructions');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-holy-blue-900">
          Email Address
        </label>
        <input
          {...register('email', { 
            required: 'Email is required',
            pattern: {
              value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
              message: 'Invalid email address'
            }
          })}
          type="email"
          className="mt-1 block w-full rounded-md border border-holy-blue-200 px-3 py-2 focus:border-holy-blue-500 focus:ring focus:ring-holy-blue-200 focus:ring-opacity-50"
          placeholder="your@email.com"
        />
        {errors.email && (
          <p className="text-red-500 text-sm mt-1">{errors.email.message as string}</p>
        )}
      </div>
      <button type="submit" className="btn-primary w-full">
        Send Reset Instructions
      </button>
    </form>
  );
}