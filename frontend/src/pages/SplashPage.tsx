import { useState } from "react";
import { Button } from "@heroui/react";
import { SplitText } from "../components/SplitText";
import { useViewTransitionNavigate } from "../hooks/useViewTransition";

export function SplashPage() {
  const [showButton, setShowButton] = useState(false);
  const navigate = useViewTransitionNavigate();

  const handleAnimationComplete = () => {
    setShowButton(true);
  };

  const handleEnter = () => {
    navigate("/posts");
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground">
      <div className="text-center">
        <SplitText
          text="Therefore"
          tag="h1"
          className="text-7xl md:text-8xl lg:text-9xl font-display font-bold"
          delay={80}
          duration={1}
          ease="power3.out"
          splitType="chars"
          from={{ opacity: 0, y: 50 }}
          to={{ opacity: 1, y: 0 }}
          threshold={0.5}
          rootMargin="0px"
          textAlign="center"
          onLetterAnimationComplete={handleAnimationComplete}
        />

        <div
          className={`mt-12 transition-opacity duration-700 ${
            showButton ? "opacity-100" : "opacity-0"
          }`}
        >
          <Button
            size="lg"
            variant="outline"
            className="font-display text-lg px-8"
            onPress={handleEnter}
          >
            Enter
          </Button>
        </div>
      </div>
    </div>
  );
}
