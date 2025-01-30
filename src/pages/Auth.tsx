import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import { UserType, SignUpData } from '../types/auth';
import { ImageUp as ImageUpload, Church, User as UserIcon, Eye, EyeOff, X } from 'lucide-react';
import ImageCropper from '../components/ImageCropper';

export default function Auth() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [userType, setUserType] = useState<UserType | null>(null);
  const [step, setStep] = useState(1);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [headerImage, setHeaderImage] = useState<string | null>(null);
  const [croppingImage, setCroppingImage] = useState<{ file: string; type: 'profile' | 'header' } | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const { register, handleSubmit, watch, formState: { errors }, reset, getValues } = useForm<SignUpData & { confirmPassword: string }>();

  const password = watch('password');

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>, type: 'profile' | 'header') => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCroppingImage({ file: reader.result as string, type });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCropComplete = (croppedImage: string) => {
    if (croppingImage?.type === 'profile') {
      setProfileImage(croppedImage);
    } else {
      setHeaderImage(croppedImage);
    }
    setCroppingImage(null);
  };

  const handleCancel = () => {
    reset();
    setProfileImage(null);
    setHeaderImage(null);
    setCroppingImage(null);
    setStep(1);
    setUserType(null);
    setShowSummary(false);
  };

  const onSubmit = async (data: SignUpData & { confirmPassword: string }) => {
    try {
      if (isSignUp) {
        if (step < 3) {
          setStep(step + 1);
          return;
        }
        if (!showSummary) {
          setShowSummary(true);
          return;
        }
        await signUp(data.email, data.password, data.username);
        toast.success('Account created successfully!');
        navigate('/');
      } else {
        await signIn(data.username, data.password);
        toast.success('Signed in successfully!');
        navigate('/');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'An error occurred');
    }
  };

  const renderSignInForm = () => (
    <div className="space-y-6">
      <div>
        <label htmlFor="username" className="block text-sm font-medium text-holy-blue-900">
          Username
        </label>
        <input
          {...register('username', { required: 'Username is required' })}
          type="text"
          className="mt-1 block w-full rounded-md border border-holy-blue-200 px-3 py-2 focus:border-holy-blue-500 focus:ring focus:ring-holy-blue-200 focus:ring-opacity-50"
        />
        {errors.username && <p className="text-red-500 text-sm mt-1">{errors.username.message}</p>}
      </div>
      <div>
        <label htmlFor="password" className="block text-sm font-medium text-holy-blue-900">
          Password
        </label>
        <div className="relative">
          <input
            {...register('password', { required: 'Password is required' })}
            type={showPassword ? 'text' : 'password'}
            className="mt-1 block w-full rounded-md border border-holy-blue-200 px-3 py-2 pr-10 focus:border-holy-blue-500 focus:ring focus:ring-holy-blue-200 focus:ring-opacity-50"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-holy-blue-500"
          >
            {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </button>
        </div>
        {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password.message}</p>}
      </div>
    </div>
  );

  const renderAccountSummary = () => {
    const values = getValues();
    return (
      <div className="space-y-6">
        <h3 className="text-xl font-semibold text-holy-blue-900 mb-4">Account Summary</h3>
        <div className="space-y-4 bg-holy-blue-50 p-4 rounded-lg">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-holy-blue-900">Account Type</p>
              <p className="text-holy-blue-600">{userType === 'church' ? 'Church Organization' : 'Individual'}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-holy-blue-900">Username</p>
              <p className="text-holy-blue-600">{values.username}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-holy-blue-900">Email</p>
              <p className="text-holy-blue-600">{values.email}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-holy-blue-900">Full Name</p>
              <p className="text-holy-blue-600">{values.fullName}</p>
            </div>
            {userType === 'church' && values.churchDetails && (
              <>
                <div>
                  <p className="text-sm font-medium text-holy-blue-900">Church Name</p>
                  <p className="text-holy-blue-600">{values.churchDetails.name}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-holy-blue-900">Location</p>
                  <p className="text-holy-blue-600">{values.churchDetails.city}, {values.churchDetails.zipCode}</p>
                </div>
              </>
            )}
          </div>
          <div className="flex gap-4 mt-6">
            <div className="flex-1">
              <p className="text-sm font-medium text-holy-blue-900 mb-2">Profile Picture</p>
              {profileImage ? (
                <img src={profileImage} alt="Profile" className="w-24 h-24 rounded-full object-cover" />
              ) : (
                <div className="w-24 h-24 rounded-full bg-holy-blue-100 flex items-center justify-center">
                  <UserIcon className="h-8 w-8 text-holy-blue-400" />
                </div>
              )}
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-holy-blue-900 mb-2">Header Image</p>
              {headerImage ? (
                <img src={headerImage} alt="Header" className="w-full h-24 rounded-lg object-cover" />
              ) : (
                <div className="w-full h-24 rounded-lg bg-holy-blue-100 flex items-center justify-center">
                  <ImageUpload className="h-8 w-8 text-holy-blue-400" />
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-4">
          <button
            type="button"
            onClick={handleCancel}
            className="flex-1 btn-secondary"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="flex-1 btn-primary"
          >
            Confirm Account Creation
          </button>
        </div>
      </div>
    );
  };

  const renderStep = () => {
    if (!isSignUp) {
      return renderSignInForm();
    }

    if (showSummary) {
      return renderAccountSummary();
    }

    switch (step) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => {
                  setUserType('individual');
                  setStep(2);
                }}
                className={`card p-6 text-center hover:border-holy-blue-500 transition-colors ${
                  userType === 'individual' ? 'border-holy-blue-500' : ''
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
                  setUserType('church');
                  setStep(2);
                }}
                className={`card p-6 text-center hover:border-holy-blue-500 transition-colors ${
                  userType === 'church' ? 'border-holy-blue-500' : ''
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
                {...register('email', { 
                  required: 'Email is required',
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: 'Invalid email address'
                  }
                })}
                type="email"
                className="mt-1 block w-full rounded-md border border-holy-blue-200 px-3 py-2 focus:border-holy-blue-500 focus:ring focus:ring-holy-blue-200 focus:ring-opacity-50"
              />
              {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>}
            </div>
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-holy-blue-900">
                Username
              </label>
              <input
                {...register('username', { 
                  required: 'Username is required',
                  minLength: {
                    value: 3,
                    message: 'Username must be at least 3 characters'
                  }
                })}
                type="text"
                className="mt-1 block w-full rounded-md border border-holy-blue-200 px-3 py-2 focus:border-holy-blue-500 focus:ring focus:ring-holy-blue-200 focus:ring-opacity-50"
              />
              {errors.username && <p className="text-red-500 text-sm mt-1">{errors.username.message}</p>}
            </div>
            <div>
              <label htmlFor="fullName" className="block text-sm font-medium text-holy-blue-900">
                Full Name
              </label>
              <input
                {...register('fullName', { required: 'Full name is required' })}
                type="text"
                className="mt-1 block w-full rounded-md border border-holy-blue-200 px-3 py-2 focus:border-holy-blue-500 focus:ring focus:ring-holy-blue-200 focus:ring-opacity-50"
              />
              {errors.fullName && <p className="text-red-500 text-sm mt-1">{errors.fullName.message}</p>}
            </div>
            {userType === 'church' && (
              <>
                <div>
                  <label htmlFor="churchName" className="block text-sm font-medium text-holy-blue-900">
                    Church Name
                  </label>
                  <input
                    {...register('churchDetails.name', { required: 'Church name is required' })}
                    type="text"
                    className="mt-1 block w-full rounded-md border border-holy-blue-200 px-3 py-2 focus:border-holy-blue-500 focus:ring focus:ring-holy-blue-200 focus:ring-opacity-50"
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
                      className="mt-1 block w-full rounded-md border border-holy-blue-200 px-3 py-2 focus:border-holy-blue-500 focus:ring focus:ring-holy-blue-200 focus:ring-opacity-50"
                    />
                  </div>
                  <div>
                    <label htmlFor="zipCode" className="block text-sm font-medium text-holy-blue-900">
                      ZIP Code
                    </label>
                    <input
                      {...register('churchDetails.zipCode', { required: 'ZIP code is required' })}
                      type="text"
                      className="mt-1 block w-full rounded-md border border-holy-blue-200 px-3 py-2 focus:border-holy-blue-500 focus:ring focus:ring-holy-blue-200 focus:ring-opacity-50"
                    />
                  </div>
                </div>
              </>
            )}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-holy-blue-900">
                Password
              </label>
              <div className="relative">
                <input
                  {...register('password', {
                    required: 'Password is required',
                    minLength: {
                      value: 8,
                      message: 'Password must be at least 8 characters'
                    },
                    pattern: {
                      value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
                      message: 'Password must include uppercase, lowercase, number and special character'
                    }
                  })}
                  type={showPassword ? 'text' : 'password'}
                  className="mt-1 block w-full rounded-md border border-holy-blue-200 px-3 py-2 pr-10 focus:border-holy-blue-500 focus:ring focus:ring-holy-blue-200 focus:ring-opacity-50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-holy-blue-500"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password.message}</p>}
            </div>
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-holy-blue-900">
                Confirm Password
              </label>
              <div className="relative">
                <input
                  {...register('confirmPassword', {
                    required: 'Please confirm your password',
                    validate: value => value === password || 'Passwords do not match'
                  })}
                  type={showConfirmPassword ? 'text' : 'password'}
                  className="mt-1 block w-full rounded-md border border-holy-blue-200 px-3 py-2 pr-10 focus:border-holy-blue-500 focus:ring focus:ring-holy-blue-200 focus:ring-opacity-50"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-holy-blue-500"
                >
                  {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="text-red-500 text-sm mt-1">{errors.confirmPassword.message}</p>
              )}
            </div>
          </div>
        );
      case 3:
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-holy-blue-900 mb-2">
                Profile Picture
              </label>
              <div className="flex items-center space-x-4">
                {profileImage ? (
                  <div className="relative w-32 h-32">
                    <img
                      src={profileImage}
                      alt="Profile"
                      className="w-full h-full object-cover rounded-full"
                    />
                    <button
                      type="button"
                      onClick={() => setProfileImage(null)}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div className="w-32 h-32 border-2 border-dashed border-holy-blue-200 rounded-full flex items-center justify-center hover:border-holy-blue-400 transition-colors">
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleImageUpload(e, 'profile')}
                      />
                      <ImageUpload className="h-8 w-8 text-holy-blue-400" />
                    </label>
                  </div>
                )}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-holy-blue-900 mb-2">
                Header Image
              </label>
              <div className="flex items-center space-x-4">
                {headerImage ? (
                  <div className="relative w-full h-48">
                    <img
                      src={headerImage}
                      alt="Header"
                      className="w-full h-full object-cover rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={() => setHeaderImage(null)}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div className="w-full h-48 border-2 border-dashed border-holy-blue-200 rounded-lg flex items-center justify-center hover:border-holy-blue-400 transition-colors">
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleImageUpload(e, 'header')}
                      />
                      <ImageUpload className="h-8 w-8 text-holy-blue-400" />
                    </label>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
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
              ? showSummary
                ? 'Review Your Account'
                : step === 1
                ? 'Choose Account Type'
                : step === 2
                ? 'Create your account'
                : 'Customize your profile'
              : 'Sign in to your account'}
          </h2>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
          {renderStep()}

          {!showSummary && (
            <div className="flex gap-4">
              {(isSignUp && step > 1) && (
                <button
                  type="button"
                  onClick={handleCancel}
                  className="flex-1 btn-secondary"
                >
                  Cancel
                </button>
              )}
              <button
                type="submit"
                className="flex-1 btn-primary"
              >
                {isSignUp
                  ? step < 3
                    ? 'Continue'
                    : 'Review Account'
                  : 'Sign in'}
              </button>
            </div>
          )}

          {!showSummary && (
            <div className="text-center">
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  handleCancel();
                }}
                className="text-sm text-holy-blue-600 hover:text-holy-blue-500"
              >
                {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
              </button>
            </div>
          )}
        </form>
      </div>

      {croppingImage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full">
            <ImageCropper
              image={croppingImage.file}
              aspect={croppingImage.type === 'profile' ? 1 : 3}
              onCropComplete={handleCropComplete}
              onCancel={() => setCroppingImage(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}