import React from 'react';
import Image from 'next/image';

interface BeeCharacterProps {
    className?: string;
    size?: number | string;
}

const BeeCharacter: React.FC<BeeCharacterProps> = ({ className = '', size = '1em' }) => {
    // Convert string size to number for Next.js Image if possible, otherwise use style
    const isNumericSize = typeof size === 'number';
    const numSize = isNumericSize ? size : 40; // Default fallback

    return (
        <Image
            src="/assets/bee-character.png"
            alt="SinggleBee"
            width={numSize}
            height={numSize}
            className={`inline-block align-middle pointer-events-none ${className}`}
            style={!isNumericSize ? { width: size, height: size, objectFit: 'contain' } : { objectFit: 'contain' }}
        />
    );
};

export default BeeCharacter;
