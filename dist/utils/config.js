import { config as loadEnv } from 'dotenv';
import { ConfigSchema, ValidationError } from '../types/index.js';
loadEnv();
export function loadConfig() {
    try {
        const config = {
            google: {
                clientId: process.env.GOOGLE_CLIENT_ID,
                clientSecret: process.env.GOOGLE_CLIENT_SECRET,
                redirectUri: process.env.GOOGLE_REDIRECT_URI,
            },
            azure: {
                endpoint: process.env.AZURE_OPENAI_ENDPOINT,
                apiKey: process.env.AZURE_OPENAI_API_KEY,
                deploymentName: process.env.AZURE_OPENAI_DEPLOYMENT_NAME,
                apiVersion: process.env.AZURE_OPENAI_API_VERSION || '2024-02-15-preview',
            },
            app: {
                nodeEnv: process.env.NODE_ENV || 'development',
                logLevel: process.env.LOG_LEVEL || 'info',
                port: parseInt(process.env.PORT || '3000', 10),
            },
            security: {
                jwtSecret: process.env.JWT_SECRET,
                encryptionKey: process.env.ENCRYPTION_KEY,
            },
            mcp: {
                serverName: process.env.MCP_SERVER_NAME || 'calendar-copilot',
                serverVersion: process.env.MCP_SERVER_VERSION || '1.0.0',
            },
        };
        const validatedConfig = ConfigSchema.parse(config);
        return validatedConfig;
    }
    catch (error) {
        if (error instanceof Error) {
            throw new ValidationError(`Configuration validation failed: ${error.message}`, error);
        }
        throw new ValidationError('Unknown configuration error');
    }
}
export function validateEnvironment() {
    const requiredVars = [
        'GOOGLE_CLIENT_ID',
        'GOOGLE_CLIENT_SECRET',
        'GOOGLE_REDIRECT_URI',
        'AZURE_OPENAI_ENDPOINT',
        'AZURE_OPENAI_API_KEY',
        'AZURE_OPENAI_DEPLOYMENT_NAME',
        'JWT_SECRET',
        'ENCRYPTION_KEY',
    ];
    const missing = requiredVars.filter(varName => !process.env[varName]);
    return {
        isValid: missing.length === 0,
        missing,
    };
}
export function getConfig() {
    const envCheck = validateEnvironment();
    if (!envCheck.isValid) {
        throw new ValidationError(`Missing required environment variables: ${envCheck.missing.join(', ')}`);
    }
    return loadConfig();
}
