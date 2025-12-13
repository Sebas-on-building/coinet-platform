/**
 * OmniScore v2.5.0 Formula Verification Tests
 * 
 * These tests verify that the convex combination formula behaves as expected
 * with controlled inputs. If these pass but real-world scores feel wrong,
 * the issue is with INPUT VALUES, not the formula itself.
 */

import { calculatePOSConvexCombination } from '../omniscore';

describe('OmniScore v2.5.0 Formula Verification', () => {
  
  describe('Mathematical Properties', () => {
    it('should produce POS within [0, 100] for all valid inputs', () => {
      const testCases = [
        { qs: 0, os: 0, risk: 0 },
        { qs: 100, os: 100, risk: 100 },
        { qs: 50, os: 50, risk: 50 },
        { qs: 87, os: 43, risk: 35 },  // ETH scenario
        { qs: 60, os: 40, risk: 60 },  // SOL scenario
        { qs: 90, os: 20, risk: 80 },  // High QS, low OS, high Risk
      ];

      testCases.forEach(({ qs, os, risk }) => {
        const result = calculatePOSConvexCombination(qs, os, risk, false);
        expect(result.posCore).toBeGreaterThanOrEqual(0);
        expect(result.posCore).toBeLessThanOrEqual(100);
      });
    });

    it('should respect weight proportions: W_F=0.6, W_O=0.25, W_S=0.15', () => {
      // Test: Increase only QS by 10, others constant
      const base = calculatePOSConvexCombination(50, 50, 50, false);
      const qsUp = calculatePOSConvexCombination(60, 50, 50, false);
      
      const qsImpact = qsUp.posCore - base.posCore;
      expect(qsImpact).toBeCloseTo(10 * 0.6, 1); // 6.0 points

      // Test: Increase only OS by 10, others constant
      const osUp = calculatePOSConvexCombination(50, 60, 50, false);
      const osImpact = osUp.posCore - base.posCore;
      expect(osImpact).toBeCloseTo(10 * 0.25, 1); // 2.5 points

      // Test: Decrease Risk by 10 (increase Safety by 10), others constant
      const riskDown = calculatePOSConvexCombination(50, 50, 40, false);
      const safetyImpact = riskDown.posCore - base.posCore;
      expect(safetyImpact).toBeCloseTo(10 * 0.15, 1); // 1.5 points
    });

    it('should calculate exact expected values for known inputs', () => {
      // ETH scenario: QS=87, OS=43, Risk=35
      // Expected: 0.6*87 + 0.25*43 + 0.15*(100-35) = 52.2 + 10.75 + 9.75 = 72.7
      const ethResult = calculatePOSConvexCombination(87, 43, 35, false);
      expect(ethResult.posCore).toBeCloseTo(72.7, 1);

      // SOL scenario: QS=60, OS=40, Risk=60
      // Expected: 0.6*60 + 0.25*40 + 0.15*(100-60) = 36 + 10 + 6 = 52
      const solResult = calculatePOSConvexCombination(60, 40, 60, false);
      expect(solResult.posCore).toBeCloseTo(52, 1);

      // BTC scenario: QS=80, OS=90, Risk=20
      // Expected: 0.6*80 + 0.25*90 + 0.15*(100-20) = 48 + 22.5 + 12 = 82.5
      const btcResult = calculatePOSConvexCombination(80, 90, 20, false);
      expect(btcResult.posCore).toBeCloseTo(82.5, 1);
    });
  });

  describe('Fundamentals Floor Behavior', () => {
    it('should NOT apply floor when posCore is above floor threshold', () => {
      // QS=85 has floor=55, but posCore will be higher
      // POS = 0.6*85 + 0.25*70 + 0.15*70 = 51 + 17.5 + 10.5 = 79
      const result = calculatePOSConvexCombination(85, 70, 30, false);
      expect(result.appliedFloor).toBe(false);
      expect(result.posCore).toBeCloseTo(79, 1);
    });

    it('should apply floor when posCore falls below floor threshold', () => {
      // QS=90 has floor=65
      // POS = 0.6*90 + 0.25*20 + 0.15*20 = 54 + 5 + 3 = 62
      // But floor=65, so should boost to 65
      const result = calculatePOSConvexCombination(90, 20, 80, false);
      expect(result.appliedFloor).toBe(true);
      expect(result.floor).toBe(65);
      expect(result.posCore).toBe(65);
    });

    it('should have correct floor thresholds', () => {
      const testCases = [
        { qs: 95, expectedFloor: 65 },
        { qs: 90, expectedFloor: 65 },
        { qs: 89, expectedFloor: 55 },
        { qs: 85, expectedFloor: 55 },
        { qs: 84, expectedFloor: 50 },
        { qs: 80, expectedFloor: 50 },
        { qs: 79, expectedFloor: 45 },
        { qs: 75, expectedFloor: 45 },
        { qs: 74, expectedFloor: 40 },
        { qs: 70, expectedFloor: 40 },
        { qs: 69, expectedFloor: 0 },
        { qs: 50, expectedFloor: 0 },
      ];

      testCases.forEach(({ qs, expectedFloor }) => {
        // Use very low OS and high Risk to force floor application
        const result = calculatePOSConvexCombination(qs, 10, 90, false);
        expect(result.floor).toBe(expectedFloor);
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle null OS (defaults to 50)', () => {
      const result = calculatePOSConvexCombination(70, null, 40, false);
      // Should use OS=50 as default
      // POS = 0.6*70 + 0.25*50 + 0.15*(100-40) = 42 + 12.5 + 9 = 63.5
      expect(result.posCore).toBeCloseTo(63.5, 1);
    });

    it('should handle qsGated=true (forces OS to 50)', () => {
      const result = calculatePOSConvexCombination(70, 80, 40, true);
      // Should ignore OS=80 and use OS=50 due to gating
      // POS = 0.6*70 + 0.25*50 + 0.15*(100-40) = 42 + 12.5 + 9 = 63.5
      expect(result.posCore).toBeCloseTo(63.5, 1);
    });

    it('should handle extreme values correctly', () => {
      // All zeros
      const allZero = calculatePOSConvexCombination(0, 0, 0, false);
      // POS = 0.6*0 + 0.25*0 + 0.15*(100-0) = 0 + 0 + 15 = 15
      expect(allZero.posCore).toBeCloseTo(15, 1);

      // All hundreds
      const allHundred = calculatePOSConvexCombination(100, 100, 100, false);
      // POS = 0.6*100 + 0.25*100 + 0.15*(100-100) = 60 + 25 + 0 = 85
      expect(allHundred.posCore).toBeCloseTo(85, 1);
    });
  });

  describe('Comparison with Previous Scenarios', () => {
    it('should prevent ETH=91.6 bug (should be ~72.7)', () => {
      // The bug scenario: ETH with QS=87, OS=43, Risk=35 was showing 91.6
      // v2.5.0 should give: 0.6*87 + 0.25*43 + 0.15*65 = 72.7
      const result = calculatePOSConvexCombination(87, 43, 35, false);
      
      expect(result.posCore).toBeLessThan(80);  // Should NOT be 91.6
      expect(result.posCore).toBeGreaterThan(70);
      expect(result.posCore).toBeCloseTo(72.7, 1);
    });

    it('should prevent POS from exceeding QS by too much when OS is low', () => {
      // High QS, very low OS should not result in unexpectedly high POS
      const testCases = [
        { qs: 90, os: 30, risk: 30 },
        { qs: 85, os: 25, risk: 40 },
        { qs: 95, os: 20, risk: 35 },
      ];

      testCases.forEach(({ qs, os, risk }) => {
        const result = calculatePOSConvexCombination(qs, os, risk, false);
        // POS should not exceed QS by more than ~15 points in worst case
        const diff = result.posCore - qs;
        expect(diff).toBeLessThan(15);
        expect(diff).toBeGreaterThan(-30); // Can go down by up to 30 if floor doesn't apply
      });
    });
  });

  describe('Formula Invariants', () => {
    it('should maintain monotonicity: higher QS → higher or equal POS (other factors fixed)', () => {
      const qsValues = [50, 60, 70, 80, 90];
      let prevPOS = -1;

      qsValues.forEach(qs => {
        const result = calculatePOSConvexCombination(qs, 50, 50, false);
        expect(result.posCore).toBeGreaterThanOrEqual(prevPOS);
        prevPOS = result.posCore;
      });
    });

    it('should maintain monotonicity: higher OS → higher or equal POS (other factors fixed)', () => {
      const osValues = [20, 40, 60, 80, 100];
      let prevPOS = -1;

      osValues.forEach(os => {
        const result = calculatePOSConvexCombination(70, os, 50, false);
        expect(result.posCore).toBeGreaterThanOrEqual(prevPOS);
        prevPOS = result.posCore;
      });
    });

    it('should maintain monotonicity: lower Risk → higher or equal POS (other factors fixed)', () => {
      const riskValues = [80, 60, 40, 20, 0];
      let prevPOS = -1;

      riskValues.forEach(risk => {
        const result = calculatePOSConvexCombination(70, 50, risk, false);
        expect(result.posCore).toBeGreaterThanOrEqual(prevPOS);
        prevPOS = result.posCore;
      });
    });
  });
});
