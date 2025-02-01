import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Users, Calendar, BookOpen } from 'lucide-react';
import { LoadingState } from '../components/ui/LoadingState';
import { toast } from 'sonner';

interface ChurchData {
  id: string;
  name: string;
  description: string;
  logo_url: string | null;
  city: string;
  state: string;
  admin: {
    id: string;
    username: string;
    full_name: string;
  };
  member_stats: {
    total: number;
    active: number;
    pending: number;
  };
}

export default function Church() {
  const { id } = useParams();
  const [church, setChurch] = useState<ChurchData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      loadChurch();
    }
  }, [id]);

  const loadChurch = async () => {
    try {
      const { data, error } = await supabase
        .from('churches')
        .select(`
          id,
          name,
          description,
          logo_url,
          city,
          state,
          admin:profiles!churches_admin_id_fkey (
            id,
            username,
            full_name
          ),
          member_stats:church_memberships (
            total:count(*),
            active:count(case when status = 'active' then 1 end),
            pending:count(case when status = 'pending' then 1 end)
          )
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      setChurch(data);
    } catch (error) {
      console.error('Error loading church:', error);
      setError('Failed to load church');
      toast.error('Failed to load church');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingState />;

  if (error || !church) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-sm p-8 text-center">
          <h2 className="text-2xl font-bold text-holy-blue-900 mb-4">
            {error || 'Church not found'}
          </h2>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <div className="p-6">
          <div className="flex items-center space-x-4">
            {church.logo_url ? (
              <img
                src={church.logo_url}
                alt={church.name}
                className="h-20 w-20 rounded-lg object-cover"
              />
            ) : (
              <div className="h-20 w-20 rounded-lg bg-holy-blue-100 flex items-center justify-center">
                <Users className="h-8 w-8 text-holy-blue-500" />
              </div>
            )}
            <div>
              <h1 className="text-2xl font-bold text-holy-blue-900">{church.name}</h1>
              <p className="text-holy-blue-600">
                {church.city}{church.state && `, ${church.state}`}
              </p>
            </div>
          </div>
        </div>

        <div className="border-t border-holy-blue-100">
          <div className="grid md:grid-cols-3 divide-x divide-holy-blue-100">
            <div className="p-6">
              <div className="flex items-center space-x-2 mb-4">
                <Users className="h-5 w-5 text-holy-blue-500" />
                <h2 className="text-lg font-semibold text-holy-blue-900">Members</h2>
              </div>
              <p className="text-2xl font-bold text-holy-blue-600">
                {church.member_stats.active}
              </p>
              {church.member_stats.pending > 0 && (
                <p className="text-sm text-holy-blue-600 mt-1">
                  {church.member_stats.pending} pending
                </p>
              )}
            </div>
            <div className="p-6">
              <div className="flex items-center space-x-2 mb-4">
                <Calendar className="h-5 w-5 text-holy-blue-500" />
                <h2 className="text-lg font-semibold text-holy-blue-900">Events</h2>
              </div>
              <p className="text-holy-blue-600">No upcoming events</p>
            </div>
            <div className="p-6">
              <div className="flex items-center space-x-2 mb-4">
                <BookOpen className="h-5 w-5 text-holy-blue-500" />
                <h2 className="text-lg font-semibold text-holy-blue-900">Recent Notes</h2>
              </div>
              <p className="text-holy-blue-600">No sermon notes yet</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}