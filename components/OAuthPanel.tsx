/**
 * OAuthPanel Component
 * 
 * Main authorization panel UI that displays:
 * - Application logos and title
 * - Requested permissions
 * - Authorization actions (Authorize/Cancel buttons)
 * - Application metadata
 */

import React, { useState } from 'react';
import type { Permission, AppMetadata } from '../types';

export interface OAuthPanelProps {
  appName: string;
  developerName: string;
  permissions: Permission[];
  metadata: AppMetadata;
  onAuthorize: () => void;
  onCancel: () => void;
  isLoading: boolean;
}

export const OAuthPanel: React.FC<OAuthPanelProps> = ({
  appName,
  developerName,
  permissions,
  metadata,
  onAuthorize,
  onCancel,
  isLoading
}) => {
  const [expandedPermissions, setExpandedPermissions] = useState<Set<number>>(new Set());

  const togglePermission = (index: number) => {
    const newExpanded = new Set(expandedPermissions);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedPermissions(newExpanded);
  };

  return (
    <div className="bg-[#0d1117] border border-[#30363d] rounded-lg overflow-hidden shadow-2xl">
      {/* Header Section */}
      <div className="p-6 border-b border-[#21262d]">
        <div className="flex items-center justify-center gap-4 mb-4">
          {/* App Logo */}
          <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center shadow-lg">
            <span className="text-2xl font-bold text-white">S</span>
          </div>

          {/* Connection Indicator */}
          <div className="flex flex-col items-center">
            <div className="w-12 h-0.5 bg-[#30363d] relative">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-emerald-500 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
            </div>
          </div>

          {/* GitHub Logo */}
          <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-lg">
            <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 24 24">
              <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
            </svg>
          </div>
        </div>

        <h2 id="oauth-modal-title" className="text-xl font-semibold text-center text-[#c9d1d9] mb-1">
          Authorize {appName}
        </h2>
        <p className="text-sm text-center text-[#8b949e]">
          {appName} by <span className="text-[#1f6feb]">{developerName}</span> wants to access your GitHub account
        </p>
      </div>

      {/* Permissions Section */}
      <div className="p-6 border-b border-[#21262d]">
        <div className="flex items-center gap-2 mb-3">
          <svg className="w-4 h-4 text-[#8b949e]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          <h3 className="text-sm font-semibold text-[#c9d1d9]">Personal user data</h3>
        </div>

        <div className="space-y-2">
          {permissions.map((permission, index) => {
            const isExpanded = expandedPermissions.has(index);
            return (
              <div
                key={index}
                className="border border-[#30363d] rounded-md overflow-hidden transition-all duration-200 hover:border-[#8b949e]/50"
              >
                {/* Permission Header - Clickable */}
                <div
                  className="flex items-start gap-2 p-3 cursor-pointer select-none"
                  onClick={() => togglePermission(index)}
                >
                  <svg className="w-4 h-4 mt-0.5 shrink-0 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-[#c9d1d9] font-medium">{permission.name}</span>
                      <svg
                        className={`w-4 h-4 text-[#8b949e] transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                    {permission.isReadOnly && (
                      <span className="text-xs text-[#8b949e]">(read-only)</span>
                    )}
                  </div>
                </div>

                {/* Expandable Details */}
                <div
                  className={`overflow-hidden transition-all duration-300 ${isExpanded ? 'max-h-32' : 'max-h-0'
                    }`}
                >
                  <div className="px-3 pb-3 pt-0 border-t border-[#21262d]">
                    <p className="text-xs text-[#8b949e] mt-2">{permission.description}</p>
                    {permission.isReadOnly && (
                      <div className="mt-2 flex items-center gap-1.5 text-xs text-[#8b949e]">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                        <span>This permission is read-only and cannot modify your data</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Actions Section */}
      <div className="p-6 space-y-3">
        <button
          onClick={onAuthorize}
          disabled={isLoading}
          className="w-full py-3 bg-[#238636] hover:bg-[#2ea043] disabled:bg-[#238636]/50 text-white font-semibold rounded-md transition-colors flex items-center justify-center gap-2 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <>
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Authorizing...
            </>
          ) : (
            `Authorize ${developerName}`
          )}
        </button>

        <button
          onClick={onCancel}
          disabled={isLoading}
          className="w-full py-3 bg-[#21262d] hover:bg-[#30363d] disabled:bg-[#21262d]/50 text-[#c9d1d9] font-semibold rounded-md transition-colors disabled:cursor-not-allowed"
        >
          Cancel
        </button>

        <p className="text-xs text-center text-[#8b949e] pt-2">
          Authorizing will redirect to<br />
          <span className="text-[#1f6feb]">github.com</span>
        </p>
      </div>

      {/* Metadata Section */}
      <div className="px-6 py-4 bg-[#161b22] border-t border-[#21262d]">
        <div className="flex items-center justify-between text-xs text-[#8b949e]">
          <div className="flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            <span>{metadata.isGitHubOwned ? 'Owned by GitHub' : 'Not owned by GitHub'}</span>
          </div>

          <div className="flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Created {metadata.createdDate}</span>
          </div>

          <div className="flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <span>{metadata.userCount} users</span>
          </div>
        </div>
      </div>
    </div>
  );
};
