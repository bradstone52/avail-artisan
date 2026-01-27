import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AuthMFAGetAuthenticatorAssuranceLevelResponse } from '@supabase/supabase-js';

interface MfaStatus {
  isEnabled: boolean;
  isVerified: boolean;
  needsVerification: boolean;
  loading: boolean;
  factors: any[];
}

export function useMfa() {
  const [status, setStatus] = useState<MfaStatus>({
    isEnabled: false,
    isVerified: false,
    needsVerification: false,
    loading: true,
    factors: [],
  });

  const checkMfaStatus = useCallback(async () => {
    try {
      // Get the current assurance level
      const { data: aalData, error: aalError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      
      if (aalError) {
        console.error('Error getting AAL:', aalError);
        setStatus(prev => ({ ...prev, loading: false }));
        return;
      }

      // Get enrolled factors
      const { data: factorsData, error: factorsError } = await supabase.auth.mfa.listFactors();
      
      if (factorsError) {
        console.error('Error listing factors:', factorsError);
        setStatus(prev => ({ ...prev, loading: false }));
        return;
      }

      const verifiedFactors = factorsData?.totp?.filter(f => f.status === 'verified') || [];
      const hasEnabledMfa = verifiedFactors.length > 0;
      
      // currentLevel is 'aal1' (password only) or 'aal2' (password + MFA verified)
      // nextLevel indicates what level is required
      const currentLevel = aalData?.currentLevel;
      const nextLevel = aalData?.nextLevel;
      
      // User needs MFA verification if they have MFA enabled but haven't verified this session
      const needsVerification = hasEnabledMfa && currentLevel === 'aal1' && nextLevel === 'aal2';

      setStatus({
        isEnabled: hasEnabledMfa,
        isVerified: currentLevel === 'aal2',
        needsVerification,
        loading: false,
        factors: verifiedFactors,
      });
    } catch (error) {
      console.error('Error checking MFA status:', error);
      setStatus(prev => ({ ...prev, loading: false }));
    }
  }, []);

  useEffect(() => {
    checkMfaStatus();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      checkMfaStatus();
    });

    return () => subscription.unsubscribe();
  }, [checkMfaStatus]);

  const disableMfa = useCallback(async () => {
    if (status.factors.length === 0) {
      return { error: new Error('No MFA factors to disable') };
    }

    try {
      const factorId = status.factors[0].id;
      const { error } = await supabase.auth.mfa.unenroll({ factorId });
      
      if (error) {
        return { error };
      }

      await checkMfaStatus();
      return { error: null };
    } catch (error: any) {
      return { error };
    }
  }, [status.factors, checkMfaStatus]);

  return {
    ...status,
    refresh: checkMfaStatus,
    disableMfa,
  };
}
