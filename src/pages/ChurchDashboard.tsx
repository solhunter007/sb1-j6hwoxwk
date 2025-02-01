import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { Church, Users, Calendar, BookOpen, Loader2, AlertTriangle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';

interface DashboardStats {
  memberCount: number;
  sermonNoteCount: number;
  pendingRequests: number;
  groupCount: number;
}

interface ActivityItem {
  id: string;
  type: string;
  timestamp: string;
  data: Record<string, any>;
}

export default function ChurchDashboard() {
  const { user, userType } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<DashboardStats>({
    memberCount: 0,
    sermonNoteCount: 0,
    pendingRequests: 0,
    groupCount: 0
  });
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);
  const [churchId, setChurchId] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      initializeChurch();
    }
  }, [user]);

  const initializeChurch = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // First try to get existing church
      const { data: existingChurch, error: fetchError } = await supabase
        .from('churches')
        .select('id')
        .eq('admin_id', user.id)
        .maybeSingle();

      if (fetchError) throw fetchError;

      // If church exists, set ID and load data
      if (existingChurch) {
        setChurchId(existingChurch.id);
        await loadDashboardData(existingChurch.id);
        return;
      }

      // If no church exists, initialize it
      const { data: newChurch, error: initError } = await supabase.rpc(
        'initialize_church',
        {
          p_name: user.user_metadata.full_name,
          p_city: user.user_metadata.city,
          p_state: user.user_metadata.state,
          p_zip_code: user.user_metadata.zip_code
        }
      );

      if (initError) throw initError;

      setChurchId(newChurch);
      await loadDashboardData(newChurch);
    } catch (error) {
      console.error('Error initializing church:', error);
      setError('Failed to initialize church dashboard');
      toast.error('Failed to initialize church dashboard');
    } finally {
      setLoading(false);
    }
  };

  const subscribeToUpdates = (churchId: string) => {
    if (!user) return;

    const channel = supabase
      .channel(`church_dashboard:${churchId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'church_memberships',
          filter: `church_id=eq.${churchId}`
        },
        () => {
          loadDashboardData(churchId);
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  };

  const loadDashboardData = async (churchId: string) => {
    try {
      const { data, error } = await supabase.rpc('get_church_dashboard_data', {
        p_church_id: churchId
      });

      if (error) throw error;

      setStats({
        memberCount: data.stats.member_count || 0,
        sermonNoteCount: data.stats.sermon_note_count || 0,
        pendingRequests: data.stats.pending_requests || 0,
        groupCount: data.stats.group_count || 0
      });

      setRecentActivity(data.recent_activity || []);

      // Subscribe to updates after successful load
      subscribeToUpdates(churchId);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      setError('Failed to load dashboard data');
      toast.error('Failed to load dashboard data');
    }
  };

  if (!user || userType !== 'church') {
    return <Navigate to="/auth" replace />;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-holy-blue-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-6 w-6 text-red-500" />
            <div>
              <h3 className="text-lg font-semibold text-red-800">Error Loading Dashboard</h3>
              <p className="text-red-600 mt-1">{error}</p>
            </div>
          </div>
          <button
            onClick={() => churchId && loadDashboardData(churchId)}
            className="mt-4 btn-secondary"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-holy-blue-900">Church Dashboard</h1>
        <p className="text-holy-blue-600 mt-1">Manage your church community and content</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-holy-blue-100">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-holy-blue-50 rounded-lg">
              <Users className="h-6 w-6 text-holy-blue-500" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-holy-blue-900">Members</h3>
              <p className="text-2xl font-bold text-holy-blue-600">{stats.memberCount}</p>
              {stats.pendingRequests > 0 && (
                <p className="text-sm text-holy-blue-500 mt-1">
                  {stats.pendingRequests} pending requests
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-holy-blue-100">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-holy-blue-50 rounded-lg">
              <BookOpen className="h-6 w-6 text-holy-blue-500" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-holy-blue-900">Sermon Notes</h3>
              <p className="text-2xl font-bold text-holy-blue-600">{stats.sermonNoteCount}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-holy-blue-100">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-holy-blue-50 rounded-lg">
              <Calendar className="h-6 w-6 text-holy-blue-500" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-holy-blue-900">Events</h3>
              <p className="text-2xl font-bold text-holy-blue-600">0</p>
              <p className="text-sm text-holy-blue-500 mt-1">Coming soon</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-holy-blue-100">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-holy-blue-50 rounded-lg">
              <Church className="h-6 w-6 text-holy-blue-500" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-holy-blue-900">Groups</h3>
              <p className="text-2xl font-bold text-holy-blue-600">{stats.groupCount}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="mt-8">
        <h2 className="text-xl font-semibold text-holy-blue-900 mb-4">Recent Activity</h2>
        <div className="bg-white rounded-lg shadow-sm border border-holy-blue-100">
          {recentActivity.length > 0 ? (
            <div className="divide-y divide-holy-blue-100">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-holy-blue-50 rounded-full">
                      {activity.type === 'new_member' && <Users className="h-4 w-4 text-holy-blue-500" />}
                      {activity.type === 'new_note' && <BookOpen className="h-4 w-4 text-holy-blue-500" />}
                    </div>
                    <div>
                      <p className="text-holy-blue-800">{activity.data.message}</p>
                      <p className="text-sm text-holy-blue-500 mt-1">
                        {new Date(activity.timestamp).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-6 text-center text-holy-blue-600">
              No recent activity
            </div>
          )}
        </div>
      </div>
    </div>
  );
}