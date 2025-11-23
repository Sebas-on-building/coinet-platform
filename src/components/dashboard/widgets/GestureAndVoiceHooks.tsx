import { useEffect } from "react";
import { useGesture } from "@use-gesture/react";

export const useGestureSupport = (handlers: { onPinch?: () => void; onTap?: () => void; onSwipe?: () => void }) => {
  useGesture(
    {
      onPinch: handlers.onPinch,
      onTap: handlers.onTap,
      onDrag: handlers.onSwipe, // treat drag as swipe for now
    },
    { eventOptions: { passive: false } }
  );
};

export const useVoiceSupport = (handlers: { onCommand?: (cmd: string) => void }) => {
  useEffect(() => {
    if (!('webkitSpeechRecognition' in window)) return;
    // @ts-ignore
    const recognition = new window.webkitSpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.onresult = (event: any) => {
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          handlers.onCommand?.(event.results[i][0].transcript);
        }
      }
    };
    recognition.start();
    return () => recognition.stop();
  }, [handlers]);
}; 