// Add useEffect for real-time updates
useEffect(() => {
  if (!userId || !membership?.churchId) return;

  const channel = supabase
    .channel(`membership:${userId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'church_memberships',
        filter: `user_id=eq.${userId}`
      },
      () => {
        // Reload membership data
        onMembershipChange?.();
      }
    )
    .subscribe();

  return () => {
    channel.unsubscribe();
  };
}, [userId, membership?.churchId]);

// Update handleJoinLeave to use optimistic updates
const handleJoinLeave = async () => {
  if (!user) {
    toast.error('Please sign in to join a church');
    return;
  }

  try {
    setLoading(true);

    // Optimistically update UI
    const isLeaving = !!membership;
    const previousMembership = membership;
    
    if (isLeaving) {
      onMembershipChange?.();
    }

    const { data, error } = await supabase.rpc('handle_church_membership', {
      p_church_id: membership?.churchId,
      p_action: isLeaving ? 'leave' : 'join'
    });

    if (error) throw error;

    toast.success(
      data.action === 'requested'
        ? 'Membership request sent'
        : 'Successfully left church'
    );
  } catch (error) {
    console.error('Error updating church membership:', error);
    toast.error('Failed to update church membership');
    
    // Revert optimistic update on error
    onMembershipChange?.();
  } finally {
    setLoading(false);
  }
};