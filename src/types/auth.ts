export type UserType = 'individual' | 'church';

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

export interface ChurchDetails {
  name: string;
  city: string;
  zipCode: string;
}