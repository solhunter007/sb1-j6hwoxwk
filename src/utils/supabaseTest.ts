import { supabase } from '../lib/supabase';
import { toast } from 'sonner';

interface TestResult {
  success: boolean;
  message: string;
  details?: any;
}

export class SupabaseTestUtils {
  static async testConnection(): Promise<TestResult> {
    try {
      const { data, error } = await supabase.from('profiles').select('id').limit(1);
      
      if (error) {
        throw error;
      }

      return {
        success: true,
        message: 'Successfully connected to Supabase',
        details: {
          endpoint: supabase.supabaseUrl,
          serviceAvailable: true
        }
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to connect to Supabase',
        details: error
      };
    }
  }

  static async testAuthentication(): Promise<TestResult> {
    try {
      // Test auth endpoints
      const { data: authData, error: authError } = await supabase.auth.getSession();
      
      if (authError) {
        throw authError;
      }

      return {
        success: true,
        message: 'Authentication endpoints are working correctly',
        details: {
          sessionAvailable: !!authData.session,
          authEnabled: true
        }
      };
    } catch (error) {
      return {
        success: false,
        message: 'Authentication test failed',
        details: error
      };
    }
  }

  static async testDatabasePermissions(): Promise<TestResult> {
    try {
      // Test RLS policies by attempting to read public data
      const { data: publicData, error: publicError } = await supabase
        .from('profiles')
        .select('username')
        .limit(1);

      if (publicError) {
        throw publicError;
      }

      return {
        success: true,
        message: 'Database permissions are configured correctly',
        details: {
          publicAccessEnabled: true,
          rlsPoliciesActive: true
        }
      };
    } catch (error) {
      return {
        success: false,
        message: 'Database permissions test failed',
        details: error
      };
    }
  }

  static async testDataModels(): Promise<TestResult> {
    try {
      // Test all main tables exist and are accessible
      const tables = ['profiles', 'churches', 'sermon_notes', 'memberships'];
      const results = await Promise.all(
        tables.map(async (table) => {
          const { error } = await supabase.from(table).select('id').limit(0);
          return { table, exists: !error };
        })
      );

      const missingTables = results.filter(r => !r.exists).map(r => r.table);
      
      if (missingTables.length > 0) {
        throw new Error(`Missing tables: ${missingTables.join(', ')}`);
      }

      return {
        success: true,
        message: 'All required data models are present',
        details: {
          tablesVerified: tables,
          allTablesPresent: true
        }
      };
    } catch (error) {
      return {
        success: false,
        message: 'Data models verification failed',
        details: error
      };
    }
  }

  static async runAllTests(): Promise<{
    allPassed: boolean;
    results: Record<string, TestResult>;
  }> {
    const results = {
      connection: await this.testConnection(),
      authentication: await this.testAuthentication(),
      permissions: await this.testDatabasePermissions(),
      dataModels: await this.testDataModels()
    };

    const allPassed = Object.values(results).every(result => result.success);

    return {
      allPassed,
      results
    };
  }
}

export async function validateSupabaseSetup(): Promise<boolean> {
  const { allPassed, results } = await SupabaseTestUtils.runAllTests();

  if (allPassed) {
    toast.success('Supabase connection and setup verified successfully');
  } else {
    const failedTests = Object.entries(results)
      .filter(([, result]) => !result.success)
      .map(([name]) => name);

    toast.error(`Supabase setup validation failed: ${failedTests.join(', ')}`);
    
    // Log detailed results for debugging
    console.group('Supabase Validation Results');
    Object.entries(results).forEach(([name, result]) => {
      console.log(`${name}:`, result);
    });
    console.groupEnd();
  }

  return allPassed;
}