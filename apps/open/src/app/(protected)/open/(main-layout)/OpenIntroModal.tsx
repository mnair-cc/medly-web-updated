"use client";

import { useState, useEffect } from "react";
import FeatureReleaseModal from "@/app/_components/modals/FeatureReleaseModal";
import { OPEN_INTRO_RELEASE } from "@/app/_config/featureReleases";

const OPEN_INTRO_SEEN_KEY = "medly-open-intro-seen";

export default function OpenIntroModal() {
  const [showIntroModal, setShowIntroModal] = useState(false);

  useEffect(() => {
    const seen = localStorage.getItem(OPEN_INTRO_SEEN_KEY);
    if (!seen) {
      setShowIntroModal(true);
    }
  }, []);

  const handleCloseIntroModal = () => {
    localStorage.setItem(OPEN_INTRO_SEEN_KEY, "true");
    setShowIntroModal(false);
  };

  return (
    <FeatureReleaseModal
      isOpen={showIntroModal}
      config={OPEN_INTRO_RELEASE}
      onClose={handleCloseIntroModal}
      onCTA={handleCloseIntroModal}
    />
  );
}

