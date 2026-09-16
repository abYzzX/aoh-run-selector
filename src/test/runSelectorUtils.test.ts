import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createLaunchChoiceKey,
  escapeStatusBarText,
  isDuplicateLaunchChoice
} from '../runSelectorUtils';

test('creates stable launch choice keys', () => {
  assert.equal(createLaunchChoiceKey('workspace', 'API'), 'workspace::API');
  assert.equal(createLaunchChoiceKey('file:///repo', 'Worker'), 'file:///repo::Worker');
});

test('escapes codicon-like text in status bar labels', () => {
  assert.equal(escapeStatusBarText('Run $(rocket)'), 'Run \\$(rocket)');
  assert.equal(escapeStatusBarText('Plain name'), 'Plain name');
});

test('detects duplicate workspace launch configurations by name and debugger type', () => {
  const existing = [
    { name: 'Application', type: 'coreclr' },
    { name: 'Frontend', type: 'pwa-node' }
  ];

  assert.equal(isDuplicateLaunchChoice(existing, { name: 'Application', type: 'coreclr' }), true);
  assert.equal(isDuplicateLaunchChoice(existing, { name: 'Application', type: 'node' }), false);
  assert.equal(isDuplicateLaunchChoice(existing, { name: 'Other', type: 'coreclr' }), false);
});

test('does not treat unnamed configurations as duplicates', () => {
  assert.equal(isDuplicateLaunchChoice([{ name: 'Application', type: 'coreclr' }], { type: 'coreclr' }), false);
});
