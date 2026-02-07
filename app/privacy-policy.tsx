import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import Colors from '@/constants/colors';
import { ArrowLeft } from 'lucide-react-native';

export const options = { headerShown: false };

export default function PrivacyPolicyScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.primary }}>
      <LinearGradient colors={[Colors.primary, Colors.darkPurple]} style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <ArrowLeft size={24} color={Colors.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Privacy Policy</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Content */}
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.lastUpdated}>Last Updated: October 22, 2025</Text>

          <Text style={styles.intro}>
            Hangout App ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, and safeguard your information when you use our mobile application.
          </Text>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>1. Information We Collect</Text>

            <Text style={styles.subsectionTitle}>Personal Information</Text>
            <View style={styles.bulletList}>
              <Text style={styles.bulletPoint}>• <Text style={styles.bulletText}>Account Information:</Text> Name, email address, date of birth, gender</Text>
              <Text style={styles.bulletPoint}>• <Text style={styles.bulletText}>Profile Information:</Text> Profile picture, Instagram username (optional)</Text>
              <Text style={styles.bulletPoint}>• <Text style={styles.bulletText}>Location Data:</Text> Your current location to show nearby activities</Text>
            </View>

            <Text style={styles.subsectionTitle}>Activity Information</Text>
            <View style={styles.bulletList}>
              <Text style={styles.bulletPoint}>• Activities you create or join</Text>
              <Text style={styles.bulletPoint}>• Messages sent in group chats</Text>
              <Text style={styles.bulletPoint}>• Images shared in conversations</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>2. How We Use Your Information</Text>
            <Text style={styles.paragraph}>We use your information to:</Text>
            <View style={styles.bulletList}>
              <Text style={styles.bulletPoint}>• Provide and improve our services</Text>
              <Text style={styles.bulletPoint}>• Show you nearby activities based on your location</Text>
              <Text style={styles.bulletPoint}>• Enable communication with other users in activities</Text>
              <Text style={styles.bulletPoint}>• Send notifications about activities and messages</Text>
              <Text style={styles.bulletPoint}>• Ensure the safety and security of our platform</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>3. Information Sharing</Text>
            <Text style={styles.paragraph}>We share your information only in these circumstances:</Text>
            <View style={styles.bulletList}>
              <Text style={styles.bulletPoint}>• <Text style={styles.bulletText}>With Other Users:</Text> Your profile information is visible to users in activities you join</Text>
              <Text style={styles.bulletPoint}>• <Text style={styles.bulletText}>Service Providers:</Text> We use Firebase (Google) for authentication, database, and storage</Text>
              <Text style={styles.bulletPoint}>• <Text style={styles.bulletText}>Legal Requirements:</Text> When required by law or to protect rights and safety</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>4. Data Security</Text>
            <Text style={styles.paragraph}>We implement industry-standard security measures to protect your data:</Text>
            <View style={styles.bulletList}>
              <Text style={styles.bulletPoint}>• Encrypted data transmission (HTTPS/TLS)</Text>
              <Text style={styles.bulletPoint}>• Secure authentication through Firebase</Text>
              <Text style={styles.bulletPoint}>• Regular security audits</Text>
              <Text style={styles.bulletPoint}>• Access controls and data isolation</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>5. Your Rights</Text>
            <Text style={styles.paragraph}>You have the right to:</Text>
            <View style={styles.bulletList}>
              <Text style={styles.bulletPoint}>• Access your personal data</Text>
              <Text style={styles.bulletPoint}>• Correct inaccurate information</Text>
              <Text style={styles.bulletPoint}>• Delete your account and data</Text>
              <Text style={styles.bulletPoint}>• Opt-out of location tracking (this may limit app functionality)</Text>
              <Text style={styles.bulletPoint}>• Export your data</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>6. Location Data</Text>
            <Text style={styles.paragraph}>We collect and use your location data to:</Text>
            <View style={styles.bulletList}>
              <Text style={styles.bulletPoint}>• Show activities near you</Text>
              <Text style={styles.bulletPoint}>• Allow you to create location-based activities</Text>
              <Text style={styles.bulletPoint}>• Calculate distances to activities</Text>
            </View>
            <Text style={styles.paragraph}>
              You can disable location services in your device settings, but this will limit core app functionality.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>7. Data Retention</Text>
            <View style={styles.bulletList}>
              <Text style={styles.bulletPoint}>• Account data: Until you delete your account</Text>
              <Text style={styles.bulletPoint}>• Activity data: Activities expire after their scheduled time</Text>
              <Text style={styles.bulletPoint}>• Messages: Retained while the activity is active</Text>
              <Text style={styles.bulletPoint}>• Images: Stored until manually deleted</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>8. Children's Privacy</Text>
            <Text style={styles.paragraph}>
              Our app is intended for users aged 18 and above. We do not knowingly collect information from children under 18.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>9. Third-Party Services</Text>
            <Text style={styles.paragraph}>We use the following third-party services:</Text>
            <View style={styles.bulletList}>
              <Text style={styles.bulletPoint}>• <Text style={styles.bulletText}>Firebase (Google):</Text> Authentication, Database, Storage</Text>
              <Text style={styles.bulletPoint}>• <Text style={styles.bulletText}>Google Maps:</Text> Location services and mapping</Text>
            </View>
            <Text style={styles.paragraph}>
              These services have their own privacy policies governing their use of information.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>10. Changes to This Policy</Text>
            <Text style={styles.paragraph}>We may update this Privacy Policy from time to time. We will notify you of any changes by:</Text>
            <View style={styles.bulletList}>
              <Text style={styles.bulletPoint}>• Posting the new Privacy Policy on this page</Text>
              <Text style={styles.bulletPoint}>• Updating the "Last Updated" date</Text>
              <Text style={styles.bulletPoint}>• Sending you a notification through the app</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>11. Contact Us</Text>
            <Text style={styles.paragraph}>If you have questions about this Privacy Policy, please contact us at:</Text>
            <Text style={styles.contactInfo}>
              <Text style={styles.bulletText}>Email:</Text> hangoutnow@gmail.com{'\n'}
              <Text style={styles.bulletText}>Address:</Text> [Your Address]
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>12. Consent</Text>
            <Text style={styles.paragraph}>
              By using Hangout App, you consent to our Privacy Policy and agree to its terms.
            </Text>
          </View>
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.white,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  lastUpdated: {
    fontSize: 14,
    color: Colors.secondary,
    marginBottom: 20,
    fontWeight: '600',
  },
  intro: {
    fontSize: 16,
    color: Colors.white,
    lineHeight: 24,
    marginBottom: 30,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.white,
    marginBottom: 12,
  },
  subsectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.secondary,
    marginTop: 12,
    marginBottom: 8,
  },
  paragraph: {
    fontSize: 16,
    color: Colors.white,
    lineHeight: 24,
    marginBottom: 12,
    opacity: 0.9,
  },
  bulletList: {
    marginLeft: 8,
    marginBottom: 12,
  },
  bulletPoint: {
    fontSize: 16,
    color: Colors.white,
    lineHeight: 24,
    marginBottom: 8,
    opacity: 0.9,
  },
  bulletText: {
    fontWeight: '600',
  },
  contactInfo: {
    fontSize: 16,
    color: Colors.white,
    lineHeight: 24,
    marginTop: 8,
    opacity: 0.9,
  },
});

