import { v } from 'convex/values';
import { internalMutation, query } from '../_generated/server';

// 初始化測試地點
export const initializeTestLocations = internalMutation({
  args: { worldId: v.id('worlds') },
  handler: async (ctx, { worldId }) => {
    // 檢查是否已存在
    const existing = await ctx.db
      .query('locations')
      .withIndex('worldId', (q) => q.eq('worldId', worldId))
      .first();

    if (existing) {
      console.log('Locations already initialized');
      return { success: false, message: 'Already exists' };
    }

    // 創建測試地點
    const locations = [
      {
        worldId,
        locationId: 'lobby',
        name: '大廳',
        description: 'A spacious hotel lobby with comfortable seating and a reception desk',
        type: 'public' as const,
        connectedTo: ['room101', 'garden', 'dining'],
        capacity: 10,
      },
      {
        worldId,
        locationId: 'room101',
        name: '101號房',
        description: 'A cozy hotel room with a bed, desk, and window with garden view',
        type: 'room' as const,
        connectedTo: ['lobby'],
        capacity: 2,
      },
      {
        worldId,
        locationId: 'garden',
        name: '花園',
        description: 'A peaceful garden with flowers, benches, and a fountain',
        type: 'public' as const,
        connectedTo: ['lobby'],
        capacity: 5,
      },
      {
        worldId,
        locationId: 'dining',
        name: '餐廳',
        description: 'A cozy dining area with several tables and a self-service buffet',
        type: 'public' as const,
        connectedTo: ['lobby'],
        capacity: 8,
      },
    ];

    for (const loc of locations) {
      await ctx.db.insert('locations', loc);
    }

    console.log('Test locations created:', locations.length);
    return { success: true, count: locations.length };
  },
});

// 查詢所有地點
export const getAllLocations = query({
  args: { worldId: v.id('worlds') },
  handler: async (ctx, { worldId }) => {
    return await ctx.db
      .query('locations')
      .withIndex('worldId', (q) => q.eq('worldId', worldId))
      .collect();
  },
});

// 查詢單一地點
export const getLocation = query({
  args: {
    worldId: v.id('worlds'),
    locationId: v.string(),
  },
  handler: async (ctx, { worldId, locationId }) => {
    return await ctx.db
      .query('locations')
      .withIndex('locationId', (q) => q.eq('worldId', worldId).eq('locationId', locationId))
      .first();
  },
});
