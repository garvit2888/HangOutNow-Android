import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import Colors from '@/constants/colors';
import { ArrowLeft } from 'lucide-react-native';

export const options = { headerShown: false };

export default function TermsAndConditionsScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.primary }}>
      <LinearGradient colors={[Colors.primary, Colors.darkPurple]} style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <ArrowLeft size={24} color={Colors.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Terms and Conditions</Text>
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
            Welcome to Hangout App! These Terms of Service ("Terms") govern your use of our mobile application. By using Hangout App, you agree to these Terms.
          </Text>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>1. Acceptance of Terms</Text>
            <Text style={styles.paragraph}>
              By creating an account and using Hangout App, you agree to be bound by these Terms and our Privacy Policy. If you do not agree, please do not use our service.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>2. Eligibility</Text>
            <Text style={styles.paragraph}>
              You must be at least 18 years old to use Hangout App. By using our service, you represent and warrant that you meet this age requirement.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>3. Account Registration</Text>
            <Text style={styles.paragraph}>To use Hangout App, you must:</Text>
            <View style={styles.bulletList}>
              <Text style={styles.bulletPoint}>• Provide accurate and complete information</Text>
              <Text style={styles.bulletPoint}>• Maintain the security of your account</Text>
              <Text style={styles.bulletPoint}>• Notify us of any unauthorized access</Text>
              <Text style={styles.bulletPoint}>• Be responsible for all activities under your account</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>4. User Conduct</Text>
            <Text style={styles.paragraph}>You agree to:</Text>
            <View style={styles.bulletList}>
              <Text style={styles.bulletPoint}>• Use the app for lawful purposes only</Text>
              <Text style={styles.bulletPoint}>• Respect other users and treat them with courtesy</Text>
              <Text style={styles.bulletPoint}>• Not harass, threaten, or harm other users</Text>
              <Text style={styles.bulletPoint}>• Not post inappropriate, offensive, or illegal content</Text>
              <Text style={styles.bulletPoint}>• Not impersonate others or create fake accounts</Text>
              <Text style={styles.bulletPoint}>• Not spam or send unsolicited messages</Text>
              <Text style={styles.bulletPoint}>• Not attempt to hack, disrupt, or damage the service</Text>
            </View>
          </View>

          <View style={[styles.section, styles.warningBox]}>
            <Text style={styles.warningText}>
              ⚠️ Safety Notice: Always meet in public places and inform someone you trust about your meetups. We encourage safe and responsible use of our platform.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>5. Activities and Meetups</Text>
            <Text style={styles.paragraph}>When creating or joining activities:</Text>
            <View style={styles.bulletList}>
              <Text style={styles.bulletPoint}>• You are responsible for your own safety</Text>
              <Text style={styles.bulletPoint}>• We do not verify the identity of other users</Text>
              <Text style={styles.bulletPoint}>• We are not liable for any incidents that occur during meetups</Text>
              <Text style={styles.bulletPoint}>• Use your best judgment when meeting strangers</Text>
              <Text style={styles.bulletPoint}>• Report suspicious or inappropriate behavior immediately</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>6. Content</Text>

            <Text style={styles.subsectionTitle}>Your Content</Text>
            <Text style={styles.paragraph}>You retain ownership of content you post, but you grant us a license to:</Text>
            <View style={styles.bulletList}>
              <Text style={styles.bulletPoint}>• Store and display your content</Text>
              <Text style={styles.bulletPoint}>• Share it with other users as part of the service</Text>
              <Text style={styles.bulletPoint}>• Use it to improve our services</Text>
            </View>

            <Text style={styles.subsectionTitle}>Prohibited Content</Text>
            <Text style={styles.paragraph}>You may not post content that:</Text>
            <View style={styles.bulletList}>
              <Text style={styles.bulletPoint}>• Is illegal, harmful, or offensive</Text>
              <Text style={styles.bulletPoint}>• Violates intellectual property rights</Text>
              <Text style={styles.bulletPoint}>• Contains malware or viruses</Text>
              <Text style={styles.bulletPoint}>• Promotes violence, hate, or discrimination</Text>
              <Text style={styles.bulletPoint}>• Is sexually explicit or inappropriate</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>7. Location Data</Text>
            <Text style={styles.paragraph}>By using Hangout App, you consent to:</Text>
            <View style={styles.bulletList}>
              <Text style={styles.bulletPoint}>• Collection of your location data</Text>
              <Text style={styles.bulletPoint}>• Display of your approximate location to other users</Text>
              <Text style={styles.bulletPoint}>• Use of location data to show nearby activities</Text>
            </View>
            <Text style={styles.paragraph}>
              You can disable location services, but this will limit app functionality.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>8. Intellectual Property</Text>
            <Text style={styles.paragraph}>
              Hangout App and its original content, features, and functionality are owned by us and are protected by international copyright, trademark, and other intellectual property laws.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>9. Termination</Text>
            <Text style={styles.paragraph}>We reserve the right to:</Text>
            <View style={styles.bulletList}>
              <Text style={styles.bulletPoint}>• Suspend or terminate your account for violations of these Terms</Text>
              <Text style={styles.bulletPoint}>• Remove content that violates our policies</Text>
              <Text style={styles.bulletPoint}>• Refuse service to anyone for any reason</Text>
            </View>
            <Text style={styles.paragraph}>
              You may delete your account at any time through the app settings.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>10. Disclaimers</Text>
            <Text style={styles.paragraph}>Hangout App is provided "as is" without warranties of any kind. We do not guarantee:</Text>
            <View style={styles.bulletList}>
              <Text style={styles.bulletPoint}>• Uninterrupted or error-free service</Text>
              <Text style={styles.bulletPoint}>• Accuracy of user information or content</Text>
              <Text style={styles.bulletPoint}>• Security of data transmission</Text>
              <Text style={styles.bulletPoint}>• Compatibility with all devices</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>11. Limitation of Liability</Text>
            <Text style={styles.paragraph}>To the fullest extent permitted by law:</Text>
            <View style={styles.bulletList}>
              <Text style={styles.bulletPoint}>• We are not liable for any indirect, incidental, or consequential damages</Text>
              <Text style={styles.bulletPoint}>• Our total liability is limited to the amount you paid us (if any)</Text>
              <Text style={styles.bulletPoint}>• We are not responsible for interactions between users</Text>
              <Text style={styles.bulletPoint}>• We are not liable for loss of data or content</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>12. Indemnification</Text>
            <Text style={styles.paragraph}>You agree to indemnify and hold us harmless from any claims, damages, or expenses arising from:</Text>
            <View style={styles.bulletList}>
              <Text style={styles.bulletPoint}>• Your use of the app</Text>
              <Text style={styles.bulletPoint}>• Your violation of these Terms</Text>
              <Text style={styles.bulletPoint}>• Your violation of any rights of others</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>13. Changes to Terms</Text>
            <Text style={styles.paragraph}>We may modify these Terms at any time. We will notify you of changes by:</Text>
            <View style={styles.bulletList}>
              <Text style={styles.bulletPoint}>• Posting the updated Terms on this page</Text>
              <Text style={styles.bulletPoint}>• Updating the "Last Updated" date</Text>
              <Text style={styles.bulletPoint}>• Sending an in-app notification</Text>
            </View>
            <Text style={styles.paragraph}>
              Continued use of the app after changes constitutes acceptance of the new Terms.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>14. Governing Law</Text>
            <Text style={styles.paragraph}>
              These Terms are governed by and construed in accordance with applicable laws, without regard to its conflict of law provisions.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>15. Dispute Resolution</Text>
            <Text style={styles.paragraph}>Any disputes arising from these Terms or your use of Hangout App will be resolved through:</Text>
            <View style={styles.bulletList}>
              <Text style={styles.bulletPoint}>• Good faith negotiations</Text>
              <Text style={styles.bulletPoint}>• Mediation (if negotiations fail)</Text>
              <Text style={styles.bulletPoint}>• Binding arbitration (if mediation fails)</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>16. Contact Information</Text>
            <Text style={styles.paragraph}>For questions about these Terms, please contact us:</Text>
            <Text style={styles.contactInfo}>
              <Text style={styles.bulletText}>Email:</Text> hangoutnow@gmail.com{'\n'}
              <Text style={styles.bulletText}>Support:</Text> hangoutnow@gmail.com
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>17. Severability</Text>
            <Text style={styles.paragraph}>
              If any provision of these Terms is found to be unenforceable, the remaining provisions will continue in full force and effect.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>18. Entire Agreement</Text>
            <Text style={styles.paragraph}>
              These Terms, together with our Privacy Policy, constitute the entire agreement between you and Hangout App.
            </Text>
          </View>

          <View style={[styles.section, styles.warningBox]}>
            <Text style={styles.warningText}>
              By using Hangout App, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service.
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
  warningBox: {
    backgroundColor: 'rgba(255, 193, 7, 0.15)',
    borderLeftWidth: 4,
    borderLeftColor: Colors.secondary,
    padding: 15,
    marginVertical: 10,
    borderRadius: 8,
  },
  warningText: {
    fontSize: 16,
    color: Colors.white,
    lineHeight: 24,
    fontWeight: '600',
  },
});

