// Franchise War Room & Target Wishlist Storage (Per-Room Scoped)

export interface WishlistItem {
  playerId: number;
  maxBudgetLakhs?: number;
  notes?: string;
  addedAt: number;
}

function getStorageKey(roomCode: string): string {
  return `ipl_auction_wishlist_${roomCode.trim().toUpperCase()}`;
}

export function getWishlist(roomCode: string): Map<number, WishlistItem> {
  if (typeof window === 'undefined') return new Map();
  try {
    const raw = localStorage.getItem(getStorageKey(roomCode));
    if (!raw) return new Map();
    const arr = JSON.parse(raw) as WishlistItem[];
    const map = new Map<number, WishlistItem>();
    for (const item of arr) {
      map.set(item.playerId, item);
    }
    return map;
  } catch {
    return new Map();
  }
}

export function saveWishlist(roomCode: string, map: Map<number, WishlistItem>): void {
  if (typeof window === 'undefined') return;
  try {
    const arr = Array.from(map.values());
    localStorage.setItem(getStorageKey(roomCode), JSON.stringify(arr));
    window.dispatchEvent(new CustomEvent('ipl_wishlist_updated', { detail: { roomCode } }));
  } catch {
    // Ignore storage quota
  }
}

export function isWishlisted(roomCode: string, playerId: number): boolean {
  return getWishlist(roomCode).has(playerId);
}

export function toggleWishlist(
  roomCode: string,
  playerId: number,
  maxBudgetLakhs?: number
): boolean {
  const map = getWishlist(roomCode);
  let nowWishlisted = false;
  if (map.has(playerId)) {
    map.delete(playerId);
    nowWishlisted = false;
  } else {
    map.set(playerId, {
      playerId,
      maxBudgetLakhs,
      addedAt: Date.now(),
    });
    nowWishlisted = true;
  }
  saveWishlist(roomCode, map);
  return nowWishlisted;
}

export function updateWishlistBudget(
  roomCode: string,
  playerId: number,
  maxBudgetLakhs: number | undefined
): void {
  const map = getWishlist(roomCode);
  const existing = map.get(playerId);
  if (existing) {
    existing.maxBudgetLakhs = maxBudgetLakhs;
    saveWishlist(roomCode, map);
  }
}

