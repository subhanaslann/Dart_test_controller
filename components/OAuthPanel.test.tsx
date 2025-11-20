/**
 * OAuthPanel Property-Based Tests
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import * as fc from 'fast-check';
import { OAuthPanel } from './OAuthPanel';
import type { Permission, AppMetadata } from '../types';

const mockPermissions: Permission[] = [
  {
    name: 'Repository Access',
    description: 'Read your repositories',
    isReadOnly: true
  },
  {
    name: 'User Profile',
    description: 'Read your profile',
    isReadOnly: true
  }
];

const mockMetadata: AppMetadata = {
  isGitHubOwned: false,
  createdDate: '2024',
  userCount: 'New'
};

describe('OAuthPanel', () => {
  describe('Logo Presence', () => {
    // **Feature: github-oauth-panel, Property 14: Logo elements present**
    it('should display both application and GitHub logos', () => {
      const onAuthorize = vi.fn();
      const onCancel = vi.fn();

      const { container } = render(
        <OAuthPanel
          appName="Test App"
          developerName="Test Dev"
          permissions={mockPermissions}
          metadata={mockMetadata}
          onAuthorize={onAuthorize}
          onCancel={onCancel}
          isLoading={false}
        />
      );

      // Check for app logo (S letter)
      expect(screen.getByText('S')).toBeInTheDocument();

      // Check for GitHub logo SVG
      const githubLogo = container.querySelector('svg[viewBox="0 0 24 24"]');
      expect(githubLogo).toBeInTheDocument();
    });

    it('should always display logos regardless of props', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.boolean(),
          (appName, devName, isLoading) => {
            const onAuthorize = vi.fn();
            const onCancel = vi.fn();

            const { container, unmount } = render(
              <OAuthPanel
                appName={appName}
                developerName={devName}
                permissions={mockPermissions}
                metadata={mockMetadata}
                onAuthorize={onAuthorize}
                onCancel={onCancel}
                isLoading={isLoading}
              />
            );

            // App logo should always be present
            expect(screen.getByText('S')).toBeInTheDocument();

            // GitHub logo should always be present
            const githubLogo = container.querySelector('svg[viewBox="0 0 24 24"]');
            expect(githubLogo).toBeInTheDocument();

            unmount();
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('Panel Display', () => {
    it('should display app name and developer name', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 2, maxLength: 50 }).filter(s => s.trim().length > 1),
          fc.string({ minLength: 2, maxLength: 50 }).filter(s => s.trim().length > 1),
          (appName, devName) => {
            const onAuthorize = vi.fn();
            const onCancel = vi.fn();

            const { unmount, container } = render(
              <OAuthPanel
                appName={appName}
                developerName={devName}
                permissions={mockPermissions}
                metadata={mockMetadata}
                onAuthorize={onAuthorize}
                onCancel={onCancel}
                isLoading={false}
              />
            );

            // Check that app name appears in the title
            const title = container.querySelector('#oauth-modal-title');
            expect(title?.textContent).toContain(appName);
            
            // Check that developer name appears in the description
            const description = container.querySelector('.text-\\[\\#1f6feb\\]');
            expect(description?.textContent).toContain(devName);

            unmount();
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('Permission Rendering', () => {
    // **Feature: github-oauth-panel, Property 6: All permissions rendered**
    it('should render all permissions', () => {
      const onAuthorize = vi.fn();
      const onCancel = vi.fn();

      render(
        <OAuthPanel
          appName="Test App"
          developerName="Test Dev"
          permissions={mockPermissions}
          metadata={mockMetadata}
          onAuthorize={onAuthorize}
          onCancel={onCancel}
          isLoading={false}
        />
      );

      mockPermissions.forEach(permission => {
        expect(screen.getByText(permission.name)).toBeInTheDocument();
        expect(screen.getByText(permission.description)).toBeInTheDocument();
      });
    });

    it('should render correct number of permissions', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              name: fc.string({ minLength: 2, maxLength: 30 }).filter(s => s.trim().length > 1),
              description: fc.string({ minLength: 2, maxLength: 100 }).filter(s => s.trim().length > 1),
              isReadOnly: fc.boolean()
            }),
            { minLength: 1, maxLength: 5 }
          ),
          (permissions) => {
            const onAuthorize = vi.fn();
            const onCancel = vi.fn();

            const { unmount, container } = render(
              <OAuthPanel
                appName="Test"
                developerName="Dev"
                permissions={permissions}
                metadata={mockMetadata}
                onAuthorize={onAuthorize}
                onCancel={onCancel}
                isLoading={false}
              />
            );

            // Check that all permission names are rendered
            permissions.forEach(permission => {
              const permissionElements = container.querySelectorAll('.text-\\[\\#c9d1d9\\]');
              const found = Array.from(permissionElements).some(el => 
                el.textContent?.includes(permission.name)
              );
              expect(found).toBe(true);
            });

            unmount();
          }
        ),
        { numRuns: 30 }
      );
    });

    // **Feature: github-oauth-panel, Property 8: Read-only indicator presence**
    it('should show read-only indicator for read-only permissions', () => {
      const readOnlyPermission: Permission = {
        name: 'Read Only Test',
        description: 'Test description',
        isReadOnly: true
      };

      const onAuthorize = vi.fn();
      const onCancel = vi.fn();

      render(
        <OAuthPanel
          appName="Test"
          developerName="Dev"
          permissions={[readOnlyPermission]}
          metadata={mockMetadata}
          onAuthorize={onAuthorize}
          onCancel={onCancel}
          isLoading={false}
        />
      );

      expect(screen.getByText('(read-only)')).toBeInTheDocument();
    });

    it('should not show read-only indicator for write permissions', () => {
      const writePermission: Permission = {
        name: 'Write Test',
        description: 'Test description',
        isReadOnly: false
      };

      const onAuthorize = vi.fn();
      const onCancel = vi.fn();

      render(
        <OAuthPanel
          appName="Test"
          developerName="Dev"
          permissions={[writePermission]}
          metadata={mockMetadata}
          onAuthorize={onAuthorize}
          onCancel={onCancel}
          isLoading={false}
        />
      );

      expect(screen.queryByText('(read-only)')).not.toBeInTheDocument();
    });
  });

  describe('Metadata Display', () => {
    // **Feature: github-oauth-panel, Property 9: Metadata display completeness**
    it('should display all metadata fields', () => {
      const onAuthorize = vi.fn();
      const onCancel = vi.fn();

      render(
        <OAuthPanel
          appName="Test"
          developerName="Dev"
          permissions={mockPermissions}
          metadata={mockMetadata}
          onAuthorize={onAuthorize}
          onCancel={onCancel}
          isLoading={false}
        />
      );

      expect(screen.getByText(/Not owned by GitHub/i)).toBeInTheDocument();
      expect(screen.getByText(/Created 2024/i)).toBeInTheDocument();
      expect(screen.getByText(/New users/i)).toBeInTheDocument();
    });

    it('should display GitHub owned status correctly', () => {
      const onAuthorize = vi.fn();
      const onCancel = vi.fn();

      const githubOwnedMetadata: AppMetadata = {
        ...mockMetadata,
        isGitHubOwned: true
      };

      render(
        <OAuthPanel
          appName="Test"
          developerName="Dev"
          permissions={mockPermissions}
          metadata={githubOwnedMetadata}
          onAuthorize={onAuthorize}
          onCancel={onCancel}
          isLoading={false}
        />
      );

      expect(screen.getByText(/Owned by GitHub/i)).toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    // **Feature: github-oauth-panel, Property 10: Loading state visibility**
    it('should show loading state when isLoading is true', () => {
      const onAuthorize = vi.fn();
      const onCancel = vi.fn();

      render(
        <OAuthPanel
          appName="Test"
          developerName="Dev"
          permissions={mockPermissions}
          metadata={mockMetadata}
          onAuthorize={onAuthorize}
          onCancel={onCancel}
          isLoading={true}
        />
      );

      expect(screen.getByText('Authorizing...')).toBeInTheDocument();
    });

    it('should disable buttons when loading', () => {
      const onAuthorize = vi.fn();
      const onCancel = vi.fn();

      render(
        <OAuthPanel
          appName="Test"
          developerName="Dev"
          permissions={mockPermissions}
          metadata={mockMetadata}
          onAuthorize={onAuthorize}
          onCancel={onCancel}
          isLoading={true}
        />
      );

      const authorizeButton = screen.getByText('Authorizing...').closest('button');
      const cancelButton = screen.getByText('Cancel').closest('button');

      expect(authorizeButton).toBeDisabled();
      expect(cancelButton).toBeDisabled();
    });

    it('should enable buttons when not loading', () => {
      const onAuthorize = vi.fn();
      const onCancel = vi.fn();

      render(
        <OAuthPanel
          appName="Test"
          developerName="Dev"
          permissions={mockPermissions}
          metadata={mockMetadata}
          onAuthorize={onAuthorize}
          onCancel={onCancel}
          isLoading={false}
        />
      );

      const authorizeButton = screen.getByText(/Authorize Dev/i).closest('button');
      const cancelButton = screen.getByText('Cancel').closest('button');

      expect(authorizeButton).not.toBeDisabled();
      expect(cancelButton).not.toBeDisabled();
    });
  });

  describe('Button Actions', () => {
    it('should call onAuthorize when authorize button is clicked', () => {
      const onAuthorize = vi.fn();
      const onCancel = vi.fn();

      render(
        <OAuthPanel
          appName="Test"
          developerName="Dev"
          permissions={mockPermissions}
          metadata={mockMetadata}
          onAuthorize={onAuthorize}
          onCancel={onCancel}
          isLoading={false}
        />
      );

      const authorizeButton = screen.getByText(/Authorize Dev/i);
      authorizeButton.click();

      expect(onAuthorize).toHaveBeenCalledTimes(1);
    });

    it('should call onCancel when cancel button is clicked', () => {
      const onAuthorize = vi.fn();
      const onCancel = vi.fn();

      render(
        <OAuthPanel
          appName="Test"
          developerName="Dev"
          permissions={mockPermissions}
          metadata={mockMetadata}
          onAuthorize={onAuthorize}
          onCancel={onCancel}
          isLoading={false}
        />
      );

      const cancelButton = screen.getByText('Cancel');
      cancelButton.click();

      expect(onCancel).toHaveBeenCalledTimes(1);
    });
  });
});
