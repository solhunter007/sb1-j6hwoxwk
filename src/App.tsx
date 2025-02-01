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
import ChurchDashboard from './pages/ChurchDashboard';
import { AuthProvider } from './contexts/AuthContext';
import { RequireAuth } from './components/auth/RequireAuth';

const router = createBrowserRouter(
  createRoutesFromElements(
    <Route element={<AuthProvider><Layout /></AuthProvider>}>
      <Route path="/" element={<Home />} />
      <Route path="auth" element={<Auth />} />
      <Route path="feed" element={<RequireAuth><Feed /></RequireAuth>} />
      <Route path="sermon-notes" element={<RequireAuth><SermonNotes /></RequireAuth>} />
      <Route path="sermon-notes/new" element={<RequireAuth><NewSermonNote /></RequireAuth>} />
      <Route path="sermon-notes/:id" element={<ViewSermonNote />} />
      <Route path="profile/:id" element={<Profile />} />
      <Route path="church/:id" element={<Church />} />
      <Route path="church/dashboard" element={<RequireAuth><ChurchDashboard /></RequireAuth>} />
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
    <>
      <RouterProvider router={router} />
      <Toaster
        position="top-right"
        duration={0}
        closeButton={false}
        richColors
        expand={false}
        visibleToasts={0}
        toastOptions={{
          style: { display: 'none' }
        }}
      />
    </>
  );
}

export default App;