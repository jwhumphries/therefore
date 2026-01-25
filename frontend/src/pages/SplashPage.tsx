import { useState } from "react";
import { SplitText } from "../components/SplitText";
import { SlideInButton } from "../components/SlideInButton";
import { AncientScriptBackground } from "../components/background";
import { useViewTransitionNavigate } from "../hooks/useViewTransition";

export function SplashPage() {
  const [animationComplete, setAnimationComplete] = useState(false);
  const navigate = useViewTransitionNavigate();

  const handleAnimationComplete = () => {
    setAnimationComplete(true);
  };

  const handleEnter = () => {
    navigate("/posts");
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground relative overflow-hidden">
      <AncientScriptBackground className="absolute inset-0 z-0" />
      <div className="text-center relative z-10">
        <div className="relative inline-block">
          {/* Phase 1: SplitText animates characters in with solid color */}
          {/* Phase 2: After completion, crossfade to animated gradient */}

          {/* Gradient text - fades in after split animation completes */}
          <h1
            className={`text-7xl md:text-8xl lg:text-9xl font-display font-bold gradient-text-animated transition-opacity duration-1000 ease-in-out ${
              animationComplete ? "opacity-100" : "opacity-0"
            }`}
          >
            Therefore
          </h1>

          {/* SplitText - animates characters in, then fades out */}
          <div
            className={`absolute inset-0 flex items-center justify-center transition-opacity duration-1000 ease-in-out ${
              animationComplete ? "opacity-0" : "opacity-100"
            }`}
          >
            <SplitText
              text="Therefore"
              tag="span"
              className="text-7xl md:text-8xl lg:text-9xl font-display font-bold split-text-solid"
              delay={80}
              duration={0.8}
              ease="power3.out"
              splitType="chars"
              from={{ opacity: 0, y: 20 }}
              to={{ opacity: 1, y: 0 }}
              threshold={0.1}
              rootMargin="0px"
              textAlign="center"
              onLetterAnimationComplete={handleAnimationComplete}
            />
          </div>
        </div>

        <div
          className={`mt-12 transition-opacity duration-700 ${
            animationComplete ? "opacity-100" : "opacity-0"
          }`}
        >
          <SlideInButton onClick={handleEnter}>Enter</SlideInButton>
        </div>
      </div>
    </div>
  );
}
