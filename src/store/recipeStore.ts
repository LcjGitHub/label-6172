import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { mergeRecipes, type MergeResult } from '../lib/exportImportUtils';
import type { OilRatio, Recipe } from '../types';

interface RecipeState {
  recipes: Recipe[];
  addRecipe: (recipe: Omit<Recipe, 'id' | 'createdAt'>) => void;
  removeRecipe: (id: string) => void;
  importRecipes: (incoming: Recipe[]) => MergeResult;
}

/**
 * 配方持久化 Store（localStorage）
 */
export const useRecipeStore = create<RecipeState>()(
  persist(
    (set, get) => ({
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
      importRecipes: (incoming) => {
        const existing = get().recipes;
        const result = mergeRecipes(existing, incoming);
        if (result.importedCount > 0) {
          set((state) => {
            const existingNames = new Set(
              state.recipes.map((r) => r.name.trim().toLowerCase()),
            );
            const newRecipes = incoming
              .filter((r) => !existingNames.has(r.name.trim().toLowerCase()))
              .map((r) => ({
                ...r,
                id: crypto.randomUUID(),
                createdAt: new Date().toISOString(),
              }));
            return {
              recipes: [...newRecipes, ...state.recipes],
            };
          });
        }
        return result;
      },
    }),
    { name: 'soap-recipes' },
  ),
);

export type { OilRatio };
