import React, { useEffect } from "react";

interface SoundFeedbackProps {
  type: "success" | "error" | "link";
  play: boolean;
}

const soundFiles = {
  success: "/sounds/success.mp3",
  error: "/sounds/error.mp3",
  link: "/sounds/link.mp3",
};

export const SoundFeedback: React.FC<SoundFeedbackProps> = ({ type, play }) => {
  useEffect(() => {
    if (play && soundFiles[type]) {
      const audio = new Audio(soundFiles[type]);
      audio.volume = 0.25;
      audio.play();
    }
  }, [type, play]);
  return null;
};
