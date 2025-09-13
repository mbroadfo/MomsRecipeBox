// User Analytics handler for admin dashboard
import { getDb } from '../../app.js';
import { validateLambdaAuth } from '../jwt_validator.js';
import { PERMISSIONS } from '../admin_permissions.js';

/**
 * Get comprehensive user analytics and engagement metrics
 * Provides insights for admin dashboard analytics section
 */
export async function handler(event) {
  try {
    // Validate admin authentication and VIEW_ANALYTICS permission
    const authResult = await validateLambdaAuth(event, 'admin');
    
    if (!authResult.isAuthorized) {
      return {
        statusCode: authResult.statusCode,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          error: authResult.error,
          details: authResult.details,
          code: 'AUTH_FAILED'
        })
      };
    }

    console.log(`📊 Admin user ${authResult.userId} requesting analytics`);

    const db = await getDb();
    const queryParams = event.queryStringParameters || {};
    const dateRange = queryParams.range || '30'; // Default to 30 days

    // Calculate date ranges
    const now = new Date();
    const daysAgo = parseInt(dateRange);
    const startDate = new Date(now.getTime() - (daysAgo * 24 * 60 * 60 * 1000));

    console.log(`📈 Generating analytics for last ${daysAgo} days (since ${startDate.toISOString()})`);

    // Run analytics queries in parallel for performance
    const [
      userMetrics,
      recipeMetrics,
      engagementMetrics,
      contentMetrics,
      shoppingListMetrics,
      growthMetrics
    ] = await Promise.allSettled([
      getUserMetrics(db, startDate),
      getRecipeMetrics(db, startDate),
      getEngagementMetrics(db, startDate),
      getContentMetrics(db, startDate),
      getShoppingListMetrics(db, startDate),
      getGrowthMetrics(db, startDate, daysAgo)
    ]);

    // Extract results, handling any failures gracefully
    const analytics = {
      success: true,
      timestamp: new Date().toISOString(),
      dateRange: {
        days: daysAgo,
        startDate: startDate.toISOString(),
        endDate: now.toISOString()
      },
      users: userMetrics.status === 'fulfilled' ? userMetrics.value : { error: 'Failed to fetch user metrics' },
      recipes: recipeMetrics.status === 'fulfilled' ? recipeMetrics.value : { error: 'Failed to fetch recipe metrics' },
      engagement: engagementMetrics.status === 'fulfilled' ? engagementMetrics.value : { error: 'Failed to fetch engagement metrics' },
      content: contentMetrics.status === 'fulfilled' ? contentMetrics.value : { error: 'Failed to fetch content metrics' },
      shoppingLists: shoppingListMetrics.status === 'fulfilled' ? shoppingListMetrics.value : { error: 'Failed to fetch shopping list metrics' },
      growth: growthMetrics.status === 'fulfilled' ? growthMetrics.value : { error: 'Failed to fetch growth metrics' }
    };

    console.log(`✅ Analytics generated successfully for ${daysAgo} day period`);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Methods': 'GET,OPTIONS'
      },
      body: JSON.stringify(analytics)
    };

  } catch (error) {
    console.error('❌ User analytics generation failed:', error);
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: false,
        error: 'Analytics generation failed',
        details: error.message,
        timestamp: new Date().toISOString()
      })
    };
  }
}

/**
 * Get user-related metrics
 */
async function getUserMetrics(db, startDate) {
  try {
    const recipesCollection = db.collection('recipes');
    const favoritesCollection = db.collection('favorites');
    const commentsCollection = db.collection('comments');

    // Get total unique users (from recipes, favorites, and comments)
    const [
      recipeUsers,
      favoriteUsers,
      commentUsers,
      recentFavorites,
      recentComments
    ] = await Promise.all([
      recipesCollection.distinct('owner_id'),
      favoritesCollection.distinct('userId'),
      commentsCollection.distinct('user_id'),
      favoritesCollection.countDocuments({ createdAt: { $gte: startDate } }),
      commentsCollection.countDocuments({ created_at: { $gte: startDate } })
    ]);

    // Combine all user IDs to get total unique users
    const allUserIds = new Set([...recipeUsers, ...favoriteUsers, ...commentUsers]);
    
    return {
      totalUsers: allUserIds.size,
      activeContentCreators: recipeUsers.length,
      usersWhoFavorited: favoriteUsers.length,
      usersWhoCommented: commentUsers.length,
      recentActivity: {
        newFavorites: recentFavorites,
        newComments: recentComments
      }
    };

  } catch (error) {
    console.error('Error getting user metrics:', error);
    throw error;
  }
}

/**
 * Get recipe-related metrics
 */
async function getRecipeMetrics(db, startDate) {
  try {
    const recipesCollection = db.collection('recipes');

    const [
      totalRecipes,
      recentRecipes,
      recipesByVisibility,
      mostLikedRecipes,
      avgLikesCount
    ] = await Promise.all([
      recipesCollection.countDocuments(),
      recipesCollection.countDocuments({ created_at: { $gte: startDate } }),
      recipesCollection.aggregate([
        { $group: { _id: '$visibility', count: { $sum: 1 } } }
      ]).toArray(),
      recipesCollection.find({})
        .sort({ likes_count: -1 })
        .limit(5)
        .project({ title: 1, likes_count: 1, owner_id: 1 })
        .toArray(),
      recipesCollection.aggregate([
        { $group: { _id: null, avgLikes: { $avg: '$likes_count' } } }
      ]).toArray()
    ]);

    const avgLikes = avgLikesCount.length > 0 ? Math.round(avgLikesCount[0].avgLikes * 100) / 100 : 0;

    return {
      total: totalRecipes,
      recentlyCreated: recentRecipes,
      byVisibility: recipesByVisibility.reduce((acc, item) => {
        acc[item._id || 'undefined'] = item.count;
        return acc;
      }, {}),
      mostLiked: mostLikedRecipes,
      averageLikes: avgLikes
    };

  } catch (error) {
    console.error('Error getting recipe metrics:', error);
    throw error;
  }
}

/**
 * Get engagement metrics (favorites, comments)
 */
async function getEngagementMetrics(db, startDate) {
  try {
    const favoritesCollection = db.collection('favorites');
    const commentsCollection = db.collection('comments');

    const [
      totalFavorites,
      recentFavorites,
      totalComments,
      recentComments,
      topRecipesByFavorites,
      topRecipesByComments
    ] = await Promise.all([
      favoritesCollection.countDocuments(),
      favoritesCollection.countDocuments({ createdAt: { $gte: startDate } }),
      commentsCollection.countDocuments(),
      commentsCollection.countDocuments({ created_at: { $gte: startDate } }),
      favoritesCollection.aggregate([
        { $group: { _id: '$recipeId', favCount: { $sum: 1 } } },
        { $sort: { favCount: -1 } },
        { $limit: 5 },
        {
          $lookup: {
            from: 'recipes',
            localField: '_id',
            foreignField: '_id',
            as: 'recipe'
          }
        },
        { $unwind: '$recipe' },
        {
          $project: {
            recipeId: '$_id',
            title: '$recipe.title',
            favoriteCount: '$favCount'
          }
        }
      ]).toArray(),
      commentsCollection.aggregate([
        { $group: { _id: '$recipeId', commentCount: { $sum: 1 } } },
        { $sort: { commentCount: -1 } },
        { $limit: 5 },
        {
          $lookup: {
            from: 'recipes',
            localField: '_id',
            foreignField: '_id',
            as: 'recipe'
          }
        },
        { $unwind: '$recipe' },
        {
          $project: {
            recipeId: '$_id',
            title: '$recipe.title',
            commentCount: '$commentCount'
          }
        }
      ]).toArray()
    ]);

    return {
      favorites: {
        total: totalFavorites,
        recent: recentFavorites,
        topRecipes: topRecipesByFavorites
      },
      comments: {
        total: totalComments,
        recent: recentComments,
        topRecipes: topRecipesByComments
      }
    };

  } catch (error) {
    console.error('Error getting engagement metrics:', error);
    throw error;
  }
}

/**
 * Get content creation metrics
 */
async function getContentMetrics(db, startDate) {
  try {
    const recipesCollection = db.collection('recipes');

    const [
      recipeCreationTrend,
      topCreators,
      recipesWithImages
    ] = await Promise.all([
      recipesCollection.aggregate([
        { $match: { created_at: { $gte: startDate } } },
        {
          $group: {
            _id: {
              $dateToString: {
                format: '%Y-%m-%d',
                date: '$created_at'
              }
            },
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]).toArray(),
      recipesCollection.aggregate([
        { $group: { _id: '$owner_id', recipeCount: { $sum: 1 } } },
        { $sort: { recipeCount: -1 } },
        { $limit: 5 }
      ]).toArray(),
      recipesCollection.countDocuments({ image_url: { $exists: true, $ne: null, $ne: '' } })
    ]);

    return {
      creationTrend: recipeCreationTrend,
      topCreators: topCreators,
      withImages: recipesWithImages,
      imagePercentage: recipesWithImages > 0 ? Math.round((recipesWithImages / await recipesCollection.countDocuments()) * 100) : 0
    };

  } catch (error) {
    console.error('Error getting content metrics:', error);
    throw error;
  }
}

/**
 * Get shopping list usage metrics
 */
async function getShoppingListMetrics(db, startDate) {
  try {
    const shoppingListsCollection = db.collection('shopping_lists');

    const [
      totalShoppingLists,
      recentlyUpdated,
      averageItemCount,
      totalItems,
      checkedItems
    ] = await Promise.all([
      shoppingListsCollection.countDocuments(),
      shoppingListsCollection.countDocuments({ updated_at: { $gte: startDate } }),
      shoppingListsCollection.aggregate([
        { $project: { itemCount: { $size: { $ifNull: ['$items', []] } } } },
        { $group: { _id: null, avgItems: { $avg: '$itemCount' } } }
      ]).toArray(),
      shoppingListsCollection.aggregate([
        { $project: { itemCount: { $size: { $ifNull: ['$items', []] } } } },
        { $group: { _id: null, totalItems: { $sum: '$itemCount' } } }
      ]).toArray(),
      shoppingListsCollection.aggregate([
        { $unwind: { path: '$items', preserveNullAndEmptyArrays: true } },
        { $match: { 'items.checked': true } },
        { $count: 'checkedItems' }
      ]).toArray()
    ]);

    const avgItems = averageItemCount.length > 0 ? Math.round(averageItemCount[0].avgItems * 100) / 100 : 0;
    const totalItemsCount = totalItems.length > 0 ? totalItems[0].totalItems : 0;
    const checkedItemsCount = checkedItems.length > 0 ? checkedItems[0].checkedItems : 0;

    return {
      totalLists: totalShoppingLists,
      recentlyActive: recentlyUpdated,
      averageItemsPerList: avgItems,
      totalItems: totalItemsCount,
      checkedItems: checkedItemsCount,
      completionRate: totalItemsCount > 0 ? Math.round((checkedItemsCount / totalItemsCount) * 100) : 0
    };

  } catch (error) {
    console.error('Error getting shopping list metrics:', error);
    // Return empty metrics if shopping lists collection doesn't exist or has issues
    return {
      totalLists: 0,
      recentlyActive: 0,
      averageItemsPerList: 0,
      totalItems: 0,
      checkedItems: 0,
      completionRate: 0
    };
  }
}

/**
 * Get growth and trend metrics
 */
async function getGrowthMetrics(db, startDate, daysAgo) {
  try {
    const recipesCollection = db.collection('recipes');
    const favoritesCollection = db.collection('favorites');
    const commentsCollection = db.collection('comments');

    // Previous period for comparison
    const previousPeriodStart = new Date(startDate.getTime() - (daysAgo * 24 * 60 * 60 * 1000));
    const previousPeriodEnd = startDate;

    const [
      currentPeriodRecipes,
      previousPeriodRecipes,
      currentPeriodFavorites,
      previousPeriodFavorites,
      currentPeriodComments,
      previousPeriodComments,
      dailyActivity
    ] = await Promise.all([
      recipesCollection.countDocuments({ created_at: { $gte: startDate } }),
      recipesCollection.countDocuments({ 
        created_at: { $gte: previousPeriodStart, $lt: previousPeriodEnd } 
      }),
      favoritesCollection.countDocuments({ createdAt: { $gte: startDate } }),
      favoritesCollection.countDocuments({ 
        createdAt: { $gte: previousPeriodStart, $lt: previousPeriodEnd } 
      }),
      commentsCollection.countDocuments({ created_at: { $gte: startDate } }),
      commentsCollection.countDocuments({ 
        created_at: { $gte: previousPeriodStart, $lt: previousPeriodEnd } 
      }),
      // Daily activity trend
      recipesCollection.aggregate([
        { $match: { created_at: { $gte: startDate } } },
        {
          $group: {
            _id: {
              $dateToString: {
                format: '%Y-%m-%d',
                date: '$created_at'
              }
            },
            recipes: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]).toArray()
    ]);

    // Calculate growth rates
    const recipeGrowth = previousPeriodRecipes > 0 ? 
      Math.round(((currentPeriodRecipes - previousPeriodRecipes) / previousPeriodRecipes) * 100) : 
      (currentPeriodRecipes > 0 ? 100 : 0);

    const favoriteGrowth = previousPeriodFavorites > 0 ? 
      Math.round(((currentPeriodFavorites - previousPeriodFavorites) / previousPeriodFavorites) * 100) : 
      (currentPeriodFavorites > 0 ? 100 : 0);

    const commentGrowth = previousPeriodComments > 0 ? 
      Math.round(((currentPeriodComments - previousPeriodComments) / previousPeriodComments) * 100) : 
      (currentPeriodComments > 0 ? 100 : 0);

    return {
      recipes: {
        current: currentPeriodRecipes,
        previous: previousPeriodRecipes,
        growthRate: recipeGrowth
      },
      favorites: {
        current: currentPeriodFavorites,
        previous: previousPeriodFavorites,
        growthRate: favoriteGrowth
      },
      comments: {
        current: currentPeriodComments,
        previous: previousPeriodComments,
        growthRate: commentGrowth
      },
      dailyActivity: dailyActivity
    };

  } catch (error) {
    console.error('Error getting growth metrics:', error);
    throw error;
  }
}
