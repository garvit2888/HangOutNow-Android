import React, { useState } from 'react';
import {
  Modal,
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  TextInput
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '@/constants/colors';

interface AppSettingsModalProps {
  visible: boolean;
  initialMaxAgeDiff: number;
  onClose: () => void;
  onSave: (maxAgeDiff: number) => void;
}

export default function AppSettingsModal({ visible, initialMaxAgeDiff, onClose, onSave }: AppSettingsModalProps) {
  const [maxAgeDiff, setMaxAgeDiff] = useState(initialMaxAgeDiff + '');

  const handleSave = () => {
    const value = parseInt(maxAgeDiff);
    if (!isNaN(value) && value > 0 && value < 50) {
      onSave(value);
      onClose();
    }
  };

  return (
    <Modal
      animationType="slide"
      transparent
      visible={visible}
      onRequestClose={onClose}
    >
      <LinearGradient colors={[Colors.primary, Colors.darkPurple]} style={styles.overlay}>
        <View style={styles.modalContent}>
          <Text style={styles.title}>App Settings</Text>
          <Text style={styles.label}>Max Age Difference Allowed</Text>
          <TextInput
            style={styles.input}
            value={maxAgeDiff}
            keyboardType="number-pad"
            placeholder="e.g. 5"
            placeholderTextColor={Colors.gray}
            onChangeText={setMaxAgeDiff}
            maxLength={2}
          />
          <Text style={styles.helperText}>Only users within this age difference are shown to you.</Text>
          <View style={styles.buttonsRow}>
            <TouchableOpacity onPress={onClose} style={styles.cancelBtn}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleSave} style={styles.saveBtn}>
              <Text style={styles.saveText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: Colors.white,
    borderRadius: 18,
    padding: 24,
    paddingHorizontal: 28,
    minWidth: 280,
    alignItems: 'center',
  },
  title: {
    color: Colors.primary,
    fontWeight: '700',
    fontSize: 20,
    marginBottom: 20,
  },
  label: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '500',
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  input: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.gray,
    backgroundColor: 'rgba(0,0,0,0.05)',
    color: Colors.primary,
    fontSize: 16,
    fontWeight: '500',
    width: 110,
    textAlign: 'center',
    marginBottom: 6,
  },
  helperText: {
    fontSize: 12,
    color: Colors.gray,
    textAlign: 'center',
    marginBottom: 20,
  },
  buttonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 8,
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: Colors.lightGray,
    padding: 10,
    borderRadius: 8,
    marginRight: 6,
    alignItems: 'center',
  },
  cancelText: {
    color: Colors.darkGray,
    fontWeight: 'bold',
  },
  saveBtn: {
    flex: 1,
    backgroundColor: Colors.primary,
    padding: 10,
    borderRadius: 8,
    marginLeft: 6,
    alignItems: 'center',
  },
  saveText: {
    color: Colors.white,
    fontWeight: 'bold',
  },
});

