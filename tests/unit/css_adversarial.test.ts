import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Empirical Adversarial CSS & SVG Validation', () => {
  const cssPath = path.resolve(__dirname, '../../src/styles/index.css');
  const cssContent = fs.readFileSync(cssPath, 'utf8');

  it('verifies CSS charset and font fallback stack', () => {
    expect(cssContent.startsWith("@charset 'utf-8';")).toBe(true);
    expect(cssContent).toContain("font: 14px 'Helvetica Neue', Helvetica, Arial, sans-serif;");
    expect(cssContent).toContain('-webkit-font-smoothing: antialiased;');
    expect(cssContent).toContain('-moz-osx-font-smoothing: grayscale;');
  });

  it('empirically decodes and verifies unchecked checkbox SVG data URI', () => {
    const uncheckedMatch = cssContent.match(/\.todo-list\s+li\s+\.toggle\s*\+\s*label\s*\{[^}]*background-image:\s*url\('([^']+)'\)/);
    expect(uncheckedMatch).not.toBeNull();
    const dataUri = uncheckedMatch![1];
    expect(dataUri.startsWith('data:image/svg+xml;utf8,')).toBe(true);

    const rawSvg = decodeURIComponent(dataUri.replace('data:image/svg+xml;utf8,', ''));
    expect(rawSvg).toContain('xmlns="http://www.w3.org/2000/svg"');
    expect(rawSvg).toContain('width="40"');
    expect(rawSvg).toContain('height="40"');
    expect(rawSvg).toContain('viewBox="-10 -18 100 135"');
    expect(rawSvg).toContain('circle');
    expect(rawSvg).toContain('cx="50"');
    expect(rawSvg).toContain('cy="50"');
    expect(rawSvg).toContain('r="50"');
    expect(rawSvg).toContain('fill="none"');
    expect(rawSvg).toContain('stroke="#949494"');
    expect(rawSvg).toContain('stroke-width="3"');
  });

  it('empirically decodes and verifies checked checkbox SVG data URI', () => {
    const checkedMatch = cssContent.match(/\.todo-list\s+li\s+\.toggle:checked\s*\+\s*label\s*\{[^}]*background-image:\s*url\('([^']+)'\)/);
    expect(checkedMatch).not.toBeNull();
    const dataUri = checkedMatch![1];
    expect(dataUri.startsWith('data:image/svg+xml;utf8,')).toBe(true);

    const rawSvg = decodeURIComponent(dataUri.replace('data:image/svg+xml;utf8,', ''));
    expect(rawSvg).toContain('xmlns="http://www.w3.org/2000/svg"');
    expect(rawSvg).toContain('width="40"');
    expect(rawSvg).toContain('height="40"');
    expect(rawSvg).toContain('viewBox="-10 -18 100 135"');
    expect(rawSvg).toContain('circle');
    expect(rawSvg).toContain('cx="50"');
    expect(rawSvg).toContain('cy="50"');
    expect(rawSvg).toContain('r="50"');
    expect(rawSvg).toContain('stroke="#59A193"');
    expect(rawSvg).toContain('path');
    expect(rawSvg).toContain('fill="#3EA390"');
    expect(rawSvg).toContain('d="M72 25L42 71 27 56l-4 4 20 20 34-52z"');
  });

  it('verifies all essential TodoMVC CSS class selectors exist and are well-formed', () => {
    const requiredSelectors = [
      '.todoapp',
      '.new-todo',
      '.main',
      '.toggle-all',
      '.toggle-all + label',
      '.toggle-all + label:before',
      '.toggle-all:checked + label:before',
      '.todo-list',
      '.todo-list li',
      '.todo-list li:last-child',
      '.todo-list li.editing',
      '.todo-list li.editing .edit',
      '.todo-list li.editing .view',
      '.todo-list li .toggle',
      '.todo-list li label',
      '.todo-list li.completed label',
      '.todo-list li .destroy',
      '.todo-list li .destroy:hover',
      '.todo-list li .destroy:after',
      '.todo-list li:hover .destroy',
      '.todo-list li .edit',
      '.footer',
      '.footer:before',
      '.todo-count',
      '.filters',
      '.filters li',
      '.filters li a',
      '.filters li a.selected',
      '.clear-completed',
      '.info'
    ];

    for (const selector of requiredSelectors) {
      expect(cssContent).toContain(selector);
    }
  });

  it('verifies pseudo-elements and typography unicode icons', () => {
    // Chevron for toggle-all
    expect(cssContent).toContain("content: '❯';");
    // Close multiplication sign for destroy
    expect(cssContent).toContain("content: '×';");
    // Footer multi-sheet stack shadow
    expect(cssContent).toContain("content: '';");
    expect(cssContent).toContain('0 8px 0 -3px #f6f6f6');
    expect(cssContent).toContain('0 16px 0 -6px #f6f6f6');
  });

  it('verifies media queries integrity and responsive breakpoints', () => {
    expect(cssContent).toContain('@media screen and (-webkit-min-device-pixel-ratio:0)');
    expect(cssContent).toContain('@media (max-width: 430px)');
  });

  it('verifies accessibility focus styles', () => {
    expect(cssContent).toContain(':focus,');
    expect(cssContent).toContain('.toggle:focus + label,');
    expect(cssContent).toContain('.toggle-all:focus + label');
    expect(cssContent).toContain('box-shadow: 0 0 2px 2px #CF7D7D;');
  });
});
