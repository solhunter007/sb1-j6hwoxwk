import React from 'react';
import { 
  RouterProvider, 
  createBrowserRouter,
  createRoutesFromElements,
  Route,
  Navigate
} from 'react-router-dom';
import { Toaster } from 'sonner';
import Layout from './components/Layout';
import Home from './pages/Home';
import Auth from './pages/Auth';
import SermonNotes from './pages/SermonNotes';
import NewSermonNote from './pages/SermonNotes/NewSermonNote';
import ViewSermonNote from './pages/SermonNotes/ViewSermonNote';
import Profile from './pages/Profile';
import Church from './pages/Church';
import Feed from './pages/Feed';
import { AuthProvider } from './contexts/AuthContext';
import { RequireAuth } from './components/auth/RequireAuth';

// Create router with v7 behavior
const router = createBrowserRouter(
  createRoutesFromElements(
    <Route element={<Layout />}>
      <Route path="/" element={<Home />} />
      <Route path="auth" element={<Auth />} />
      <Route path="feed" element={<RequireAuth><Feed /></RequireAuth>} />
      <Route path="sermon-notes" element={<RequireAuth><SermonNotes /></RequireAuth>} />
      <Route path="sermon-notes/new" element={<RequireAuth><NewSermonNote /></RequireAuth>} />
      <Route path="sermon-notes/:id" element={<ViewSermonNote />} />
      <Route path="profile/:id" element={<Profile />} />
      <Route path="church/:id" element={<Church />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Route>
  ),
  {
    future: {
      v7_startTransition: true,
      v7_relativeSplatPath: true
    }
  }
);

function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
      <Toaster position="top-right" />
    </AuthProvider>
  );
}

export default App;