import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';
import { Scroll, Book, Users } from 'lucide-react';

export default function Home() {
  const { user } = useAuth();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="text-center mb-16">
        <h1 className="text-5xl font-display font-bold bg-gradient-to-r from-holy-blue-600 to-holy-blue-500 bg-clip-text text-transparent mb-6 leading-relaxed">
          Welcome to Sermon Buddy
        </h1>
        <p className="text-xl text-holy-blue-900/80 max-w-2xl mx-auto font-body">
          Your digital companion for capturing, organizing, and sharing sermon insights
        </p>
      </div>

      {!user && (
        <div className="text-center mb-16">
          <Link to="/auth" className="btn-primary">
            Get Started
          </Link>
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-8 mb-16">
        <div className="card p-8 group hover:scale-105 transition-transform duration-300">
          <div className="text-holy-blue-500 mb-6 group-hover:animate-float">
            <Book className="h-12 w-12" />
          </div>
          <h3 className="text-2xl font-display font-bold text-holy-blue-900 mb-3">Take Notes</h3>
          <p className="text-holy-blue-800/70 font-body">
            Capture sermon insights with our intuitive note-taking tools
          </p>
        </div>
        <div className="card p-8 group hover:scale-105 transition-transform duration-300">
          <div className="text-holy-blue-500 mb-6 group-hover:animate-float">
            <Users className="h-12 w-12" />
          </div>
          <h3 className="text-2xl font-display font-bold text-holy-blue-900 mb-3">Connect</h3>
          <p className="text-holy-blue-800/70 font-body">
            Join church communities and share your spiritual journey
          </p>
        </div>
        <div className="card p-8 group hover:scale-105 transition-transform duration-300">
          <div className="text-holy-blue-500 mb-6 group-hover:animate-float">
            <Scroll className="h-12 w-12" />
          </div>
          <h3 className="text-2xl font-display font-bold text-holy-blue-900 mb-3">Grow Together</h3>
          <p className="text-holy-blue-800/70 font-body">
            Engage with others' insights and deepen your understanding
          </p>
        </div>
      </div>
    </div>
  );
}