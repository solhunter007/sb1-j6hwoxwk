import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'sonner';
import Layout from './components/Layout';
import Home from './pages/Home';
import Auth from './pages/Auth';
import SermonNotes from './pages/SermonNotes';
import NewSermonNote from './pages/SermonNotes/NewSermonNote';
import Profile from './pages/Profile';
import Church from './pages/Church';
import Feed from './pages/Feed';
import { AuthProvider } from './contexts/AuthContext';

function App() {
  return (
    <Router>
      <AuthProvider>
        <Layout>
          <Routes>
            <Route path="/" element={<Feed />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/sermon-notes" element={<SermonNotes />} />
            <Route path="/sermon-notes/new" element={<NewSermonNote />} />
            <Route path="/profile/:id" element={<Profile />} />
            <Route path="/church/:id" element={<Church />} />
          </Routes>
        </Layout>
        <Toaster position="top-right" />
      </AuthProvider>
    </Router>
  );
}

export default App;