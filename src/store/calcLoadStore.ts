import { create } from 'zustand';
import type { AlkaliType, OilRatio } from '../types';

export interface LoadedRecipeData {
  recipeName: string;
  totalOilWeight: number;
  superfatPercentage: number;
  alkaliType: AlkaliType;
  oils: OilRatio[];
  recipeNotes?: string;
}

interface CalcLoadState {
  loadedRecipe: LoadedRecipeData | null;
  sourceRecipeId: string | null;
  setLoadedRecipe: (data: LoadedRecipeData, sourceId?: string) => void;
  clearLoadedRecipe: () => void;
}

export const useCalcLoadStore = create<CalcLoadState>((set) => ({
  loadedRecipe: null,
  sourceRecipeId: null,
  setLoadedRecipe: (data, sourceId) =>
    set({ loadedRecipe: data, sourceRecipeId: sourceId ?? null }),
  clearLoadedRecipe: () => set({ loadedRecipe: null, sourceRecipeId: null }),
}));
