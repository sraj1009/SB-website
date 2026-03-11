// ♿ Accessibility Utilities for SINGGLEBEE

import React from 'react';

// WCAG 2.1 AA compliance utilities
export class AccessibilityManager {
  // Generate unique IDs for ARIA relationships
  static generateId(prefix: string = 'acc'): string {
    return `${prefix}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // Check color contrast ratio
  static checkColorContrast(foreground: string, background: string): number {
    // This is a simplified version - in production, use a proper color contrast library
    const getLuminance = (color: string): number => {
      const hex = color.replace('#', '');
      const r = parseInt(hex.substr(0, 2), 16) / 255;
      const g = parseInt(hex.substr(2, 2), 16) / 255;
      const b = parseInt(hex.substr(4, 2), 16) / 255;

      const sRGB = [r, g, b].map((val) => {
        return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
      });

      return 0.2126 * sRGB[0] + 0.7152 * sRGB[1] + 0.0722 * sRGB[2];
    };

    const l1 = getLuminance(foreground);
    const l2 = getLuminance(background);
    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);

    return (lighter + 0.05) / (darker + 0.05);
  }

  // Validate color contrast against WCAG standards
  static validateColorContrast(
    foreground: string,
    background: string,
    level: 'AA' | 'AAA' = 'AA',
    size: 'normal' | 'large' = 'normal'
  ): boolean {
    const ratio = this.checkColorContrast(foreground, background);

    if (level === 'AA') {
      return size === 'large' ? ratio >= 3 : ratio >= 4.5;
    } else {
      return size === 'large' ? ratio >= 4.5 : ratio >= 7;
    }
  }

  // Generate ARIA labels for dynamic content
  static generateAriaLabel(content: string, context?: string): string {
    const cleanContent = content.replace(/<[^>]*>/g, '').trim();
    return context ? `${context}: ${cleanContent}` : cleanContent;
  }

  // Create accessible announcements for screen readers
  static announce(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', priority);
    announcement.setAttribute('aria-atomic', 'true');
    announcement.className = 'sr-only';
    announcement.textContent = message;

    document.body.appendChild(announcement);

    setTimeout(() => {
      document.body.removeChild(announcement);
    }, 1000);
  }

  // Check if an element is visible to screen readers
  static isAccessibleToScreenReaders(element: HTMLElement): boolean {
    const styles = window.getComputedStyle(element);
    const rect = element.getBoundingClientRect();

    return (
      styles.display !== 'none' &&
      styles.visibility !== 'hidden' &&
      styles.opacity !== '0' &&
      rect.width > 0 &&
      rect.height > 0 &&
      !element.getAttribute('aria-hidden')
    );
  }

  // Generate skip links for keyboard navigation
  static generateSkipLinks(): void {
    const skipLinks = [
      { href: '#main-content', text: 'Skip to main content' },
      { href: '#navigation', text: 'Skip to navigation' },
      { href: '#search', text: 'Skip to search' },
    ];

    const skipLinksContainer = document.createElement('div');
    skipLinksContainer.className = 'skip-links';
    skipLinksContainer.setAttribute('role', 'navigation');
    skipLinksContainer.setAttribute('aria-label', 'Skip navigation links');

    skipLinks.forEach((link) => {
      const anchor = document.createElement('a');
      anchor.href = link.href;
      anchor.textContent = link.text;
      anchor.className = 'skip-link';
      anchor.setAttribute('aria-label', link.text);

      skipLinksContainer.appendChild(anchor);
    });

    document.body.insertBefore(skipLinksContainer, document.body.firstChild);
  }

  // Set up keyboard navigation
  static setupKeyboardNavigation(): void {
    // Handle Tab navigation
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        document.body.classList.add('keyboard-navigation');
      }
    });

    document.addEventListener('mousedown', () => {
      document.body.classList.remove('keyboard-navigation');
    });

    // Handle Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        // Close modals, dropdowns, etc.
        const activeElement = document.activeElement as HTMLElement;
        if (activeElement && activeElement.getAttribute('role') === 'dialog') {
          activeElement.dispatchEvent(new CustomEvent('close'));
        }
      }
    });

    // Handle focus management
    document.addEventListener(
      'focusin',
      (e) => {
        const target = e.target as HTMLElement;

        // Ensure focus is visible
        if (target && !this.isAccessibleToScreenReaders(target)) {
          this.announce('Element is not accessible to screen readers', 'assertive');
        }
      },
      true
    );
  }

  // Validate form accessibility
  static validateFormAccessibility(form: HTMLFormElement): {
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check form labels
    const inputs = form.querySelectorAll('input, textarea, select');
    inputs.forEach((input, index) => {
      const inputElement = input as HTMLInputElement;

      // Check for associated label
      const label =
        form.querySelector(`label[for="${inputElement.id}"]`) || inputElement.closest('label');

      if (!label) {
        errors.push(`Input ${index + 1} has no associated label`);
      } else {
        // Check if label text is descriptive
        const labelText = label.textContent?.trim();
        if (!labelText || labelText.length < 2) {
          warnings.push(`Label for input ${index + 1} may not be descriptive enough`);
        }
      }

      // Check for required field indicators
      if (inputElement.required) {
        const requiredIndicator =
          inputElement.getAttribute('aria-required') === 'true' ||
          inputElement.closest('label')?.querySelector('.required') ||
          inputElement.getAttribute('required') !== null;

        if (!requiredIndicator) {
          warnings.push(`Required input ${index + 1} should have a clear indicator`);
        }
      }

      // Check for error messages
      if (
        inputElement.hasAttribute('aria-invalid') &&
        inputElement.getAttribute('aria-invalid') === 'true'
      ) {
        const errorId = inputElement.getAttribute('aria-describedby');
        if (!errorId || !document.getElementById(errorId)) {
          errors.push(`Invalid input ${index + 1} has no associated error message`);
        }
      }
    });

    return { errors, warnings };
  }

  // Generate accessible image alt text
  static generateImageAltText(src: string, context?: string): string {
    // Extract filename and generate descriptive alt text
    const filename = src.split('/').pop()?.split('.')[0] || '';
    const descriptiveText = filename
      .replace(/[-_]/g, ' ')
      .replace(/\b\w/g, (l) => l.toUpperCase())
      .trim();

    return context ? `${descriptiveText} - ${context}` : descriptiveText;
  }

  // Create focus trap for modals
  static createFocusTrap(element: HTMLElement): () => void {
    const focusableElements = element.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    ) as NodeListOf<HTMLElement>;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            lastElement.focus();
            e.preventDefault();
          }
        } else {
          if (document.activeElement === lastElement) {
            firstElement.focus();
            e.preventDefault();
          }
        }
      }
    };

    element.addEventListener('keydown', handleTabKey);

    // Return cleanup function
    return () => {
      element.removeEventListener('keydown', handleTabKey);
    };
  }

  // Check if content is readable (for dyslexia-friendly design)
  static validateReadability(element: HTMLElement): {
    score: number;
    issues: string[];
  } {
    const text = element.textContent || '';
    const words = text.split(/\s+/).length;
    const sentences = text.split(/[.!?]+/).length;
    const characters = text.replace(/\s/g, '').length;

    // Simplified Flesch Reading Ease score
    const avgSentenceLength = words / sentences;
    const avgWordLength = characters / words;
    const score = 206.835 - 1.015 * avgSentenceLength - 84.6 * avgWordLength;

    const issues: string[] = [];

    if (score < 30) {
      issues.push('Content is very difficult to read (college level)');
    } else if (score < 50) {
      issues.push('Content is difficult to read (high school level)');
    } else if (score < 70) {
      issues.push('Content is fairly difficult to read (8th grade level)');
    }

    // Check for long paragraphs
    const paragraphs = element.querySelectorAll('p');
    paragraphs.forEach((para, index) => {
      const paraText = para.textContent || '';
      if (paraText.length > 500) {
        issues.push(`Paragraph ${index + 1} is too long for easy reading`);
      }
    });

    return { score, issues };
  }

  // Generate accessible table structure
  static generateAccessibleTable(headers: string[], data: string[][]): string {
    let tableHTML = '<table role="table" aria-label="Data table">';

    // Header
    tableHTML += '<thead><tr>';
    headers.forEach((header, index) => {
      const scope = index === 0 ? 'row' : 'col';
      tableHTML += `<th scope="${scope}" id="header-${index}">${header}</th>`;
    });
    tableHTML += '</tr></thead>';

    // Body
    tableHTML += '<tbody>';
    data.forEach((row, rowIndex) => {
      tableHTML += '<tr>';
      row.forEach((cell, cellIndex) => {
        const isHeader = cellIndex === 0;
        const tag = isHeader ? 'th' : 'td';
        const scope = isHeader ? 'row' : undefined;
        const headers = isHeader ? undefined : `header-${cellIndex}`;

        tableHTML += `<${tag} ${scope ? `scope="${scope}"` : ''} ${headers ? `headers="${headers}"` : ''}>${cell}</${tag}>`;
      });
      tableHTML += '</tr>';
    });
    tableHTML += '</tbody></table>';

    return tableHTML;
  }

  // Initialize accessibility features
  static initialize(): void {
    // Generate skip links
    this.generateSkipLinks();

    // Set up keyboard navigation
    this.setupKeyboardNavigation();

    // Add ARIA live regions
    const liveRegion = document.createElement('div');
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.className = 'sr-only';
    liveRegion.id = 'aria-live-region';
    document.body.appendChild(liveRegion);

    // Add styles for accessibility features
    const style = document.createElement('style');
    style.textContent = `
      .sr-only {
        position: absolute;
        width: 1px;
        height: 1px;
        padding: 0;
        margin: -1px;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
        white-space: nowrap;
        border: 0;
      }
      
      .skip-links {
        position: fixed;
        top: -40px;
        left: 0;
        right: 0;
        z-index: 9999;
        background: #000;
        color: #fff;
        padding: 8px;
        text-align: center;
      }
      
      .skip-link {
        color: #fff;
        text-decoration: none;
        margin: 0 8px;
      }
      
      .skip-link:focus {
        top: 0;
      }
      
      .keyboard-navigation *:focus {
        outline: 2px solid #FFC107;
        outline-offset: 2px;
      }
      
      @media (prefers-reduced-motion: reduce) {
        * {
          animation-duration: 0.01ms !important;
          animation-iteration-count: 1 !important;
          transition-duration: 0.01ms !important;
        }
      }
    `;
    document.head.appendChild(style);
  }
}

// React Hook for accessibility
export const useAccessibility = () => {
  React.useEffect(() => {
    AccessibilityManager.initialize();
  }, []);

  return {
    announce: AccessibilityManager.announce,
    generateId: AccessibilityManager.generateId,
    validateColorContrast: AccessibilityManager.validateColorContrast,
    createFocusTrap: AccessibilityManager.createFocusTrap,
  };
};

export default AccessibilityManager;
