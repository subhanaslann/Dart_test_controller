/**
 * OAuthButton Tests
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { OAuthButton } from './OAuthButton';

describe('OAuthButton', () => {
  // **Feature: github-oauth-panel, Property 13: Authenticated state indicator**
  it('should show Connected when authenticated', () => {
    const onConnect = vi.fn();
    const onDisconnect = vi.fn();

    render(
      <OAuthButton
        isAuthenticated={true}
        onConnect={onConnect}
        onDisconnect={onDisconnect}
      />
    );

    expect(screen.getByText('Connected')).toBeInTheDocument();
  });

  it('should show Connect GitHub when not authenticated', () => {
    const onConnect = vi.fn();
    const onDisconnect = vi.fn();

    render(
      <OAuthButton
        isAuthenticated={false}
        onConnect={onConnect}
        onDisconnect={onDisconnect}
      />
    );

    expect(screen.getByText('Connect GitHub')).toBeInTheDocument();
  });

  // **Feature: github-oauth-panel, Property 19: Disconnect option visibility**
  it('should call onConnect when clicked while not authenticated', () => {
    const onConnect = vi.fn();
    const onDisconnect = vi.fn();

    render(
      <OAuthButton
        isAuthenticated={false}
        onConnect={onConnect}
        onDisconnect={onDisconnect}
      />
    );

    screen.getByText('Connect GitHub').click();
    expect(onConnect).toHaveBeenCalledTimes(1);
  });

  it('should call onDisconnect when clicked while authenticated', () => {
    const onConnect = vi.fn();
    const onDisconnect = vi.fn();

    render(
      <OAuthButton
        isAuthenticated={true}
        onConnect={onConnect}
        onDisconnect={onDisconnect}
      />
    );

    screen.getByText('Connected').click();
    expect(onDisconnect).toHaveBeenCalledTimes(1);
  });
});
