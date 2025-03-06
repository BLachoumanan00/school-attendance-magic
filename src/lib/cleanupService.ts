
import { cleanupDeletedStudents } from './supabaseService';

// This function could be called from a background job, 
// edge function, or scheduled task
export const runDailyCleanup = async () => {
  try {
    // Delete students that have been in the bin for more than 30 days
    await cleanupDeletedStudents(30);
    console.log('Daily cleanup completed successfully');
    return { success: true, message: 'Cleanup completed successfully' };
  } catch (error) {
    console.error('Daily cleanup failed:', error);
    return { 
      success: false, 
      message: 'Cleanup failed', 
      error: error instanceof Error ? error.message : String(error) 
    };
  }
};
