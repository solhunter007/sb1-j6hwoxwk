import React, { useState, useEffect } from 'react';
import { SystemCheck } from '../../utils/systemCheck';
import { TestResult } from '../../components/ui/TestResults';
import { RefreshCw, AlertTriangle } from 'lucide-react';
import { LoadingState } from '../../components/ui/LoadingState';

export default function SystemCheckPage() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Record<string, any> | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);

  const runChecks = async () => {
    setLoading(true);
    try {
      const { results } = await SystemCheck.runAllChecks();
      setResults(results);
    } catch (error) {
      console.error('Error running system checks:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (autoRefresh) {
      interval = setInterval(runChecks, 60000); // Run every minute
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh]);

  const hasFailures = results && Object.values(results).some(result => !result.success);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-holy-blue-900">System Status</h1>
          <p className="text-holy-blue-600 mt-1">
            Comprehensive backend system check
          </p>
        </div>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded border-holy-blue-300 text-holy-blue-600 focus:ring-holy-blue-500"
            />
            <span className="text-sm text-holy-blue-600">Auto-refresh</span>
          </label>
          <button
            onClick={runChecks}
            disabled={loading}
            className="btn-primary"
          >
            <RefreshCw className={`h-5 w-5 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Run Checks
          </button>
        </div>
      </div>

      {loading && <LoadingState />}

      {results && !loading && (
        <>
          {hasFailures && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <p className="text-red-700">
                Some system checks have failed. Please review the results below.
              </p>
            </div>
          )}

          <div className="space-y-4">
            <TestResult name="Realtime Features" result={results.realtime} />
            <TestResult name="Data Persistence" result={results.persistence} />
            <TestResult name="Database Consistency" result={results.consistency} />
            <TestResult name="User Metrics" result={results.metrics} />
          </div>
        </>
      )}

      {!results && !loading && (
        <div className="text-center py-8 bg-holy-blue-50 rounded-lg">
          <p className="text-holy-blue-600">
            Click "Run Checks" to verify system status
          </p>
        </div>
      )}
    </div>
  );
}