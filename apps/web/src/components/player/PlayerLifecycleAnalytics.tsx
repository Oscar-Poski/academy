'use client';

import { useEffect, useRef } from 'react';
import { postAnalyticsEventKeepalive } from '@/src/lib/api-clients/analytics.browser';

type PlayerLifecycleAnalyticsProps = {
  userId: string;
  pathId: string;
  moduleId: string;
  sectionId: string;
  sectionVersionId: string;
  sessionKey: string;
  isCompleted: boolean;
};

export function PlayerLifecycleAnalytics({
  userId,
  pathId,
  moduleId,
  sectionId,
  sectionVersionId,
  sessionKey,
  isCompleted
}: PlayerLifecycleAnalyticsProps) {
  const startedAtMsRef = useRef<number>(Date.now());
  const isCompletedRef = useRef<boolean>(isCompleted);
  const didSendRef = useRef<boolean>(false);
  const sessionIdRef = useRef<string>(createSessionId());

  useEffect(() => {
    isCompletedRef.current = isCompleted;
  }, [isCompleted]);

  useEffect(() => {
    const sendLifecycleEvents = () => {
      if (didSendRef.current) {
        return;
      }
      didSendRef.current = true;

      const dwellMs = Math.max(0, Date.now() - startedAtMsRef.current);
      const completed = isCompletedRef.current;
      const eventSeed = `${sessionKey}:${sessionIdRef.current}`;

      void postAnalyticsEventKeepalive({
        event_name: 'player_exit',
        occurred_at: new Date().toISOString(),
        idempotency_key: `player_exit:${eventSeed}`,
        user_id: userId,
        path_id: pathId,
        module_id: moduleId,
        section_id: sectionId,
        section_version_id: sectionVersionId,
        payload_json: {
          source: 'learn_player',
          dwell_ms: dwellMs,
          completed
        }
      });

      if (!completed) {
        void postAnalyticsEventKeepalive({
          event_name: 'player_dropoff',
          occurred_at: new Date().toISOString(),
          idempotency_key: `player_dropoff:${eventSeed}`,
          user_id: userId,
          path_id: pathId,
          module_id: moduleId,
          section_id: sectionId,
          section_version_id: sectionVersionId,
          payload_json: {
            source: 'learn_player',
            dwell_ms: dwellMs,
            completed
          }
        });
      }
    };

    const onPageHide = () => {
      sendLifecycleEvents();
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        sendLifecycleEvents();
      }
    };

    window.addEventListener('pagehide', onPageHide);
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      window.removeEventListener('pagehide', onPageHide);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      sendLifecycleEvents();
    };
  }, [moduleId, pathId, sectionId, sectionVersionId, sessionKey, userId]);

  return null;
}

function createSessionId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
