import { 
  collection, 
  addDoc, 
} from 'firebase/firestore';
import { db } from '@/config/firebase';

/**
 * SOS Service - Manages SOS reports for safety monitoring
 */

export interface SOSReport {
  id?: string;
  userId: string; // User ID who triggered SOS
  userName?: string; // User name for quick reference
  userEmail?: string; // User email address
  activityId: string; // Activity ID where SOS was triggered
  activityName?: string; // Activity name for context
  timestamp: string; // ISO timestamp of when SOS was triggered
  status: 'active' | 'resolved' | 'false_alarm'; // Status of the SOS
  location?: {
    latitude: number;
    longitude: number;
  }; // User's location when SOS was triggered
  resolvedAt?: string; // When SOS was resolved
  resolvedBy?: string; // Who resolved it (admin/mod)
}

const SOS_COLLECTION = 'sosReports';

/**
 * Submit an SOS report
 */
export const submitSOSReport = async (report: Omit<SOSReport, 'id' | 'timestamp' | 'status'>): Promise<string> => {
  try {
    console.log('🚨 Submitting SOS report:', report);
    
    const sosData: Omit<SOSReport, 'id'> = {
      ...report,
      timestamp: new Date().toISOString(),
      status: 'active',
    };
    
    const docRef = await addDoc(collection(db, SOS_COLLECTION), sosData);
    
    console.log('✅ SOS report submitted successfully:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('❌ Error submitting SOS report:', error);
    throw error;
  }
};

