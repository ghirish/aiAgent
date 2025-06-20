import { Config } from '../types/index.js';
export declare function loadConfig(): Config;
export declare function validateEnvironment(): {
    isValid: boolean;
    missing: string[];
};
export declare function getConfig(): Config;
