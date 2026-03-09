import React from 'react';
import beeCharacter from '../assets/bee-character.png';

interface BeeCharacterProps {
  className?: string;
  size?: number | string;
}

const BeeCharacter: React.FC<BeeCharacterProps> = ({ className = '', size = '1em' }) => {
  return (
    <img
      src={beeCharacter}
      alt="SinggleBee"
      className={`inline-block align-middle pointer-events-none ${className}`}
      style={{
        width: size,
        height: size,
        objectFit: 'contain',
      }}
    />
  );
};

export default BeeCharacter;
