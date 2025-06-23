import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { 
  GmailMessage, 
  EmailSummary, 
  GmailError,
  ValidationError 
} from '../types/index.js';
import { Logger } from '../utils/logger.js';
import fs from 'fs';
import path from 'path';

/**
 * Gmail API Integration Service
 */
export class GmailService {
  private oauth2Client: OAuth2Client;
  private gmail: any;
  private logger: Logger;

  constructor(
    clientId: string,
    clientSecret: string,
    redirectUri: string,
    logger: Logger
  ) {
    this.logger = logger.child({ component: 'Gmail' });
    
    // Initialize OAuth2 client
    this.oauth2Client = new OAuth2Client(
      clientId,
      clientSecret,
      redirectUri
    );

    // Load existing tokens
    this.loadExistingTokens();

    // Initialize Gmail API
    this.gmail = google.gmail({ 
      version: 'v1', 
      auth: this.oauth2Client 
    });

    this.logger.info('Gmail service initialized', {
      hasTokens: !!this.oauth2Client.credentials?.access_token
    });
  }

  /**
   * Load existing OAuth2 tokens from common locations
   */
  private loadExistingTokens(): void {
    const tokenPaths = [
      './tokens.json',
      './token.json',
      './credentials/tokens.json'
    ];

    for (const tokenPath of tokenPaths) {
      try {
        const fullPath = path.resolve(tokenPath);
        if (fs.existsSync(fullPath)) {
          const tokens = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
          
          // Check if tokens are still valid (not expired)
          if (tokens.expiry_date && tokens.expiry_date > Date.now()) {
            this.oauth2Client.setCredentials(tokens);
            this.logger.info('✅ Loaded valid OAuth2 tokens for Gmail from:', tokenPath);
            return;
          } else if (tokens.refresh_token) {
            // Tokens expired but we have refresh token
            this.oauth2Client.setCredentials(tokens);
            this.logger.info('✅ Loaded OAuth2 tokens with refresh capability for Gmail from:', tokenPath);
            return;
          } else {
            this.logger.warn('OAuth2 tokens expired and no refresh token available in:', tokenPath);
          }
        }
      } catch (error) {
        this.logger.debug('Could not load tokens from:', tokenPath, error);
      }
    }

    this.logger.warn('No valid OAuth2 tokens found for Gmail. User needs to authenticate.');
  }

  /**
   * Generate OAuth 2.0 authorization URL with Gmail scopes
   */
  getAuthUrl(): string {
    const scopes = [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/calendar.events',
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.send',
      'https://www.googleapis.com/auth/gmail.modify',
    ];

    const authUrl = this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent',
    });

    this.logger.info('Generated OAuth authorization URL for Gmail');
    return authUrl;
  }

  /**
   * Exchange authorization code for access token
   */
  async exchangeCodeForTokens(code: string): Promise<void> {
    try {
      const { tokens } = await this.oauth2Client.getToken(code);
      this.oauth2Client.setCredentials(tokens);

      // Save tokens to file
      const tokenPath = './tokens.json';
      fs.writeFileSync(tokenPath, JSON.stringify(tokens, null, 2));
      
      this.logger.info('✅ Gmail OAuth tokens obtained and saved successfully');
    } catch (error) {
      this.logger.error('Failed to exchange code for Gmail tokens:', error);
      throw new GmailError('Failed to authenticate with Gmail', error);
    }
  }

  /**
   * Set access token manually
   */
  setAccessToken(accessToken: string, refreshToken?: string): void {
    this.oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    this.logger.info('Gmail access token set manually');
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return !!(this.oauth2Client.credentials && this.oauth2Client.credentials.access_token);
  }

  /**
   * Get recent emails from Gmail
   */
  async getRecentEmails(
    maxResults: number = 20,
    query?: string
  ): Promise<EmailSummary[]> {
    try {
      if (!this.isAuthenticated()) {
        throw new GmailError('Not authenticated with Gmail. Please authenticate first.');
      }

      this.logger.info('Fetching recent emails', { maxResults, query });

      // List messages
      const listResponse = await this.gmail.users.messages.list({
        userId: 'me',
        maxResults,
        q: query || 'in:inbox',
      });

      const messages = listResponse.data.messages || [];
      
      if (messages.length === 0) {
        this.logger.info('No messages found');
        return [];
      }

      // Get full message details for each message
      const emailPromises = messages.map(async (message: any) => {
        const fullMessage = await this.gmail.users.messages.get({
          userId: 'me',
          id: message.id,
          format: 'full',
        });

        return this.parseEmailMessage(fullMessage.data);
      });

      const emails = await Promise.all(emailPromises);
      
      this.logger.info(`Successfully fetched ${emails.length} emails`);
      return emails;

    } catch (error) {
      this.logger.error('Failed to fetch emails:', error);
      throw new GmailError('Failed to fetch emails from Gmail', error);
    }
  }

  /**
   * Parse Gmail message into EmailSummary format
   */
  private parseEmailMessage(message: any): EmailSummary {
    const headers = message.payload?.headers || [];
    
    // Extract headers
    const getHeader = (name: string) => {
      const header = headers.find((h: any) => h.name.toLowerCase() === name.toLowerCase());
      return header?.value || '';
    };

    const subject = getHeader('Subject');
    const from = getHeader('From');
    const to = getHeader('To').split(',').map((email: string) => email.trim()).filter(Boolean);
    const date = getHeader('Date');

    // Extract body content
    const body = this.extractEmailBody(message.payload);

    // Check if message is unread
    const isUnread = message.labelIds?.includes('UNREAD') || false;

    return {
      id: message.id,
      subject,
      from,
      to,
      date,
      snippet: message.snippet || '',
      body,
      isUnread,
    };
  }

  /**
   * Extract email body from message payload
   */
  private extractEmailBody(payload: any): string {
    if (!payload) return '';

    // If the message has parts, find the text/html or text/plain part
    if (payload.parts) {
      for (const part of payload.parts) {
        if (part.mimeType === 'text/html' || part.mimeType === 'text/plain') {
          if (part.body?.data) {
            return Buffer.from(part.body.data, 'base64').toString('utf8');
          }
        }
        // Recursively check nested parts
        const nestedBody = this.extractEmailBody(part);
        if (nestedBody) return nestedBody;
      }
    }

    // If no parts, check the main body
    if (payload.body?.data) {
      return Buffer.from(payload.body.data, 'base64').toString('utf8');
    }

    return '';
  }

  /**
   * Search emails with specific query
   */
  async searchEmails(
    query: string,
    maxResults: number = 10
  ): Promise<EmailSummary[]> {
    try {
      this.logger.info('Searching emails', { query, maxResults });
      
      return await this.getRecentEmails(maxResults, query);
    } catch (error) {
      this.logger.error('Failed to search emails:', error);
      throw new GmailError('Failed to search emails', error);
    }
  }

  /**
   * Get emails from today
   */
  async getTodaysEmails(maxResults: number = 50): Promise<EmailSummary[]> {
    const today = new Date().toISOString().split('T')[0];
    const query = `after:${today}`;
    
    return await this.searchEmails(query, maxResults);
  }

  /**
   * Get unread emails
   */
  async getUnreadEmails(maxResults: number = 20): Promise<EmailSummary[]> {
    const query = 'is:unread';
    
    return await this.searchEmails(query, maxResults);
  }
} 