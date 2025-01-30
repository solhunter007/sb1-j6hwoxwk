import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import { UserType } from '../types/auth';
import { ImageUp as ImageUpload, Church, User as UserIcon, AlertTriangle } from 'lucide-react';
import ImageCropper from '../components/ImageCropper';
import { RegistrationReview } from '../components/auth/RegistrationReview';
import { useRegistrationStore } from '../stores/registrationStore';
import { DefaultAvatar } from '../components/profile/DefaultAvatar';
import { ProfilePhotoUpload } from '../components/profile/ProfilePhotoUpload';

export default function Auth() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [croppingImage, setCroppingImage] = useState<{ file: string; type: 'profile' | 'header' } | null>(null);
  
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const { register, handleSubmit, watch, formState: { errors }, reset } = useForm();
  
  const {
    data: registrationData,
    currentStep,
    setStep,
    setData,
    clearData
  } = useRegistrationStore();

  const password = watch('password');

  useEffect(() => {
    // Clear registration data when component unmounts
    return () => {
      if (!isSignUp) {
        clearData();
      }
    };
  }, [isSignUp, clearData]);

  const handleCancel = () => {
    clearData();
    setIsSignUp(false);
    reset();
  };

  const onSubmit = async (formData: any) => {
    try {
      if (isSignUp) {
        if (currentStep < 5) {
          // Store form data and move to next step
          setData(formData);
          setStep(currentStep + 1);
          return;
        }

        // Final submission
        await signUp(
          registrationData.email!,
          registrationData.password!,
          registrationData.username!
        );
        
        toast.success('Account created successfully!');
        clearData();
        navigate('/');
      } else {
        await signIn(formData.identifier, formData.password);
        navigate('/');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'An error occurred');
    }
  };

  const renderStep = () => {
    if (!isSignUp) {
      return (
        <div className="space-y-6">
          <div>
            <label htmlFor="identifier" className="block text-sm font-medium text-holy-blue-900">
              Email or Username
            </label>
            <input
              {...register('identifier', { required: 'Email or username is required' })}
              type="text"
              className="mt-1 block w-full rounded-md border border-holy-blue-200 px-3 py-2"
            />
            {errors.identifier && (
              <p className="text-red-500 text-sm mt-1">{errors.identifier.message as string}</p>
            )}
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-holy-blue-900">
              Password
            </label>
            <input
              {...register('password', { required: 'Password is required' })}
              type="password"
              className="mt-1 block w-full rounded-md border border-holy-blue-200 px-3 py-2"
            />
            {errors.password && (
              <p className="text-red-500 text-sm mt-1">{errors.password.message as string}</p>
            )}
          </div>
        </div>
      );
    }

    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => {
                  setData({ userType: 'individual' });
                  setStep(2);
                }}
                className={`card p-6 text-center hover:border-holy-blue-500 transition-colors ${
                  registrationData.userType === 'individual' ? 'border-holy-blue-500' : ''
                }`}
              >
                <UserIcon className="h-12 w-12 mx-auto mb-4 text-holy-blue-500" />
                <h3 className="text-lg font-semibold text-holy-blue-900">Individual Account</h3>
                <p className="text-sm text-holy-blue-600/70 mt-2">
                  Create and share sermon notes, join churches
                </p>
              </button>
              <button
                type="button"
                onClick={() => {
                  setData({ userType: 'church' });
                  setStep(2);
                }}
                className={`card p-6 text-center hover:border-holy-blue-500 transition-colors ${
                  registrationData.userType === 'church' ? 'border-holy-blue-500' : ''
                }`}
              >
                <Church className="h-12 w-12 mx-auto mb-4 text-holy-blue-500" />
                <h3 className="text-lg font-semibold text-holy-blue-900">Church Organization</h3>
                <p className="text-sm text-holy-blue-600/70 mt-2">
                  Manage your church community and events
                </p>
              </button>
            </div>
          </div>
        );
      case 2:
        return (
          <div className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-holy-blue-900">
                Email address
              </label>
              <input
                {...register('email', { required: 'Email is required' })}
                type="email"
                defaultValue={registrationData.email}
                className="mt-1 block w-full rounded-md border border-holy-blue-200 px-3 py-2"
              />
              {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email.message as string}</p>}
            </div>
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-holy-blue-900">
                Username
              </label>
              <input
                {...register('username', { required: 'Username is required' })}
                type="text"
                defaultValue={registrationData.username}
                className="mt-1 block w-full rounded-md border border-holy-blue-200 px-3 py-2"
              />
              {errors.username && <p className="text-red-500 text-sm mt-1">{errors.username.message as string}</p>}
            </div>
            <div>
              <label htmlFor="fullName" className="block text-sm font-medium text-holy-blue-900">
                Full Name
              </label>
              <input
                {...register('fullName', { required: 'Full name is required' })}
                type="text"
                defaultValue={registrationData.fullName}
                className="mt-1 block w-full rounded-md border border-holy-blue-200 px-3 py-2"
              />
              {errors.fullName && <p className="text-red-500 text-sm mt-1">{errors.fullName.message as string}</p>}
            </div>
            {registrationData.userType === 'church' && (
              <>
                <div>
                  <label htmlFor="churchName" className="block text-sm font-medium text-holy-blue-900">
                    Church Name
                  </label>
                  <input
                    {...register('churchDetails.name', { required: 'Church name is required' })}
                    type="text"
                    defaultValue={registrationData.churchDetails?.name}
                    className="mt-1 block w-full rounded-md border border-holy-blue-200 px-3 py-2"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="city" className="block text-sm font-medium text-holy-blue-900">
                      City
                    </label>
                    <input
                      {...register('churchDetails.city', { required: 'City is required' })}
                      type="text"
                      defaultValue={registrationData.churchDetails?.city}
                      className="mt-1 block w-full rounded-md border border-holy-blue-200 px-3 py-2"
                    />
                  </div>
                  <div>
                    <label htmlFor="zipCode" className="block text-sm font-medium text-holy-blue-900">
                      ZIP Code
                    </label>
                    <input
                      {...register('churchDetails.zipCode', { required: 'ZIP code is required' })}
                      type="text"
                      defaultValue={registrationData.churchDetails?.zipCode}
                      className="mt-1 block w-full rounded-md border border-holy-blue-200 px-3 py-2"
                    />
                  </div>
                </div>
              </>
            )}
          </div>
        );
      case 3:
        return (
          <div className="space-y-6">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-holy-blue-900">
                Password
              </label>
              <input
                {...register('password', { 
                  required: 'Password is required',
                  minLength: { value: 8, message: 'Password must be at least 8 characters' }
                })}
                type="password"
                className="mt-1 block w-full rounded-md border border-holy-blue-200 px-3 py-2"
              />
              {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password.message as string}</p>}
            </div>
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-holy-blue-900">
                Confirm Password
              </label>
              <input
                {...register('confirmPassword', { 
                  required: 'Please confirm your password',
                  validate: value => value === password || 'Passwords do not match'
                })}
                type="password"
                className="mt-1 block w-full rounded-md border border-holy-blue-200 px-3 py-2"
              />
              {errors.confirmPassword && (
                <p className="text-red-500 text-sm mt-1">{errors.confirmPassword.message as string}</p>
              )}
            </div>
          </div>
        );
      case 4:
        return (
          <div className="space-y-6">
            <ProfilePhotoUpload
              currentPhoto={registrationData.profileImage}
              onPhotoChange={(photo) => {
                setData({ profileImage: photo });
              }}
              onSkip={() => {
                setData({ profileImage: null });
                setStep(5);
              }}
              showSkip={true}
              userId={registrationData.id}
            />
            <div className="flex justify-end space-x-4">
              <button
                type="button"
                onClick={() => setStep(5)}
                className="btn-primary"
              >
                Continue
              </button>
            </div>
          </div>
        );
      case 5:
        return <RegistrationReview />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-lg shadow-md">
        <div>
          <h2 className="text-center text-3xl font-display font-bold text-holy-blue-900">
            {isSignUp
              ? currentStep === 1
                ? 'Choose Account Type'
                : currentStep === 2
                ? 'Create your account'
                : currentStep === 3
                ? 'Set your password'
                : currentStep === 4
                ? 'Add Profile Photo'
                : 'Review Your Information'
              : 'Sign in to your account'}
          </h2>
        </div>

        {isSignUp && currentStep === 5 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5" />
            <p className="text-sm text-yellow-700">
              Please review your information carefully. Your account will only be created after you click "Create Account" below.
            </p>
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
          {renderStep()}

          {currentStep !== 4 && (
            <div className="flex justify-between gap-4">
              {isSignUp && (
                <button
                  type="button"
                  onClick={handleCancel}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
              )}
              <button
                type="submit"
                className="btn-primary flex-1"
              >
                {isSignUp
                  ? currentStep < 5
                    ? 'Continue'
                    : 'Create Account'
                  : 'Sign in'}
              </button>
            </div>
          )}

          {!isSignUp && (
            <div className="text-center">
              <button
                type="button"
                onClick={() => setIsSignUp(true)}
                className="text-sm text-holy-blue-600 hover:text-holy-blue-500"
              >
                Don't have an account? Sign up
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}