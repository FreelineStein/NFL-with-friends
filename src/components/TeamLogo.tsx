"use client";

import Image from "next/image";
import { teamLogoUrl } from "@/config/league";

interface TeamLogoProps {
  abbr: string;
  size?: number;
  className?: string;
}

export default function TeamLogo({ abbr, size = 24, className = "" }: TeamLogoProps) {
  return (
    <Image
      src={teamLogoUrl(abbr)}
      alt={abbr}
      width={size}
      height={size}
      className={`flex-shrink-0 ${className}`}
      unoptimized
    />
  );
}
