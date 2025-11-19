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

    // 創建完整的旅館地點 (Day 8-9 MVP)
    const locations = [
      // 公共區域
      {
        worldId,
        locationId: 'lobby',
        name: '大廳',
        description: 'Spacious hotel lobby with reception desk, comfortable seating, and warm lighting',
        type: 'public' as const,
        connectedTo: ['room101', 'room102', 'room103', 'dining', 'garden'],
        capacity: 12,
        sceneImageUrl: '/scenes/lobby.jpg', // 準備場景圖片
      },
      {
        worldId,
        locationId: 'dining',
        name: '餐廳',
        description: 'Hotel dining room with wooden tables, buffet counter, and soft background music',
        type: 'public' as const,
        connectedTo: ['lobby', 'garden'],
        capacity: 15,
        sceneImageUrl: '/scenes/dining.jpg',
      },
      {
        worldId,
        locationId: 'garden',
        name: '花園',
        description: 'Peaceful outdoor garden with blooming flowers, stone benches, and a decorative fountain',
        type: 'public' as const,
        connectedTo: ['lobby', 'dining', 'rooftop'],
        capacity: 8,
        sceneImageUrl: '/scenes/garden.jpg',
      },
      {
        worldId,
        locationId: 'rooftop',
        name: '屋頂露台',
        description: 'Rooftop terrace with panoramic city views, lounge chairs, and string lights',
        type: 'public' as const,
        connectedTo: ['garden'],
        capacity: 6,
        sceneImageUrl: '/scenes/rooftop.jpg',
      },

      // 客房區域
      {
        worldId,
        locationId: 'room101',
        name: '101號房',
        description: 'Cozy single room with a comfortable bed, writing desk, and garden-view window',
        type: 'room' as const,
        connectedTo: ['lobby'],
        capacity: 2,
        sceneImageUrl: '/scenes/room101.jpg',
      },
      {
        worldId,
        locationId: 'room102',
        name: '102號房',
        description: 'Double room with queen bed, small balcony overlooking the street, and modern amenities',
        type: 'room' as const,
        connectedTo: ['lobby'],
        capacity: 2,
        sceneImageUrl: '/scenes/room102.jpg',
      },
      {
        worldId,
        locationId: 'room103',
        name: '103號房（總統套房）',
        description: 'Luxurious presidential suite with separate living area, king bed, and city skyline view',
        type: 'room' as const,
        connectedTo: ['lobby'],
        capacity: 3,
        sceneImageUrl: '/scenes/room103.jpg',
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
