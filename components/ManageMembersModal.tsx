import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image
} from 'react-native';
import Colors from '@/constants/colors';

export default function ManageMembersModal({ visible, members, adminId, currentUserId, onRemove, onReport, onClose }) {
  const isCreator = adminId === currentUserId;
  
  return (
    <Modal visible={visible} transparent animationType='slide' onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          <Text style={styles.title}>{isCreator ? 'Manage Members' : 'View Members'}</Text>
          <ScrollView style={{ width: '100%' }} contentContainerStyle={{ paddingBottom: 12 }}>
            {members.map((m) => (
              <View key={m.id} style={styles.memberRow}>
                <Image source={{ uri: m.avatar }} style={styles.avatar} />
                <Text style={styles.name}>{m.name}</Text>
                {adminId === currentUserId && m.id !== adminId && (
                  <>
                    <TouchableOpacity style={styles.reportBtn} onPress={() => onReport(m)}>
                      <Text style={styles.reportText}>Report</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.removeBtn} onPress={() => onRemove(m)}>
                      <Text style={styles.removeText}>Remove</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            ))}
          </ScrollView>
          <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
            <Text style={styles.cancelText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  modalContent: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 22,
    width: '85%',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.primary,
    marginBottom: 10,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    gap: 10,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 8,
  },
  name: {
    fontSize: 16,
    color: Colors.primary,
    flex: 1,
  },
  reportBtn: {
    backgroundColor: Colors.lightGray,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginRight: 6,
  },
  reportText: {
    color: Colors.secondary,
    fontWeight: 'bold',
  },
  removeBtn: {
    backgroundColor: Colors.secondary,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  removeText: {
    color: Colors.white,
    fontWeight: 'bold',
  },
  cancelBtn: {
    marginTop: 8,
    padding: 10,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: Colors.primary,
    width: 120,
    alignSelf:'center',
  },
  cancelText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
});

