import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ScrollView, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import Colors from '@/constants/colors';
import { useUserStore } from '@/store/userStore';
import { doc, updateDoc } from 'firebase/firestore';
import { auth, db } from '@/config/firebase';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Calendar } from 'lucide-react-native';

const NAME_PART_REGEX = /^[A-Za-z][A-Za-z'-]*$/;
const VOWEL_REGEX = /[AEIOUYaeiouy]/;

type NameValidationResult =
  | { valid: true; value: string }
  | { valid: false; error: string };

const normalizeWhitespace = (value: string) => value.replace(/\s+/g, ' ').trim();

const toTitleCase = (value: string) =>
  value
    .split(' ')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');

const validateFullNameInput = (rawValue: string): NameValidationResult => {
  const normalized = normalizeWhitespace(rawValue);

  if (!normalized) {
    return { valid: false, error: 'Please enter your full name' };
  }

  const parts = normalized.split(' ');

  if (parts.length < 2) {
    return { valid: false, error: 'Please enter at least your first and last name' };
  }

  for (const part of parts) {
    if (part.length < 2) {
      return { valid: false, error: 'Each name must be at least 2 characters long' };
    }

    if (!NAME_PART_REGEX.test(part)) {
      return {
        valid: false,
        error: 'Names can only include letters, hyphens, and apostrophes, and must start with a letter',
      };
    }

    if (!VOWEL_REGEX.test(part)) {
      return { valid: false, error: 'Each part of your name must include a vowel' };
    }
  }

  return { valid: true, value: toTitleCase(normalized) };
};

export default function OnboardingScreen() {
  const router = useRouter();
  const { setProfile, loginEmail } = useUserStore();
  const [formData, setFormData] = useState({
    fullName: '',
    gender: '',
    dateOfBirth: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date(2000, 0, 1)); // Default to Jan 1, 2000

  const handleInputChange = (field: string, value: string) => {
    if (field === 'fullName') {
      value = value.replace(/[^A-Za-z\s'-]/g, '');
    }
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const formatDate = (date: Date): string => {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const handleDateChange = (event: any, date?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    
    if (date) {
      setSelectedDate(date);
      const formattedDate = formatDate(date);
      handleInputChange('dateOfBirth', formattedDate);
      
      // On Android, the picker closes automatically
      if (Platform.OS === 'ios') {
        // Keep picker open on iOS for better UX
      }
    }
  };

  const handleDatePickerPress = () => {
    // If user has already selected a date, parse it to initialize the picker
    if (formData.dateOfBirth) {
      const dateParts = formData.dateOfBirth.split('/');
      if (dateParts.length === 3) {
        const day = parseInt(dateParts[0], 10);
        const month = parseInt(dateParts[1], 10) - 1; // Month is 0-indexed
        const year = parseInt(dateParts[2], 10);
        setSelectedDate(new Date(year, month, day));
      }
    }
    setShowDatePicker(true);
  };

  const validateForm = (): { fullName: string } | null => {
    const nameValidation = validateFullNameInput(formData.fullName);
    if (!nameValidation.valid) {
      Alert.alert('Invalid Name', nameValidation.error);
      return null;
    }
    if (!formData.gender) {
      Alert.alert('Error', 'Please select your gender');
      return null;
    }
    if (!formData.dateOfBirth.trim()) {
      Alert.alert('Error', 'Please enter your date of birth');
      return null;
    }
    return { fullName: nameValidation.value };
  };

  const handleContinue = async () => {
    const validationResult = validateForm();
    if (!validationResult) return;

    const sanitizedFullName = validationResult.fullName;

    setIsLoading(true);

    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('No authenticated user found');
      }

      // Save profile data to Firestore
      const email = loginEmail || currentUser.email || 'user@example.com';
      const newProfile = {
        fullName: sanitizedFullName,
        email,
        gender: formData.gender,
        dateOfBirth: formData.dateOfBirth,
        isEmailVerified: false,
        isPhotoVerified: false,
        hasCompletedOnboarding: false, // Will be set to true at the end of onboarding
      };

      await updateDoc(doc(db, 'users', currentUser.uid), {
        ...newProfile,
        updatedAt: new Date().toISOString(),
      });

      // Update local store
      console.log('✅ ONBOARDING: Saved profile to Firestore:', newProfile);
      setProfile(newProfile);
      setFormData(prev => ({ ...prev, fullName: sanitizedFullName }));
      
      router.push('/email-verification');
    } catch (error) {
      console.error('Onboarding error:', error);
      Alert.alert('Error', 'Failed to save profile. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <LinearGradient
      colors={[Colors.primary, Colors.darkPurple]}
      style={styles.container}
    >
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Complete Your Profile</Text>
          <Text style={styles.subtitle}>Tell us a bit about yourself</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Full Name</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your full name"
              placeholderTextColor={Colors.gray}
              value={formData.fullName}
              onChangeText={(value) => handleInputChange('fullName', value)}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Date of Birth</Text>
            <TouchableOpacity
              style={styles.dateInputContainer}
              onPress={handleDatePickerPress}
              activeOpacity={0.7}
            >
              <View style={styles.dateInput}>
                <Calendar size={20} color={formData.dateOfBirth ? Colors.white : Colors.gray} />
                <Text style={[styles.dateInputText, !formData.dateOfBirth && styles.dateInputPlaceholder]}>
                  {formData.dateOfBirth || 'Select your date of birth'}
                </Text>
              </View>
            </TouchableOpacity>
            
            {showDatePicker && (
              <DateTimePicker
                value={selectedDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={handleDateChange}
                maximumDate={new Date()} // Can't select future dates
                minimumDate={new Date(1900, 0, 1)} // Reasonable minimum date
                style={Platform.OS === 'android' ? {} : styles.datePickerIOS}
              />
            )}
            
            {Platform.OS === 'ios' && showDatePicker && (
              <View style={styles.iosPickerButtons}>
                <TouchableOpacity
                  style={styles.iosPickerButton}
                  onPress={() => setShowDatePicker(false)}
                >
                  <Text style={styles.iosPickerButtonText}>Done</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Gender</Text>
            <View style={styles.genderContainer}>
              {['Male', 'Female', 'Non-binary', 'Prefer not to say'].map((option) => (
                <TouchableOpacity
                  key={option}
                  style={[
                    styles.genderOption,
                    formData.gender === option && styles.genderOptionSelected,
                  ]}
                  onPress={() => handleInputChange('gender', option)}
                >
                  <Text
                    style={[
                      styles.genderText,
                      formData.gender === option && styles.genderTextSelected,
                    ]}
                  >
                    {option}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.continueButton, isLoading && styles.continueButtonDisabled]}
          onPress={handleContinue}
          disabled={isLoading}
        >
          <Text style={styles.continueButtonText}>
            {isLoading ? 'Creating Account...' : 'Continue'}
          </Text>
        </TouchableOpacity>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.white,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.secondary,
    textAlign: 'center',
  },
  form: {
    flex: 1,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.white,
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: Colors.white,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  dateInputContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    overflow: 'hidden',
  },
  dateInput: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  dateInputText: {
    fontSize: 16,
    color: Colors.white,
    flex: 1,
  },
  dateInputPlaceholder: {
    color: Colors.gray,
  },
  datePickerIOS: {
    height: 200,
    marginTop: 10,
  },
  iosPickerButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 10,
  },
  iosPickerButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: Colors.secondary,
    borderRadius: 8,
  },
  iosPickerButtonText: {
    color: Colors.black,
    fontSize: 16,
    fontWeight: '600',
  },
  genderContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  genderOption: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  genderOptionSelected: {
    backgroundColor: Colors.secondary,
    borderColor: Colors.secondary,
  },
  genderText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: '500',
  },
  genderTextSelected: {
    color: Colors.black,
  },
  continueButton: {
    backgroundColor: Colors.secondary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  continueButtonDisabled: {
    backgroundColor: Colors.gray,
  },
  continueButtonText: {
    color: Colors.black,
    fontSize: 18,
    fontWeight: 'bold',
  },
});
