import React, { useState } from 'react';
import { Modal, StyleSheet, View, Text, TouchableOpacity, TextInput, Switch } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '@/constants/colors';
import { Group } from '@/types';
import { Map } from 'lucide-react-native';

interface GroupEditModalProps {
  visible: boolean;
  group: Group;
  editable: boolean;
  onClose: () => void;
  onSave: (updated: Group) => void;
}

const moodOptions = ['party', 'coffee', 'food', 'chill', 'movie', 'walk'];
const memberOptions = [3, 4, 5, 6, 8, 10];

export default function GroupEditModal({ visible, group, editable, onClose, onSave }: GroupEditModalProps) {
  const [form, setForm] = useState({
    name: group.name,
    mood: group.mood,
    maxMembers: group.maxMembers,
    meetingLocation: group.meetingLocation,
    isPublic: group.isPublic,
  });
  const [showMapPicker, setShowMapPicker] = useState(false);

  const handleSave = () => {
    onSave({ ...group, ...form });
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <LinearGradient colors={[Colors.primary, Colors.darkPurple]} style={styles.overlay}>
        <View style={styles.modalContent}>
          <Text style={styles.title}>Edit Group</Text>

          <TextInput
            style={styles.input}
            value={form.name}
            onChangeText={text => setForm(f => ({ ...f, name: text }))}
            placeholder="Group Name"
            placeholderTextColor={Colors.gray}
            editable={editable}
          />
          <View style={styles.row}>
            <Text style={styles.label}>Mood:</Text>
            {moodOptions.map(mood => (
              <TouchableOpacity
                key={mood}
                style={[
                  styles.chip,
                  form.mood === mood && styles.chipSelected,
                  !editable && styles.chipDisabled,
                ]}
                onPress={() => editable && setForm(f => ({ ...f, mood }))}
                disabled={!editable}
              >
                <Text style={form.mood === mood ? styles.chipTextSelected : styles.chipText}>{mood.charAt(0).toUpperCase() + mood.slice(1)}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Max Members:</Text>
            {memberOptions.map(cnt => (
              <TouchableOpacity
                key={cnt}
                style={[
                  styles.chip,
                  form.maxMembers === cnt && styles.chipSelected,
                  !editable && styles.chipDisabled,
                ]}
                onPress={() => editable && setForm(f => ({ ...f, maxMembers: cnt }))}
                disabled={!editable}
              >
                <Text style={form.maxMembers === cnt ? styles.chipTextSelected : styles.chipText}>{cnt}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TextInput
            style={styles.input}
            value={form.meetingLocation}
            onChangeText={text => setForm(f => ({ ...f, meetingLocation: text }))}
            placeholder="Meeting Location"
            placeholderTextColor={Colors.gray}
            editable={editable}
          />
          <TouchableOpacity style={styles.mapBtn} disabled={!editable} onPress={() => editable && setShowMapPicker(true)}>
            <Map size={16} color={Colors.primary} />
            <Text style={styles.mapBtnText}>Add/Edit On Map</Text>
          </TouchableOpacity>
          <View style={styles.switchRow}>
            <Text style={styles.label}>Public Group</Text>
            <Switch
              value={form.isPublic}
              onValueChange={val => editable && setForm(f => ({ ...f, isPublic: val }))}
              disabled={!editable}
              trackColor={{ true: Colors.secondary, false: Colors.gray }}
              thumbColor={form.isPublic ? Colors.primary : Colors.white}
            />
          </View>
          <View style={styles.rowBtns}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            {editable && (
              <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                <Text style={styles.saveText}>Save</Text>
              </TouchableOpacity>
            )}
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
    gap: 12,
  },
  title: {
    color: Colors.primary,
    fontWeight: '700',
    fontSize: 18,
    marginBottom: 10,
  },
  input: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.gray,
    backgroundColor: 'rgba(0,0,0,0.05)',
    color: Colors.primary,
    fontSize: 16,
    fontWeight: '500',
    width: '100%',
    textAlign: 'center',
    marginBottom: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 4,
  },
  chip: {
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: Colors.lightGray,
    marginHorizontal: 2,
  },
  chipSelected: {
    backgroundColor: Colors.secondary,
  },
  chipDisabled: {
    opacity: 0.4,
  },
  chipText: {
    color: Colors.primary,
    fontWeight: '600',
  },
  chipTextSelected: {
    color: Colors.primary,
    fontWeight: 'bold',
  },
  label: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '500',
  },
  mapBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: Colors.lightGray,
    marginBottom: 8,
  },
  mapBtnText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 10,
  },
  rowBtns: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: Colors.lightGray,
    padding: 10,
    borderRadius: 8,
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
    alignItems: 'center',
  },
  saveText: {
    color: Colors.white,
    fontWeight: 'bold',
  },
});

