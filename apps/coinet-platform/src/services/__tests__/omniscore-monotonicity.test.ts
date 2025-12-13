import { calculatePOSWithBaselineTilt } from '../omniscore';

describe('OmniScore v2.4.1 monotonicity', () => {
  const riskFixed = 50;

  test('POS is non-decreasing in QS when OS and Risk are fixed', () => {
    const os = 40;
    for (let qs1 = 0; qs1 <= 95; qs1 += 5) {
      const qs2 = qs1 + 5;
      const p1 = calculatePOSWithBaselineTilt(qs1, os, riskFixed, false).posCore;
      const p2 = calculatePOSWithBaselineTilt(qs2, os, riskFixed, false).posCore;
      expect(p2).toBeGreaterThanOrEqual(p1);
    }
  });

  test('POS is non-decreasing in OS when QS and Risk are fixed', () => {
    const qs = 80;
    for (let os1 = 0; os1 <= 95; os1 += 5) {
      const os2 = os1 + 5;
      const p1 = calculatePOSWithBaselineTilt(qs, os1, riskFixed, false).posCore;
      const p2 = calculatePOSWithBaselineTilt(qs, os2, riskFixed, false).posCore;
      expect(p2).toBeGreaterThanOrEqual(p1);
    }
  });
});
