import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { mergeRecipes, type MergeResult } from '../lib/exportImportUtils';
import type { OilRatio, Recipe } from '../types';

export interface SaveRecipeOptions {
  overwriteId?: string;
  overwriteByName?: boolean;
}

export interface SaveRecipeResult {
  type: 'created' | 'updated';
  recipe: Recipe;
}

interface RecipeState {
  recipes: Recipe[];
  addRecipe: (recipe: Omit<Recipe, 'id' | 'createdAt'>) => void;
  updateRecipe: (id: string, recipe: Omit<Recipe, 'id' | 'createdAt'>) => Recipe | null;
  saveRecipe: (
    recipe: Omit<Recipe, 'id' | 'createdAt'>,
    options?: SaveRecipeOptions,
  ) => SaveRecipeResult;
  removeRecipe: (id: string) => void;
  duplicateRecipe: (id: string) => Recipe | null;
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
      updateRecipe: (id, recipe) => {
        const existing = get().recipes.find((r) => r.id === id);
        if (!existing) return null;
        const updated: Recipe = {
          ...existing,
          ...recipe,
          id,
          createdAt: existing.createdAt,
        };
        set((state) => ({
          recipes: state.recipes.map((r) => (r.id === id ? updated : r)),
        }));
        return updated;
      },
      saveRecipe: (recipe, options = {}) => {
        const { overwriteId, overwriteByName } = options;
        const now = new Date().toISOString();

        if (overwriteId) {
          const existing = get().recipes.find((r) => r.id === overwriteId);
          if (existing) {
            const updated: Recipe = {
              ...existing,
              ...recipe,
              id: overwriteId,
              createdAt: existing.createdAt,
            };
            set((state) => ({
              recipes: state.recipes.map((r) => (r.id === overwriteId ? updated : r)),
            }));
            return { type: 'updated', recipe: updated };
          }
        }

        if (overwriteByName) {
          const existing = get().recipes.find((r) => r.name === recipe.name);
          if (existing) {
            const updated: Recipe = {
              ...existing,
              ...recipe,
              id: existing.id,
              createdAt: existing.createdAt,
            };
            set((state) => ({
              recipes: state.recipes.map((r) => (r.id === existing.id ? updated : r)),
            }));
            return { type: 'updated', recipe: updated };
          }
        }

        const created: Recipe = {
          ...recipe,
          id: crypto.randomUUID(),
          createdAt: now,
        };
        set((state) => ({
          recipes: [created, ...state.recipes],
        }));
        return { type: 'created', recipe: created };
      },
      removeRecipe: (id) =>
        set((state) => ({
          recipes: state.recipes.filter((r) => r.id !== id),
        })),
      duplicateRecipe: (id) => {
        const source = get().recipes.find((r) => r.id === id);
        if (!source) return null;
        const copy: Recipe = {
          ...source,
          id: crypto.randomUUID(),
          name: `${source.name}副本`,
          createdAt: new Date().toISOString(),
        };
        set((state) => ({
          recipes: [copy, ...state.recipes],
        }));
        return copy;
      },
      importRecipes: (incoming) => {
        const existing = get().recipes;
        const result = mergeRecipes(existing, incoming);
        if (result.importedCount > 0) {
          set((state) => ({
            recipes: [...result.importedRecipes, ...state.recipes],
          }));
        }
        return result;
      },
    }),
    { name: 'soap-recipes' },
  ),
);

export type { OilRatio };
