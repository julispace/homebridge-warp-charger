import assert from 'node:assert/strict';
import test from 'node:test';

import { buildAccessoryContext } from './platformAccessory.js';

test('buildAccessoryContext maps EV charger and energy capabilities to outlet profile', () => {
  const context = buildAccessoryContext(
    {
      id: 'warp3-AbCd',
      address: 'warp3-AbCd.local',
      enabled: true,
      apiProtocol: 'http',
      apiPort: 80,
    },
    {
      name: 'warp3-AbCd',
      displayName: 'Garage Charger',
      displayType: 'WARP Charger Smart',
      uid: 'abc12345',
      firmware: '2.8.1',
      capabilities: ['ev_charger', 'power', 'energy', 'backup'],
    },
  );

  assert.equal(context.name, 'Garage Charger');
  assert.equal(context.model, 'WARP Charger Smart');
  assert.equal(context.serialNumber, 'abc12345');
  assert.equal(context.firmwareRevision, '2.8.1');
  assert.equal(context.profile.primary, 'outlet');
  assert.equal(context.profile.energy, true);
  assert.equal(context.profile.battery, true);
});

test('buildAccessoryContext uses safe defaults when metadata is missing', () => {
  const context = buildAccessoryContext(
    {
      id: 'wem-a1b2',
      address: '192.168.1.22',
    },
    undefined,
  );

  assert.equal(context.name, 'wem-a1b2');
  assert.equal(context.model, 'Warp Device');
  assert.equal(context.serialNumber, 'wem-a1b2');
  assert.deepEqual(context.capabilities, []);
  assert.deepEqual(context.profile, {
    primary: 'switch',
    energy: false,
    battery: false,
  });
});

test('buildAccessoryContext normalizes duplicate capabilities and charger model hints', () => {
  const context = buildAccessoryContext(
    {
      id: 'warpX-1234',
      address: 'warpX-1234.local',
    },
    {
      type: 'EV Charger Pro',
      capabilities: [' ENERGY ', 'energy', 'POWER'],
    },
  );

  assert.deepEqual(context.capabilities, ['energy', 'power']);
  assert.equal(context.profile.primary, 'outlet');
  assert.equal(context.profile.energy, true);
  assert.equal(context.profile.battery, false);
});
