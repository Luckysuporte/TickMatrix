// Utilitários de favoritos — persistidos no localStorage

export type FavoriteAsset = {
    value: string;       // ex: "EURUSD" ou "BTCUSDT"
    label: string;       // ex: "EUR/USD"
    description: string; // ex: "Euro / Dólar"
    assetType: string;   // "forex" | "crypto" | "stocks" | "indices" | "commodity"
};

const KEY = 'tm_favorites';

export function getFavorites(): FavoriteAsset[] {
    if (typeof window === 'undefined') return [];
    try {
        return JSON.parse(localStorage.getItem(KEY) ?? '[]') as FavoriteAsset[];
    } catch {
        return [];
    }
}

export function isFavorite(value: string): boolean {
    return getFavorites().some(f => f.value === value);
}

export function toggleFavorite(asset: FavoriteAsset): boolean {
    const list = getFavorites();
    const exists = list.some(f => f.value === asset.value);
    if (exists) {
        localStorage.setItem(KEY, JSON.stringify(list.filter(f => f.value !== asset.value)));
        return false; // removido
    } else {
        list.push(asset);
        localStorage.setItem(KEY, JSON.stringify(list));
        return true; // adicionado
    }
}
