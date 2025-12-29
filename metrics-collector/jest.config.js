module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    roots: ['<rootDir>/../tests'],
    transform: {
        '^.+\\.tsx?$': 'ts-jest',
    },
    moduleDirectories: ['node_modules', '<rootDir>/node_modules'],
};
