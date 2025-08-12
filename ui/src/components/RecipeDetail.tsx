// Wrapper re-export bridging old path to new modular implementation without casing conflict
import { RecipeDetailContainer } from './recipeDetail/RecipeDetailContainer';

export const RecipeDetail = RecipeDetailContainer;
export default RecipeDetailContainer;
