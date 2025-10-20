import React, { useState, useEffect } from 'react';
import { useAdminAuth } from '../contexts/AdminContext';
import { adminApi } from '../utils/adminApi';

interface AnalyticsData {
  success: boolean;
  timestamp: string;
  dateRange: {
    days: number;
    startDate: string;
    endDate: string;
  };
  users: {
    totalUsers: number;
    activeContentCreators: number;
    usersWhoFavorited: number;
    usersWhoCommented: number;
    recentActivity: {
      newFavorites: number;
      newComments: number;
    };
  };
  recipes: {
    total: number;
    recentlyCreated: number;
    byVisibility: Record<string, number>;
    mostLiked: Array<{
      _id: string;
      title: string;
      likes_count: number;
      owner_id: string;
    }>;
    averageLikes: number;
  };
  engagement: {
    favorites: {
      total: number;
      recent: number;
      topRecipes: Array<{
        recipeId: string;
        title: string;
        favoriteCount: number;
      }>;
    };
    comments: {
      total: number;
      recent: number;
      topRecipes: Array<{
        recipeId: string;
        title: string;
        commentCount: number;
      }>;
    };
  };
  content: {
    creationTrend: Array<{
      _id: string;
      count: number;
    }>;
    topCreators: Array<{
      _id: string;
      recipeCount: number;
    }>;
    withImages: number;
    imagePercentage: number;
  };
  shoppingLists: {
    totalLists: number;
    recentlyActive: number;
    averageItemsPerList: number;
    totalItems: number;
    checkedItems: number;
    completionRate: number;
  };
  growth: {
    recipes: {
      current: number;
      previous: number;
      growthRate: number;
    };
    favorites: {
      current: number;
      previous: number;
      growthRate: number;
    };
    comments: {
      current: number;
      previous: number;
      growthRate: number;
    };
    dailyActivity: Array<{
      _id: string;
      recipes: number;
    }>;
  };
}

const AnalyticsPage: React.FC = () => {
  const { token, isAuthenticated, isAdmin } = useAdminAuth();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState('30');

  const fetchAnalytics = async (range: string = '30') => {
    try {
      setLoading(true);
      setError(null);

      const data = await adminApi.getUserAnalytics(token, range);
      setAnalytics(data);
    } catch (err) {
      console.error('Error fetching analytics:', err);
      setError(err instanceof Error ? err.message : 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && isAdmin) {
      fetchAnalytics(dateRange);
    }
  }, [isAuthenticated, isAdmin, dateRange]);

  const handleDateRangeChange = (newRange: string) => {
    setDateRange(newRange);
    fetchAnalytics(newRange);
  };

  if (!isAuthenticated || !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600">You don't have permission to view analytics.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-900 mb-4">Error Loading Analytics</h1>
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => fetchAnalytics(dateRange)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-600">No analytics data available.</p>
      </div>
    );
  }

  const formatGrowthRate = (rate: number) => {
    const sign = rate > 0 ? '+' : '';
    const color = rate > 0 ? 'text-green-600' : rate < 0 ? 'text-red-600' : 'text-gray-600';
    return <span className={color}>{sign}{rate}%</span>;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">📊 Analytics Dashboard</h1>
              <p className="text-gray-600 mt-2">Platform insights and user engagement metrics</p>
            </div>
            <div className="flex items-center space-x-4">
              <label className="text-sm font-medium text-gray-700">Time Range:</label>
              <select
                value={dateRange}
                onChange={(e) => handleDateRangeChange(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="7">Last 7 days</option>
                <option value="30">Last 30 days</option>
                <option value="90">Last 90 days</option>
                <option value="365">Last year</option>
              </select>
              <button
                onClick={() => fetchAnalytics(dateRange)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh
              </button>
            </div>
          </div>
          <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-800">
              📅 Data from {new Date(analytics.dateRange.startDate).toLocaleDateString()} to {new Date(analytics.dateRange.endDate).toLocaleDateString()} 
              ({analytics.dateRange.days} days)
            </p>
            <p className="text-xs text-blue-600 mt-1">Last updated: {new Date(analytics.timestamp).toLocaleString()}</p>
          </div>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Users */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Users</p>
                <p className="text-3xl font-bold text-gray-900">{analytics.users.totalUsers.toLocaleString()}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-2xl">👥</span>
              </div>
            </div>
            <div className="mt-4 flex text-sm">
              <span className="text-gray-600">Active creators: {analytics.users.activeContentCreators}</span>
            </div>
          </div>

          {/* Total Recipes */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Recipes</p>
                <p className="text-3xl font-bold text-gray-900">{analytics.recipes.total.toLocaleString()}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <span className="text-2xl">📝</span>
              </div>
            </div>
            <div className="mt-4 flex text-sm">
              <span className="text-gray-600">Recent: +{analytics.recipes.recentlyCreated}</span>
              <span className="ml-auto text-gray-600">{formatGrowthRate(analytics.growth.recipes.growthRate)}</span>
            </div>
          </div>

          {/* Total Engagement */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Favorites</p>
                <p className="text-3xl font-bold text-gray-900">{analytics.engagement.favorites.total.toLocaleString()}</p>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <span className="text-2xl">❤️</span>
              </div>
            </div>
            <div className="mt-4 flex text-sm">
              <span className="text-gray-600">Recent: +{analytics.engagement.favorites.recent}</span>
              <span className="ml-auto text-gray-600">{formatGrowthRate(analytics.growth.favorites.growthRate)}</span>
            </div>
          </div>

          {/* Shopping Lists */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Shopping Lists</p>
                <p className="text-3xl font-bold text-gray-900">{analytics.shoppingLists.totalLists.toLocaleString()}</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                <span className="text-2xl">🛒</span>
              </div>
            </div>
            <div className="mt-4 flex text-sm">
              <span className="text-gray-600">{analytics.shoppingLists.completionRate}% completion</span>
            </div>
          </div>
        </div>

        {/* Detailed Analytics Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Recipe Analytics */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
              <span className="mr-2">📊</span>
              Recipe Analytics
            </h3>
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold text-gray-700 mb-2">By Visibility</h4>
                <div className="space-y-2">
                  {Object.entries(analytics.recipes.byVisibility).map(([visibility, count]) => (
                    <div key={visibility} className="flex justify-between items-center">
                      <span className="text-gray-600 capitalize">{visibility}</span>
                      <span className="font-medium">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="font-semibold text-gray-700 mb-2">Content Quality</h4>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Recipes with images</span>
                    <span className="font-medium">{analytics.content.withImages} ({analytics.content.imagePercentage}%)</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Average likes per recipe</span>
                    <span className="font-medium">{analytics.recipes.averageLikes}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* User Engagement */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
              <span className="mr-2">💬</span>
              User Engagement
            </h3>
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold text-gray-700 mb-2">Activity Breakdown</h4>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Users who favorited</span>
                    <span className="font-medium">{analytics.users.usersWhoFavorited}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Users who commented</span>
                    <span className="font-medium">{analytics.users.usersWhoCommented}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Total comments</span>
                    <span className="font-medium">{analytics.engagement.comments.total}</span>
                  </div>
                </div>
              </div>
              <div>
                <h4 className="font-semibold text-gray-700 mb-2">Recent Activity</h4>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">New favorites</span>
                    <span className="font-medium text-green-600">+{analytics.users.recentActivity.newFavorites}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">New comments</span>
                    <span className="font-medium text-green-600">+{analytics.users.recentActivity.newComments}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Top Recipes Lists */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Most Liked Recipes */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
              <span className="mr-2">⭐</span>
              Most Liked Recipes
            </h3>
            <div className="space-y-3">
              {analytics.recipes.mostLiked.slice(0, 5).map((recipe, index) => (
                <div key={recipe._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center min-w-0 flex-1">
                    <span className="text-sm font-medium text-gray-500 mr-3">#{index + 1}</span>
                    <span className="text-sm font-medium text-gray-900 truncate">{recipe.title}</span>
                  </div>
                  <div className="flex items-center text-red-500 ml-2">
                    <span className="text-sm font-medium">{recipe.likes_count}</span>
                    <span className="ml-1">❤️</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Most Commented Recipes */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
              <span className="mr-2">💬</span>
              Most Discussed Recipes
            </h3>
            <div className="space-y-3">
              {analytics.engagement.comments.topRecipes.slice(0, 5).map((recipe, index) => (
                <div key={recipe.recipeId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center min-w-0 flex-1">
                    <span className="text-sm font-medium text-gray-500 mr-3">#{index + 1}</span>
                    <span className="text-sm font-medium text-gray-900 truncate">{recipe.title}</span>
                  </div>
                  <div className="flex items-center text-blue-500 ml-2">
                    <span className="text-sm font-medium">{recipe.commentCount}</span>
                    <span className="ml-1">💬</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Growth Metrics */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
            <span className="mr-2">📈</span>
            Growth Metrics (vs Previous {analytics.dateRange.days} days)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-900">{analytics.growth.recipes.current}</div>
              <div className="text-sm text-gray-600">New Recipes</div>
              <div className="text-lg font-medium">{formatGrowthRate(analytics.growth.recipes.growthRate)}</div>
              <div className="text-xs text-gray-500">vs {analytics.growth.recipes.previous} previous</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-900">{analytics.growth.favorites.current}</div>
              <div className="text-sm text-gray-600">New Favorites</div>
              <div className="text-lg font-medium">{formatGrowthRate(analytics.growth.favorites.growthRate)}</div>
              <div className="text-xs text-gray-500">vs {analytics.growth.favorites.previous} previous</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-900">{analytics.growth.comments.current}</div>
              <div className="text-sm text-gray-600">New Comments</div>
              <div className="text-lg font-medium">{formatGrowthRate(analytics.growth.comments.growthRate)}</div>
              <div className="text-xs text-gray-500">vs {analytics.growth.comments.previous} previous</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsPage;