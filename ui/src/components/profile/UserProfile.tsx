import React, { useState, useEffect, useCallback } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { apiClient } from '../../lib/api-client';
import { showToast, ToastType } from '../Toast';

interface UserProfile {
  id?: string;
  auth0_id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  profile_image: string;
  profile_complete: boolean;
  preferences: {
    visibility_default: 'private' | 'family' | 'public';
    email_notifications: boolean;
    recipe_sharing: boolean;
    two_factor_enabled: boolean;
  };
}

interface UserProfileProps {
  isNewUser?: boolean;
  onProfileComplete?: () => void;
  onCancel?: () => void;
}

export const UserProfileEditor: React.FC<UserProfileProps> = ({ 
  isNewUser = false, 
  onProfileComplete,
  onCancel 
}) => {
  const { user, getAccessTokenSilently } = useAuth0();
  const [profile, setProfile] = useState<UserProfile>({
    auth0_id: user?.sub || '',
    email: user?.email || '',
    first_name: '',
    last_name: '',
    phone: '',
    profile_image: '',
    profile_complete: false,
    preferences: {
      visibility_default: 'family',
      email_notifications: true,
      recipe_sharing: true,
      two_factor_enabled: false
    }
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const loadProfile = useCallback(async () => {
    try {
      setLoading(true);
      const token = await getAccessTokenSilently();
      const response = await apiClient.get('/user/profile', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data?.user) {
        setProfile(prevProfile => ({
          ...prevProfile,
          ...response.data.user
        }));
      }
    } catch (error) {
      console.error('Failed to load profile:', error);
      if (!isNewUser) {
        showToast('Failed to load profile data', ToastType.Error);
      }
    } finally {
      setLoading(false);
    }
  }, [getAccessTokenSilently, isNewUser]);

  // Load existing profile data
  useEffect(() => {
    if (!isNewUser) {
      loadProfile();
    }
  }, [isNewUser, loadProfile]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Email validation
    if (profile.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    // Phone validation (optional, but if provided must be valid)
    if (profile.phone && !/^[+]?[1-9][\d\s\-()]{7,15}$/.test(profile.phone)) {
      newErrors.phone = 'Please enter a valid phone number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      showToast('Please fix the errors below', ToastType.Error);
      return;
    }

    try {
      setSaving(true);
      const token = await getAccessTokenSilently();
      
      const response = await apiClient.post('/user/profile', profile, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.success) {
        showToast('Profile saved successfully!', ToastType.Success);
        if (onProfileComplete) {
          onProfileComplete();
        }
      } else {
        throw new Error('Failed to save profile');
      }
    } catch (error) {
      console.error('Failed to save profile:', error);
      showToast('Failed to save profile', ToastType.Error);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (isNewUser) {
      // For new users, we still create a minimal profile so they're not stuck in setup
      const minimalProfile = {
        ...profile,
        profile_complete: true
      };
      setProfile(minimalProfile);
      handleSave(); // Save minimal profile
    } else if (onCancel) {
      onCancel();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto bg-white shadow-lg rounded-lg overflow-hidden">
      <div className="px-6 py-4 bg-gray-50 border-b">
        <h2 className="text-2xl font-bold text-gray-900">
          {isNewUser ? 'Welcome! Set Up Your Profile' : 'Edit Profile'}
        </h2>
        {isNewUser && (
          <p className="mt-2 text-sm text-gray-600">
            Welcome to Mom's Recipe Box! Please set up your profile to get started. 
            All fields are optional, but a phone number is needed for two-factor authentication.
          </p>
        )}
      </div>

      <div className="px-6 py-6 space-y-6">
        {/* Profile Image */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Profile Image URL (optional)
          </label>
          <input
            type="url"
            value={profile.profile_image}
            onChange={(e) => setProfile(prev => ({ ...prev, profile_image: e.target.value }))}
            placeholder="https://example.com/your-photo.jpg"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {profile.profile_image && (
            <div className="mt-2">
              <img
                src={profile.profile_image}
                alt="Profile preview"
                className="h-16 w-16 rounded-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            </div>
          )}
        </div>

        {/* Name Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              First Name (optional)
            </label>
            <input
              type="text"
              value={profile.first_name}
              onChange={(e) => setProfile(prev => ({ ...prev, first_name: e.target.value }))}
              placeholder="First name"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Last Name (optional)
            </label>
            <input
              type="text"
              value={profile.last_name}
              onChange={(e) => setProfile(prev => ({ ...prev, last_name: e.target.value }))}
              placeholder="Last name"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Email */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Email Address
          </label>
          <input
            type="email"
            value={profile.email}
            onChange={(e) => setProfile(prev => ({ ...prev, email: e.target.value }))}
            placeholder="your@email.com"
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.email ? 'border-red-300' : 'border-gray-300'
            }`}
          />
          {errors.email && (
            <p className="mt-1 text-sm text-red-600">{errors.email}</p>
          )}
        </div>

        {/* Phone */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Phone Number (optional, needed for 2FA)
          </label>
          <input
            type="tel"
            value={profile.phone}
            onChange={(e) => setProfile(prev => ({ ...prev, phone: e.target.value }))}
            placeholder="+1 (555) 123-4567"
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.phone ? 'border-red-300' : 'border-gray-300'
            }`}
          />
          {errors.phone && (
            <p className="mt-1 text-sm text-red-600">{errors.phone}</p>
          )}
          {profile.phone && (
            <p className="mt-1 text-xs text-green-600">
              📱 Two-factor authentication will be available with this phone number
            </p>
          )}
        </div>

        {/* Preferences */}
        <div className="border-t pt-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Preferences</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Default Recipe Visibility
              </label>
              <select
                value={profile.preferences.visibility_default}
                onChange={(e) => setProfile(prev => ({
                  ...prev,
                  preferences: {
                    ...prev.preferences,
                    visibility_default: e.target.value as 'private' | 'family' | 'public'
                  }
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="private">Private (only you can see)</option>
                <option value="family">Family (family members can see)</option>
                <option value="public">Public (anyone can see)</option>
              </select>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="email_notifications"
                checked={profile.preferences.email_notifications}
                onChange={(e) => setProfile(prev => ({
                  ...prev,
                  preferences: {
                    ...prev.preferences,
                    email_notifications: e.target.checked
                  }
                }))}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="email_notifications" className="ml-2 text-sm text-gray-700">
                Receive email notifications for recipe comments and updates
              </label>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="recipe_sharing"
                checked={profile.preferences.recipe_sharing}
                onChange={(e) => setProfile(prev => ({
                  ...prev,
                  preferences: {
                    ...prev.preferences,
                    recipe_sharing: e.target.checked
                  }
                }))}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="recipe_sharing" className="ml-2 text-sm text-gray-700">
                Allow other family members to see and share your recipes
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="px-6 py-4 bg-gray-50 border-t flex justify-end space-x-3">
        {!isNewUser && (
          <button
            type="button"
            onClick={handleCancel}
            disabled={saving}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          >
            Cancel
          </button>
        )}
        
        {isNewUser && (
          <button
            type="button"
            onClick={handleCancel}
            disabled={saving}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          >
            Skip for Now
          </button>
        )}

        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
        >
          {saving ? (
            <>
              <span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></span>
              Saving...
            </>
          ) : isNewUser ? 'Complete Setup' : 'Save Profile'}
        </button>
      </div>
    </div>
  );
};