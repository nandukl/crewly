import { supabase } from './supabaseClient';

export const aiService = {
  /**
   * Generates a setup draft using the AI Setup Assistant edge function.
   * 
   * @param {Array<{role: 'user' | 'model', parts: Array<{text: string}>}>} conversationHistory - The conversational history to pass to Gemini
   * @param {string} orgId - The organization ID to generate the draft for
   * @returns {Promise<any>} The parsed JSON draft returned by the model
   */
  generateSetupDraft: async (conversationHistory, orgId) => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      throw new Error("No active session");
    }

    const { data, error } = await supabase.functions.invoke('ai-setup-assistant', {
      body: {
        orgId,
        conversation: conversationHistory
      }
    });

    if (error) {
      console.error("AI Setup Assistant error:", error);
      throw error;
    }

    return data;
  }
};
