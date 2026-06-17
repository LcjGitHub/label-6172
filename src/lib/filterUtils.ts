import type { Recipe } from '../types';

/**
 * 按名称关键字过滤配方列表
 * @param recipes - 配方列表
 * @param keyword - 搜索关键字
 * @returns 过滤后的配方列表
 */
export function filterRecipesByName(recipes: Recipe[], keyword: string): Recipe[] {
  const kw = keyword.trim().toLowerCase();
  if (!kw) return recipes;
  return recipes.filter((recipe) => recipe.name.toLowerCase().includes(kw));
}
