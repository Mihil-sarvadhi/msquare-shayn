import React from 'react';

interface ComingSoonProps {
  label: string;
}

export default function ComingSoon({ label }: ComingSoonProps) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-sm font-medium text-muted">{label}</span>
      <span className="text-xs bg-parch text-muted px-2 py-0.5 rounded-full border border-parch">
        Coming Soon
      </span>
    </div>
  );
}
