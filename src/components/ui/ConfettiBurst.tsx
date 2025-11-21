import React from "react";
// @ts-ignore: No types for react-confetti
import Confetti from "react-confetti";

interface ConfettiBurstProps {
  run: boolean;
  onComplete?: () => void;
}

export const ConfettiBurst: React.FC<ConfettiBurstProps> = ({
  run,
  onComplete,
}) => {
  // Optionally, you can use a custom animation or react-confetti
  // This is a simple wrapper for react-confetti
  if (!run) return null;
  return (
    <Confetti
      width={window.innerWidth}
      height={window.innerHeight}
      numberOfPieces={250}
      recycle={false}
      onConfettiComplete={onComplete}
      gravity={0.3}
      initialVelocityY={20}
      tweenDuration={600}
    />
  );
};
