import React from 'react';
import { Link } from 'react-router-dom';
import { Scroll, Home, User, Church, Bell, LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, signOut } = useAuth();

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-holy-blue-50 to-white">
      <nav className="bg-white shadow-sm border-b border-holy-blue-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <Link to="/" className="flex items-center group">
                <div className="relative">
                  <Scroll className="h-8 w-8 text-holy-blue-500 group-hover:animate-float transition-transform duration-300" />
                  <div className="absolute inset-0 bg-divine-yellow-300/20 blur-lg rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </div>
                <span className="ml-2 text-xl font-display font-bold bg-gradient-to-r from-holy-blue-600 to-holy-blue-500 bg-clip-text text-transparent leading-relaxed tracking-wide">
                  Sermon Buddy
                </span>
              </Link>
              
              <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                <Link to="/" className="inline-flex items-center px-1 pt-1 text-sm font-medium text-holy-blue-900 hover:text-holy-blue-600 transition-colors">
                  <Home className="h-4 w-4 mr-1" />
                  Home
                </Link>
                <Link to="/sermon-notes" className="inline-flex items-center px-1 pt-1 text-sm font-medium text-holy-blue-600/70 hover:text-holy-blue-600 transition-colors">
                  <Scroll className="h-4 w-4 mr-1" />
                  Sermon Notes
                </Link>
                <Link to="/churches" className="inline-flex items-center px-1 pt-1 text-sm font-medium text-holy-blue-600/70 hover:text-holy-blue-600 transition-colors">
                  <Church className="h-4 w-4 mr-1" />
                  Churches
                </Link>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              {user ? (
                <>
                  <button className="p-2 rounded-full text-holy-blue-600/70 hover:text-holy-blue-600 hover:bg-holy-blue-50 transition-all">
                    <Bell className="h-6 w-6" />
                  </button>
                  <Link 
                    to={`/profile/${user.id}`} 
                    className="p-2 rounded-full text-holy-blue-600/70 hover:text-holy-blue-600 hover:bg-holy-blue-50 transition-all"
                  >
                    <User className="h-6 w-6" />
                  </Link>
                  <button 
                    onClick={handleSignOut}
                    className="p-2 rounded-full text-holy-blue-600/70 hover:text-holy-blue-600 hover:bg-holy-blue-50 transition-all"
                    title="Sign Out"
                  >
                    <LogOut className="h-6 w-6" />
                  </button>
                </>
              ) : (
                <Link to="/auth" className="btn-primary">
                  Sign In
                </Link>
              )}
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 page-transition">
        {children}
      </main>
    </div>
  );
}