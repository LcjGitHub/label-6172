import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { OilRatio, Recipe } from '../types';

interface RecipeState {
  recipes: Recipe[];
  addRecipe: (recipe: Omit<Recipe, 'id' | 'createdAt'>) => void;
  removeRecipe: (id: string) => void;
}

/**
 * 配方持久化 Store（localStorage）
 */
export const useRecipeStore = create<RecipeState>()(
  persist(
    (set) => ({
      recipes: [],
      addRecipe: (recipe) =>
        set((state) => ({
          recipes: [
            {
              ...recipe,
              id: crypto.randomUUID(),
              createdAt: new Date().toISOString(),
            },
            ...state.recipes,
          ],
        })),
      removeRecipe: (id) =>
        set((state) => ({
          recipes: state.recipes.filter((r) => r.id !== id),
        })),
    }),
    { name: 'soap-recipes' },
  ),
);

export type { OilRatio };
