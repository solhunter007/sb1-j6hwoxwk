import React, { useState } from 'react';
import { SupabaseTestUtils } from '../../utils/supabaseTest';
import { TestResult } from '../../components/ui/TestResults';
import { RefreshCw } from 'lucide-react';

export default function DatabaseTest() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Record<string, any> | null>(null);

  const runTests = async () => {
    setLoading(true);
    try {
      const { results } = await SupabaseTestUtils.runAllTests();
      setResults(results);
    } catch (error) {
      console.error('Error running tests:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-holy-blue-900">Database Connection Tests</h1>
        <button
          onClick={runTests}
          disabled={loading}
          className="btn-primary"
        >
          <RefreshCw className={`h-5 w-5 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Run Tests
        </button>
      </div>

      {results && (
        <div className="space-y-4">
          <TestResult name="Connection" result={results.connection} />
          <TestResult name="Authentication" result={results.authentication} />
          <TestResult name="Permissions" result={results.permissions} />
          <TestResult name="Data Models" result={results.dataModels} />
        </div>
      )}

      {!results && !loading && (
        <div className="text-center py-8 bg-holy-blue-50 rounded-lg">
          <p className="text-holy-blue-600">Click "Run Tests" to verify the database setup</p>
        </div>
      )}
    </div>
  );
}