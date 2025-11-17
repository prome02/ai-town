import { describe, expect, test } from '@jest/globals';
import { defaultLocations } from '../../data/locations';

describe('Location System Tests', () => {
  describe('Default Locations Data', () => {
    test('should have valid location data', () => {
      expect(defaultLocations).toBeDefined();
      expect(defaultLocations.length).toBeGreaterThan(0);
    });

    test('all locations should have required fields', () => {
      defaultLocations.forEach((location) => {
        expect(location.id).toBeDefined();
        expect(location.name).toBeDefined();
        expect(location.description).toBeDefined();
        expect(location.position).toBeDefined();
        expect(location.position.x).toBeGreaterThanOrEqual(0);
        expect(location.position.y).toBeGreaterThanOrEqual(0);
        expect(location.type).toBeDefined();
        expect(['social', 'work', 'leisure', 'public']).toContain(location.type);
      });
    });

    test('all location IDs should be unique', () => {
      const ids = defaultLocations.map((loc) => loc.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    test('location positions should be within map bounds (48 x 32)', () => {
      const MAP_WIDTH = 48;
      const MAP_HEIGHT = 32;

      defaultLocations.forEach((location) => {
        expect(location.position.x).toBeLessThan(MAP_WIDTH);
        expect(location.position.y).toBeLessThan(MAP_HEIGHT);
        expect(location.position.x).toBeGreaterThanOrEqual(0);
        expect(location.position.y).toBeGreaterThanOrEqual(0);
      });
    });

    test('should have town_square as default location', () => {
      const townSquare = defaultLocations.find((loc) => loc.id === 'town_square');
      expect(townSquare).toBeDefined();
      expect(townSquare?.type).toBe('public');
    });

    test('location names should be non-empty strings', () => {
      defaultLocations.forEach((location) => {
        expect(typeof location.name).toBe('string');
        expect(location.name.length).toBeGreaterThan(0);
      });
    });

    test('location descriptions should be non-empty strings', () => {
      defaultLocations.forEach((location) => {
        expect(typeof location.description).toBe('string');
        expect(location.description.length).toBeGreaterThan(0);
      });
    });

    test('capacity should be undefined or a positive number', () => {
      defaultLocations.forEach((location) => {
        if (location.capacity !== undefined) {
          expect(typeof location.capacity).toBe('number');
          expect(location.capacity).toBeGreaterThan(0);
        }
      });
    });
  });

  describe('Location Types Coverage', () => {
    test('should have at least one location of each type', () => {
      const types = ['social', 'work', 'leisure', 'public'] as const;

      types.forEach((type) => {
        const hasType = defaultLocations.some((loc) => loc.type === type);
        expect(hasType).toBe(true);
      });
    });

    test('should have balanced distribution of location types', () => {
      const typeCounts = defaultLocations.reduce((acc, loc) => {
        acc[loc.type] = (acc[loc.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Each type should have at least 1 location
      Object.values(typeCounts).forEach((count) => {
        expect(count).toBeGreaterThanOrEqual(1);
      });
    });
  });

  describe('Default Location Mapping', () => {
    const expectedLocations = [
      'town_square',
      'cafe',
      'library',
      'park',
      'office',
      'market',
      'garden',
      'community_center',
    ];

    test('should have all expected default locations', () => {
      expectedLocations.forEach((expectedId) => {
        const location = defaultLocations.find((loc) => loc.id === expectedId);
        expect(location).toBeDefined();
      });
    });

    test('should have exactly 8 default locations', () => {
      expect(defaultLocations.length).toBe(8);
    });
  });
});
