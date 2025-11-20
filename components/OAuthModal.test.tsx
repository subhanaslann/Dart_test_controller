/**
 * OAuthModal Property-Based Tests
 * 
 * Tests modal behavior using property-based testing
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import * as fc from 'fast-check';
import { OAuthModal } from './OAuthModal';

describe('OAuthModal', () => {
  beforeEach(() => {
    // Reset body overflow
    document.body.style.overflow = 'unset';
  });

  afterEach(() => {
    cleanup();
  });

  describe('Modal Visibility', () => {
    // **Feature: github-oauth-panel, Property 1: Button click opens modal**
    it('should render when isOpen is true', () => {
      const onClose = vi.fn();
      
      const { container } = render(
        <OAuthModal isOpen={true} onClose={onClose}>
          <div data-testid="modal-content">Test Content</div>
        </OAuthModal>
      );
      
      expect(screen.getByTestId('modal-content')).toBeInTheDocument();
      expect(container.querySelector('[role="dialog"]')).toBeInTheDocument();
    });

    it('should not render when isOpen is false', () => {
      const onClose = vi.fn();
      
      const { container } = render(
        <OAuthModal isOpen={false} onClose={onClose}>
          <div data-testid="modal-content">Test Content</div>
        </OAuthModal>
      );
      
      expect(screen.queryByTestId('modal-content')).not.toBeInTheDocument();
      expect(container.querySelector('[role="dialog"]')).not.toBeInTheDocument();
    });

    it('should toggle visibility based on isOpen prop', () => {
      fc.assert(
        fc.property(
          fc.array(fc.boolean(), { minLength: 1, maxLength: 10 }),
          (states) => {
            const onClose = vi.fn();
            const { rerender, container } = render(
              <OAuthModal isOpen={states[0]} onClose={onClose}>
                <div data-testid="modal-content">Test</div>
              </OAuthModal>
            );

            for (let i = 1; i < states.length; i++) {
              rerender(
                <OAuthModal isOpen={states[i]} onClose={onClose}>
                  <div data-testid="modal-content">Test</div>
                </OAuthModal>
              );

              const isVisible = container.querySelector('[role="dialog"]') !== null;
              expect(isVisible).toBe(states[i]);
            }
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('Close Behavior', () => {
    it('should call onClose when ESC key is pressed', () => {
      const onClose = vi.fn();
      
      render(
        <OAuthModal isOpen={true} onClose={onClose}>
          <div>Test Content</div>
        </OAuthModal>
      );
      
      fireEvent.keyDown(document, { key: 'Escape' });
      
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('should call onClose when backdrop is clicked', () => {
      const onClose = vi.fn();
      
      const { container } = render(
        <OAuthModal isOpen={true} onClose={onClose}>
          <div>Test Content</div>
        </OAuthModal>
      );
      
      const backdrop = container.querySelector('[role="dialog"]');
      fireEvent.click(backdrop!);
      
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('should not call onClose when clicking modal content', () => {
      const onClose = vi.fn();
      
      render(
        <OAuthModal isOpen={true} onClose={onClose}>
          <div data-testid="modal-content">Test Content</div>
        </OAuthModal>
      );
      
      const content = screen.getByTestId('modal-content');
      fireEvent.click(content);
      
      expect(onClose).not.toHaveBeenCalled();
    });

    it('should not respond to ESC when modal is closed', () => {
      const onClose = vi.fn();
      
      render(
        <OAuthModal isOpen={false} onClose={onClose}>
          <div>Test Content</div>
        </OAuthModal>
      );
      
      fireEvent.keyDown(document, { key: 'Escape' });
      
      expect(onClose).not.toHaveBeenCalled();
    });
  });

  describe('Body Scroll Management', () => {
    it('should prevent body scroll when modal is open', () => {
      const onClose = vi.fn();
      
      render(
        <OAuthModal isOpen={true} onClose={onClose}>
          <div>Test Content</div>
        </OAuthModal>
      );
      
      expect(document.body.style.overflow).toBe('hidden');
    });

    it('should restore body scroll when modal is closed', () => {
      const onClose = vi.fn();
      
      const { rerender } = render(
        <OAuthModal isOpen={true} onClose={onClose}>
          <div>Test Content</div>
        </OAuthModal>
      );
      
      expect(document.body.style.overflow).toBe('hidden');
      
      rerender(
        <OAuthModal isOpen={false} onClose={onClose}>
          <div>Test Content</div>
        </OAuthModal>
      );
      
      expect(document.body.style.overflow).toBe('unset');
    });

    it('should restore body scroll on unmount', () => {
      const onClose = vi.fn();
      
      const { unmount } = render(
        <OAuthModal isOpen={true} onClose={onClose}>
          <div>Test Content</div>
        </OAuthModal>
      );
      
      expect(document.body.style.overflow).toBe('hidden');
      
      unmount();
      
      expect(document.body.style.overflow).toBe('unset');
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      const onClose = vi.fn();
      
      const { container } = render(
        <OAuthModal isOpen={true} onClose={onClose}>
          <div>Test Content</div>
        </OAuthModal>
      );
      
      const dialog = container.querySelector('[role="dialog"]');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
      expect(dialog).toHaveAttribute('aria-labelledby', 'oauth-modal-title');
    });
  });

  describe('Children Rendering', () => {
    it('should render children content', () => {
      const onClose = vi.fn();
      
      const testContent = 'Test Content 123';
      render(
        <OAuthModal isOpen={true} onClose={onClose}>
          <div data-testid="content">{testContent}</div>
        </OAuthModal>
      );
      
      expect(screen.getByTestId('content')).toHaveTextContent(testContent);
    });
  });
});
