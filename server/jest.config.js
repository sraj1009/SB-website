/** @type {import('jest').Config} */
const config = {
    testEnvironment: 'node',
    transform: {},
    verbose: true,
    moduleNameMapper: {
        '^#config/(.*)$': '<rootDir>/config/$1',
        '^#controllers/(.*)$': '<rootDir>/controllers/$1',
        '^#models/(.*)$': '<rootDir>/models/$1',
        '^#routes/(.*)$': '<rootDir>/routes/$1',
        '^#utils/(.*)$': '<rootDir>/utils/$1',
        '^#services/(.*)$': '<rootDir>/services/$1',
        '^#middleware/(.*)$': '<rootDir>/middleware/$1',
    },
};

export default config;
