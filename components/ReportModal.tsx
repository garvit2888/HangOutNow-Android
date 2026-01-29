import React, { useState } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, Alert, TextInput, ScrollView } from 'react-native';
import Colors from '@/constants/colors';
import { X, Check } from 'lucide-react-native';
import { submitReport } from '@/services/reportService';
import { Image as ExpoImage } from 'expo-image';

interface Member {
  id: string;
  name: string;
  avatar?: string;
  email?: string;
}

interface ReportModalProps {
  visible: boolean;
  onClose: () => void;
  reportType: 'group' | 'member';
  reportedItemId: string;
  reporterUserId: string;
  members?: Member[]; // Members list for group reports
  activityName?: string; // Activity name for context
  onLeaveActivity?: () => void; // Optional callback to leave the activity after reporting
}

const REPORT_REASONS = [
  'Inappropriate Content',
  'Harassment',
  'Spam',
  'Offensive Language',
  'Violence or Threats',
  'Scam or Fraud',
  'Other',
];

export default function ReportModal({ 
  visible, 
  onClose, 
  reportType, 
  reportedItemId,
  reporterUserId,
  members = [],
  activityName,
  onLeaveActivity
}: ReportModalProps) {
  const [selectedReason, setSelectedReason] = useState<string>('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);

  const toggleMemberSelection = (memberId: string) => {
    setSelectedMemberIds(prev => 
      prev.includes(memberId) 
        ? prev.filter(id => id !== memberId)
        : [...prev, memberId]
    );
  };

  const handleSubmit = async () => {
    if (!selectedReason) {
      Alert.alert('Error', 'Please select a reason for reporting.');
      return;
    }

    if (!description.trim()) {
      Alert.alert('Error', 'Please provide additional details about your report.');
      return;
    }

    if (description.trim().length < 10) {
      Alert.alert('Error', 'Please provide at least 10 characters of details.');
      return;
    }

    setIsSubmitting(true);

    try {
      await submitReport({
        reportedBy: reporterUserId,
        reportType,
        reportedItemId,
        reportedMemberIds: reportType === 'group' && selectedMemberIds.length > 0 ? selectedMemberIds : undefined,
        reportReason: selectedReason,
        description: description.trim(),
      });

      // Clear form
      setSelectedReason('');
      setDescription('');
      setSelectedMemberIds([]);

      // Debug logging
      console.log('📝 Report submitted. reportType:', reportType, 'onLeaveActivity:', !!onLeaveActivity, 'selectedMemberIds:', selectedMemberIds.length);

      // Show success alert and prompt to leave if reporting an activity/group
      // Show prompt even when members are selected, as it's still a group report
      if (reportType === 'group' && onLeaveActivity) {
        console.log('✅ Showing leave activity prompt');
        // Use setTimeout to ensure Alert shows after state updates
        setTimeout(() => {
          Alert.alert(
            'Report Submitted',
            'Thank you for your report. We will review it shortly and take appropriate action.',
            [
              { 
                text: 'Stay in Activity', 
                style: 'cancel',
                onPress: () => {
                  console.log('👤 User chose to stay in activity');
                  handleClose();
                }
              },
              { 
                text: 'Leave Activity', 
                style: 'destructive',
                onPress: () => {
                  console.log('👋 User chose to leave activity');
                  handleClose();
                  // Add small delay before leaving to ensure modal closes first
                  setTimeout(() => {
                    onLeaveActivity();
                  }, 100);
                }
              }
            ],
            { cancelable: false }
          );
        }, 100);
      } else {
        console.log('ℹ️ Not showing leave prompt - reportType:', reportType, 'has onLeaveActivity:', !!onLeaveActivity);
        Alert.alert(
          'Report Submitted',
          'Thank you for your report. We will review it shortly and take appropriate action.',
          [{ text: 'OK', onPress: handleClose }]
        );
      }
    } catch (error) {
      console.error('Error submitting report:', error);
      Alert.alert('Error', 'Failed to submit report. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setSelectedReason('');
    setDescription('');
    setSelectedMemberIds([]);
    onClose();
  };

  // Filter out the current user from members list when reporting
  const availableMembers = members.filter(m => m.id !== reporterUserId && m.email !== reporterUserId);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <Text style={styles.title}>
              Report {reportType === 'group' ? 'Activity' : 'Member'}
            </Text>
            <TouchableOpacity onPress={handleClose}>
              <X size={24} color={Colors.primary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={styles.content}>
            {/* Member Selection - Only shown when reporting a group/activity */}
            {reportType === 'group' && availableMembers.length > 0 && (
              <>
                <Text style={styles.label}>
                  Select Member(s) to Report (Optional)
                </Text>
                <Text style={styles.hint}>
                  You can select specific members involved, or leave empty to report the activity itself.
                </Text>
                <View style={styles.membersContainer}>
                  {availableMembers.map((member) => {
                    const isSelected = selectedMemberIds.includes(member.id);
                    return (
                      <TouchableOpacity
                        key={member.id}
                        style={[
                          styles.memberCard,
                          isSelected && styles.memberCardSelected
                        ]}
                        onPress={() => toggleMemberSelection(member.id)}
                      >
                        <ExpoImage
                          source={{ uri: member.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.name)}` }}
                          style={styles.memberAvatar}
                          contentFit="cover"
                        />
                        <Text style={styles.memberName} numberOfLines={1}>
                          {member.name || 'Unknown'}
                        </Text>
                        {isSelected && (
                          <View style={styles.checkIcon}>
                            <Check size={16} color={Colors.white} />
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
                {selectedMemberIds.length > 0 && (
                  <Text style={styles.selectedCount}>
                    {selectedMemberIds.length} member(s) selected
                  </Text>
                )}
              </>
            )}

            <Text style={styles.label}>Reason for Reporting</Text>
            <View style={styles.reasonsContainer}>
              {REPORT_REASONS.map((reason) => (
                <TouchableOpacity
                  key={reason}
                  style={[
                    styles.reasonButton,
                    selectedReason === reason && styles.reasonButtonActive,
                  ]}
                  onPress={() => setSelectedReason(reason)}
                >
                  <Text
                    style={[
                      styles.reasonText,
                      selectedReason === reason && styles.reasonTextActive,
                    ]}
                  >
                    {reason}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Additional Details</Text>
            <TextInput
              style={styles.textArea}
              placeholder="Please provide more details about why you are reporting..."
              placeholderTextColor={Colors.gray}
              multiline
              numberOfLines={6}
              value={description}
              onChangeText={setDescription}
              textAlignVertical="top"
              maxLength={500}
            />
            <Text style={styles.characterCount}>{description.length}/500</Text>

            <View style={styles.actions}>
              <TouchableOpacity style={styles.cancelButton} onPress={handleClose}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
                onPress={handleSubmit}
                disabled={isSubmitting}
              >
                <Text style={styles.submitButtonText}>
                  {isSubmitting ? 'Submitting...' : 'Submit Report'}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.lightGray,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.primary,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.primary,
    marginBottom: 12,
  },
  reasonsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 24,
  },
  reasonButton: {
    backgroundColor: Colors.lightGray,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  reasonButtonActive: {
    backgroundColor: Colors.secondary,
    borderColor: Colors.primary,
  },
  reasonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.darkGray,
  },
  reasonTextActive: {
    color: Colors.black,
  },
  textArea: {
    backgroundColor: Colors.lightGray,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: Colors.primary,
    minHeight: 120,
    marginBottom: 8,
    textAlignVertical: 'top',
  },
  characterCount: {
    fontSize: 12,
    color: Colors.gray,
    textAlign: 'right',
    marginBottom: 24,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: Colors.lightGray,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.darkGray,
  },
  submitButton: {
    flex: 1,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: Colors.gray,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.white,
  },
  hint: {
    fontSize: 14,
    color: Colors.gray,
    marginBottom: 12,
    fontStyle: 'italic',
  },
  membersContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  memberCard: {
    width: 80,
    alignItems: 'center',
    backgroundColor: Colors.lightGray,
    borderRadius: 12,
    padding: 8,
    borderWidth: 2,
    borderColor: 'transparent',
    position: 'relative',
  },
  memberCardSelected: {
    backgroundColor: Colors.secondary,
    borderColor: Colors.primary,
  },
  memberAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginBottom: 6,
  },
  memberName: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primary,
    textAlign: 'center',
  },
  checkIcon: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: Colors.primary,
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedCount: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '600',
    marginBottom: 24,
    textAlign: 'center',
  },
});

