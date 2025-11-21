import React from "react";
import Image from "next/image";

interface ChessComIconProps {
  size?: number;
  className?: string;
}

const ChessComIcon: React.FC<ChessComIconProps> = ({
  size = 24,
  className = "",
}) => {
  return (
    <Image
      src="/chesscom-logo.png"
      alt="Chess.com"
      width={size}
      height={size}
      className={className}
      style={{ objectFit: "contain" }}
    />
  );
};

export default ChessComIcon;
