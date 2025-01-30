import { supabase } from '../lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

interface SystemCheckResult {
  success: boolean;
  message: string;
  details?: any;
}

export class SystemCheck {
  private static realtimeChannel: RealtimeChannel | null = null;

  static async testRealtimeFeatures(): Promise<SystemCheckResult> {
    try {
      // Test WebSocket connection
      this.realtimeChannel = supabase.channel('system-check');
      
      const connectionPromise = new Promise((resolve, reject) => {
        this.realtimeChannel!
          .subscribe(status => {
            if (status === 'SUBSCRIBED') resolve(true);
            if (status === 'CLOSED' || status === 'CHANNEL_ERROR') reject(status);
          });
      });

      await connectionPromise;

      return {
        success: true,
        message: 'Realtime features are working correctly',
        details: {
          websocketConnected: true,
          channelSubscribed: true
        }
      };
    } catch (error) {
      return {
        success: false,
        message: 'Realtime features test failed',
        details: error
      };
    } finally {
      if (this.realtimeChannel) {
        await this.realtimeChannel.unsubscribe();
      }
    }
  }

  static async testDataPersistence(): Promise<SystemCheckResult> {
    try {
      // Test sermon note creation and retrieval
      const testNote = {
        title: 'Test Note',
        content: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Test content' }] }] },
        visibility: 'private'
      };

      const { data: createdNote, error: createError } = await supabase
        .from('sermon_notes')
        .insert([testNote])
        .select()
        .single();

      if (createError) throw createError;

      // Test praise functionality
      const { error: praiseError } = await supabase
        .from('praises')
        .insert([{ sermon_note_id: createdNote.id, user_id: createdNote.author_id }]);

      if (praiseError) throw praiseError;

      // Test comment functionality
      const { error: commentError } = await supabase
        .from('comments')
        .insert([{
          sermon_note_id: createdNote.id,
          author_id: createdNote.author_id,
          content: 'Test comment'
        }]);

      if (commentError) throw commentError;

      // Cleanup test data
      await supabase.from('sermon_notes').delete().eq('id', createdNote.id);

      return {
        success: true,
        message: 'Data persistence is working correctly',
        details: {
          noteCreation: true,
          praiseSystem: true,
          commentSystem: true
        }
      };
    } catch (error) {
      return {
        success: false,
        message: 'Data persistence test failed',
        details: error
      };
    }
  }

  static async testDatabaseConsistency(): Promise<SystemCheckResult> {
    try {
      // Check foreign key consistency
      const { data: inconsistencies, error } = await supabase.rpc('check_data_consistency');
      
      if (error) throw error;

      const hasInconsistencies = inconsistencies && Object.values(inconsistencies).some(count => count > 0);

      return {
        success: !hasInconsistencies,
        message: hasInconsistencies 
          ? 'Data inconsistencies detected' 
          : 'Database consistency verified',
        details: inconsistencies
      };
    } catch (error) {
      return {
        success: false,
        message: 'Database consistency check failed',
        details: error
      };
    }
  }

  static async testUserMetrics(): Promise<SystemCheckResult> {
    try {
      // Test timestamp accuracy
      const now = new Date();
      const { data: timestamp, error: timestampError } = await supabase.rpc('get_server_timestamp');
      
      if (timestampError) throw timestampError;

      const serverTime = new Date(timestamp);
      const timeDiff = Math.abs(now.getTime() - serverTime.getTime());
      const isTimeAccurate = timeDiff < 5000; // Allow 5 second difference

      // Test engagement tracking
      const { error: trackingError } = await supabase.rpc('test_engagement_tracking');
      
      if (trackingError) throw trackingError;

      return {
        success: isTimeAccurate,
        message: isTimeAccurate 
          ? 'User metrics systems are functioning correctly' 
          : 'Time synchronization issues detected',
        details: {
          timeAccuracy: isTimeAccurate,
          timeDifference: `${timeDiff}ms`,
          engagementTracking: true
        }
      };
    } catch (error) {
      return {
        success: false,
        message: 'User metrics test failed',
        details: error
      };
    }
  }

  static async runAllChecks(): Promise<{
    allPassed: boolean;
    results: Record<string, SystemCheckResult>;
  }> {
    const results = {
      realtime: await this.testRealtimeFeatures(),
      persistence: await this.testDataPersistence(),
      consistency: await this.testDatabaseConsistency(),
      metrics: await this.testUserMetrics()
    };

    const allPassed = Object.values(results).every(result => result.success);

    return {
      allPassed,
      results
    };
  }
}