export type UserType = 'individual' | 'church';

export interface SignInData {
  identifier: string; // Can be either email or username
  password: string;
}

export interface SignUpData {
  email: string;
  password: string;
  confirmPassword?: string;
  username: string;
  fullName: string;
  userType: UserType;
  churchDetails?: {
    name: string;
    city: string;
    zipCode: string;
  };
  profileImage?: File;
  headerImage?: File;
}