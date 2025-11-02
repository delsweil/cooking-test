export type Recipe = { id: string; title: string; steps: string[] };
import data from './recipes.json';
export const RECIPES = data as unknown as Recipe[];
export function getRecipe(id: string) {
  return RECIPES.find(r => r.id === id) ?? null;
}
