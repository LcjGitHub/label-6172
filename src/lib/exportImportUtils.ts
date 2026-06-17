import type { Recipe } from '../types';

const EXPORT_FILE_PREFIX = 'soap-recipes-export';
const EXPORT_FILE_VERSION = 1;

interface ExportData {
  version: number;
  exportedAt: string;
  recipes: Recipe[];
}

export function exportRecipesToFile(recipes: Recipe[]): void {
  const exportData: ExportData = {
    version: EXPORT_FILE_VERSION,
    exportedAt: new Date().toISOString(),
    recipes,
  };

  const jsonString = JSON.stringify(exportData, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const dateStr = new Date().toISOString().slice(0, 10);
  const filename = `${EXPORT_FILE_PREFIX}-${dateStr}.json`;

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export async function parseImportFile(file: File): Promise<Recipe[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const data = JSON.parse(content) as ExportData;

        if (!data || typeof data !== 'object') {
          reject(new Error('文件格式无效'));
          return;
        }

        if (!Array.isArray(data.recipes)) {
          reject(new Error('文件中未找到配方数据'));
          return;
        }

        const validRecipes = data.recipes.filter(isValidRecipe);

        if (validRecipes.length === 0) {
          reject(new Error('文件中没有有效的配方数据'));
          return;
        }

        resolve(validRecipes);
      } catch (err) {
        reject(new Error('文件解析失败，请确保是有效的 JSON 文件'));
      }
    };

    reader.onerror = () => {
      reject(new Error('文件读取失败'));
    };

    reader.readAsText(file);
  });
}

function isValidRecipe(recipe: unknown): recipe is Recipe {
  if (!recipe || typeof recipe !== 'object') return false;

  const r = recipe as Record<string, unknown>;

  return (
    typeof r.name === 'string' &&
    r.name.trim().length > 0 &&
    typeof r.totalOilWeight === 'number' &&
    Array.isArray(r.oils) &&
    typeof r.lyeAmount === 'string' &&
    typeof r.waterAmount === 'string'
  );
}

export interface MergeResult {
  importedCount: number;
  skippedCount: number;
}

export function mergeRecipes(existing: Recipe[], incoming: Recipe[]): MergeResult {
  const existingNames = new Set(existing.map((r) => r.name.trim().toLowerCase()));
  const imported: Recipe[] = [];
  let skippedCount = 0;

  for (const recipe of incoming) {
    const normalizedName = recipe.name.trim().toLowerCase();
    if (existingNames.has(normalizedName)) {
      skippedCount++;
    } else {
      imported.push({
        ...recipe,
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
      });
      existingNames.add(normalizedName);
    }
  }

  return {
    importedCount: imported.length,
    skippedCount,
  };
}
