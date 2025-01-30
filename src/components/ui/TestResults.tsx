import React from 'react';
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react';

interface TestResultProps {
  name: string;
  result: {
    success: boolean;
    message: string;
    details?: any;
  };
}

export function TestResult({ name, result }: TestResultProps) {
  return (
    <div className="border rounded-lg p-4 mb-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center">
          {result.success ? (
            <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
          ) : (
            <XCircle className="h-5 w-5 text-red-500 mr-2" />
          )}
          <h3 className="text-lg font-semibold">{name}</h3>
        </div>
        <span className={`px-2 py-1 rounded-full text-sm ${
          result.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>
          {result.success ? 'Passed' : 'Failed'}
        </span>
      </div>
      <p className="text-gray-600">{result.message}</p>
      {!result.success && result.details && (
        <div className="mt-2 p-2 bg-red-50 rounded border border-red-100">
          <div className="flex items-start">
            <AlertCircle className="h-5 w-5 text-red-500 mr-2 mt-0.5" />
            <pre className="text-sm text-red-700 overflow-auto">
              {JSON.stringify(result.details, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}