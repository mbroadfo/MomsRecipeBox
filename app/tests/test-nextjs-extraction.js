import axios from 'axios';

// Simplified version of the extraction function for testing
function extractNextJsRecipeData(htmlContent) {
  try {
    const match = htmlContent.match(/<script id="__NEXT_DATA__" type="application\/json">(.*?)<\/script>/s);
    if (!match) {
      return null;
    }

    const data = JSON.parse(match[1]);
    console.log('Found __NEXT_DATA__ - attempting to extract recipe data');

    let recipeData = null;
    
    if (data?.props?.pageProps?.trpcState?.queries) {
      const query = data.props.pageProps.trpcState.queries.find(q => 
        q.state?.data?.ingredientsArray || q.state?.data?.instructionsArray
      );
      if (query?.state?.data) {
        recipeData = query.state.data;
      }
    }

    if (!recipeData && data?.props?.pageProps?.recipe) {
      recipeData = data.props.pageProps.recipe;
    }

    if (!recipeData) {
      return null;
    }

    const recipe = {
      title: recipeData.title || recipeData.name || '',
      description: '',
      ingredients: [],
      instructions: [],
      servings: recipeData.servings || recipeData.yield || '',
      prepTime: recipeData.prepTime || '',
      cookTime: recipeData.cookTime || '',
      totalTime: recipeData.totalTime || '',
      author: recipeData.author || '',
      source: recipeData.source || '',
      imageUrl: null
    };

    if (recipeData.description) {
      if (Array.isArray(recipeData.description)) {
        recipe.description = recipeData.description
          .map(block => block.children?.map(child => child.text).join('') || '')
          .join('\n');
      } else {
        recipe.description = recipeData.description;
      }
    }

    if (recipeData.ingredientsArray) {
      recipeData.ingredientsArray.forEach(ing => {
        if (ing._type === 'ingredientSection') {
          recipe.ingredients.push(`\n${ing.section || ing.name}:`);
        } else if (ing._type === 'ingredient' || ing.item) {
          let ingredientLine = '';
          if (ing.amount) ingredientLine += `${ing.amount} `;
          if (ing.unit) ingredientLine += `${ing.unit} `;
          if (ing.item) ingredientLine += ing.item;
          
          if (ing.notes && Array.isArray(ing.notes)) {
            const notes = ing.notes
              .map(block => block.children?.map(child => child.text).join('') || '')
              .join(' ');
            if (notes) ingredientLine += ` (${notes})`;
          }
          
          recipe.ingredients.push(ingredientLine.trim());
        }
      });
    }

    if (recipeData.instructionsArray) {
      recipeData.instructionsArray.forEach((step, index) => {
        if (step.headline || step.freeformDescription) {
          let instruction = '';
          
          if (step.headline) {
            instruction += step.headline;
          }
          
          if (step.freeformDescription && Array.isArray(step.freeformDescription)) {
            const description = step.freeformDescription
              .map(block => block.children?.map(child => child.text).join('') || '')
              .join(' ');
            if (description) {
              instruction += (instruction ? ': ' : '') + description;
            }
          }
          
          if (instruction) {
            recipe.instructions.push(instruction.trim());
          }
        } else if (step.text || step.description) {
          recipe.instructions.push(step.text || step.description);
        }
      });
    }

    if (recipeData.servingsString) {
      recipe.servings = recipeData.servingsString;
    } else if (recipeData.servings) {
      recipe.servings = recipeData.servings.toString();
    }

    if (recipeData.timing) {
      if (recipeData.timing.prep) recipe.prepTime = recipeData.timing.prep;
      if (recipeData.timing.cook) recipe.cookTime = recipeData.timing.cook;
      if (recipeData.timing.total) recipe.totalTime = recipeData.timing.total;
    }

    // Extract image URL from various possible patterns
    if (recipeData.mainImage?.asset?.url) {
      recipe.imageUrl = recipeData.mainImage.asset.url;
      console.log(`Extracted image URL from Next.js data (mainImage): ${recipe.imageUrl}`);
    } else if (recipeData.featuredImage?.asset?.url) {
      recipe.imageUrl = recipeData.featuredImage.asset.url;
      console.log(`Extracted image URL from Next.js data (featuredImage): ${recipe.imageUrl}`);
    } else if (recipeData.image) {
      if (typeof recipeData.image === 'string') {
        recipe.imageUrl = recipeData.image;
      } else if (recipeData.image.url) {
        recipe.imageUrl = recipeData.image.url;
      } else if (recipeData.image.asset?.url) {
        recipe.imageUrl = recipeData.image.asset.url;
      }
      if (recipe.imageUrl) {
        console.log(`Extracted image URL from Next.js data (image): ${recipe.imageUrl}`);
      }
    }

    if (recipe.ingredients.length > 0 || recipe.instructions.length > 0) {
      console.log(`Extracted ${recipe.ingredients.length} ingredients and ${recipe.instructions.length} instructions from Next.js data`);
      return recipe;
    }

    return null;
  } catch (error) {
    console.log('Error extracting Next.js recipe data:', error.message);
    return null;
  }
}

const url = 'https://www.madewithlau.com/recipes/moo-shu-pork';

console.log('🧪 Testing Next.js Recipe Extraction');
console.log('📍 URL:', url);
console.log('');

try {
    const response = await axios.get(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
        }
    });

    const recipe = extractNextJsRecipeData(response.data);
    
    if (recipe) {
        console.log('✅ SUCCESS! Extracted recipe data:');
        console.log('');
        console.log('📝 Title:', recipe.title);
        console.log('📖 Description:', recipe.description ? recipe.description.substring(0, 200) + '...' : 'None');
        console.log('🖼️  Image URL:', recipe.imageUrl || 'None');
        console.log('🍽️  Servings:', recipe.servings || 'Not specified');
        console.log('⏱️  Prep Time:', recipe.prepTime || 'Not specified');
        console.log('⏱️  Cook Time:', recipe.cookTime || 'Not specified');
        console.log('');
        console.log('🥘 Ingredients (' + recipe.ingredients.length + '):');
        recipe.ingredients.slice(0, 10).forEach(ing => console.log('  ' + ing));
        if (recipe.ingredients.length > 10) {
            console.log('  ... and ' + (recipe.ingredients.length - 10) + ' more');
        }
        console.log('');
        console.log('📋 Instructions (' + recipe.instructions.length + '):');
        recipe.instructions.slice(0, 3).forEach((ins, i) => {
            console.log(`  ${i + 1}. ${ins.substring(0, 100)}${ins.length > 100 ? '...' : ''}`);
        });
        if (recipe.instructions.length > 3) {
            console.log('  ... and ' + (recipe.instructions.length - 3) + ' more steps');
        }
        
        console.log('');
        console.log('✅ Test passed! Next.js extraction working correctly.');
    } else {
        console.log('❌ FAIL: Could not extract recipe data from Next.js');
    }
} catch (error) {
    console.error('❌ Error:', error.message);
}
