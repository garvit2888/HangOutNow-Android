import { 
  collection, 
  addDoc, 
} from 'firebase/firestore';
import { db } from '@/config/firebase';

/**
 * Report Service - Manages user reports for groups and members
 */

export interface Report {
  id?: string;
  reportedBy: string; // User ID who made the report
  reportType: 'group' | 'member';
  reportedItemId: string; // Group ID or Member ID
  reportedMemberIds?: string[]; // Array of member IDs when reporting an activity with specific members
  reportReason: string;
  description: string;
  timestamp: string;
  status: 'pending' | 'reviewed' | 'resolved';
}

const REPORTS_COLLECTION = 'reports';

/**
 * Submit a report for a group or member
 */
export const submitReport = async (report: Omit<Report, 'id' | 'timestamp' | 'status'>): Promise<string> => {
  try {
    console.log('🔨 Submitting report:', report);
    
    const reportData: Omit<Report, 'id'> = {
      ...report,
      timestamp: new Date().toISOString(),
      status: 'pending',
    };
    
    const docRef = await addDoc(collection(db, REPORTS_COLLECTION), reportData);
    
    console.log('✅ Report submitted successfully:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('❌ Error submitting report:', error);
    throw error;
  }
};

