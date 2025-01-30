import React from 'react';
import { Search, Filter, Clock, Heart, Users, Church } from 'lucide-react';
import { cn } from '../../utils/cn';

interface FeedFiltersProps {
  filter: string;
  onFilterChange: (filter: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export function FeedFilters({
  filter,
  onFilterChange,
  searchQuery,
  onSearchChange,
}: FeedFiltersProps) {
  const filters = [
    { id: 'recent', label: 'Recent', icon: Clock },
    { id: 'following', label: 'Following', icon: Users },
    { id: 'praised', label: 'Most Praised', icon: Heart },
    { id: 'church', label: 'Church', icon: Church },
  ];

  return (
    <div className="mb-6 space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-holy-blue-400 h-5 w-5" />
        <input
          type="text"
          placeholder="Search sermon notes..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-10 pr-4 py-2 rounded-full border border-holy-blue-200 focus:ring-2 focus:ring-holy-blue-500 focus:border-transparent"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {filters.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => onFilterChange(id)}
            className={cn(
              "inline-flex items-center px-4 py-2 rounded-full text-sm font-medium transition-colors",
              filter === id
                ? "bg-holy-blue-500 text-white"
                : "bg-holy-blue-50 text-holy-blue-600 hover:bg-holy-blue-100"
            )}
          >
            <Icon className="h-4 w-4 mr-2" />
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}