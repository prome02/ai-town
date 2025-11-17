// Predefined locations for the discrete location system
// Map dimensions: 48 x 32 tiles

export type LocationType = 'social' | 'work' | 'leisure' | 'public';

export interface Location {
  id: string;
  name: string;
  description: string;
  position: { x: number; y: number };
  type: LocationType;
  capacity?: number; // Optional: max players allowed
}

export const defaultLocations: Location[] = [
  {
    id: 'town_square',
    name: '城鎮廣場',
    description: '小鎮的中心集會地，大家常在這裡碰面',
    position: { x: 24, y: 16 }, // Center of map
    type: 'public',
  },
  {
    id: 'cafe',
    name: '咖啡廳',
    description: '一個溫馨的聚會場所，適合聊天交流',
    position: { x: 12, y: 18 },
    type: 'social',
  },
  {
    id: 'library',
    name: '圖書館',
    description: '安靜的閱讀空間，可以專心學習',
    position: { x: 38, y: 12 },
    type: 'leisure',
  },
  {
    id: 'park',
    name: '公園',
    description: '綠意盎然的休閒場所',
    position: { x: 10, y: 8 },
    type: 'leisure',
  },
  {
    id: 'office',
    name: '辦公室',
    description: '工作和協作的地方',
    position: { x: 35, y: 25 },
    type: 'work',
  },
  {
    id: 'market',
    name: '市場',
    description: '熱鬧的購物區域',
    position: { x: 20, y: 28 },
    type: 'public',
  },
  {
    id: 'garden',
    name: '花園',
    description: '寧靜的戶外空間，適合散步和思考',
    position: { x: 42, y: 6 },
    type: 'leisure',
  },
  {
    id: 'community_center',
    name: '社區中心',
    description: '社區活動和聚會的場所',
    position: { x: 6, y: 24 },
    type: 'social',
  },
];
