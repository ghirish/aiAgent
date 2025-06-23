import fs from 'fs';
import path from 'path';
import { 
  EmailMonitorState, 
  ProcessedEmail,
  EmailMonitoringConfig,
  ValidationError 
} from '../types/index.js';
import { Logger } from '../utils/logger.js';

/**
 * Email Storage Service - Tracks processed emails and monitoring state
 */
export class EmailStorageService {
  private logger: Logger;
  private storageDir: string;
  private stateFile: string;
  private processedEmailsFile: string;
  private configFile: string;
  private state: EmailMonitorState;
  private processedEmails: Map<string, ProcessedEmail>;
  private config: EmailMonitoringConfig;

  constructor(logger: Logger, storageDir: string = './data') {
    this.logger = logger.child({ component: 'EmailStorage' });
    this.storageDir = storageDir;
    this.stateFile = path.join(storageDir, 'email-monitor-state.json');
    this.processedEmailsFile = path.join(storageDir, 'processed-emails.json');
    this.configFile = path.join(storageDir, 'email-monitoring-config.json');
    
    this.processedEmails = new Map();
    
    // Default configuration
    this.config = {
      enabled: true,
      pollingIntervalMinutes: 5, // Check every 5 minutes
      maxEmailsPerCheck: 20,
      schedulingKeywords: [
        'meeting', 'schedule', 'appointment', 'call', 'conference',
        'available', 'free time', 'book', 'calendar', 'time slot',
        'discussion', 'sync', 'standup', 'review', 'interview'
      ],
      autoProcessing: {
        enabled: true,
        confidenceThreshold: 0.7,
        autoSuggestMeetings: true,
        autoCreateCalendarEvents: false, // Conservative default
      }
    };

    // Default state
    this.state = {
      lastChecked: new Date().toISOString(),
      processedEmails: new Set(),
      totalEmailsProcessed: 0,
      schedulingEmailsFound: 0,
    };

    this.initializeStorage();
  }

  /**
   * Initialize storage directory and load existing data
   */
  private initializeStorage(): void {
    try {
      // Create storage directory if it doesn't exist
      if (!fs.existsSync(this.storageDir)) {
        fs.mkdirSync(this.storageDir, { recursive: true });
        this.logger.info('Created email storage directory:', this.storageDir);
      }

      // Load existing state
      this.loadState();
      this.loadProcessedEmails();
      this.loadConfig();

      this.logger.info('Email storage initialized', {
        totalProcessed: this.state.totalEmailsProcessed,
        schedulingFound: this.state.schedulingEmailsFound,
        lastChecked: this.state.lastChecked
      });

    } catch (error) {
      this.logger.error('Failed to initialize email storage:', error);
      throw new Error('Email storage initialization failed');
    }
  }

  /**
   * Load monitoring state from file
   */
  private loadState(): void {
    try {
      if (fs.existsSync(this.stateFile)) {
        const stateData = JSON.parse(fs.readFileSync(this.stateFile, 'utf8'));
        this.state = {
          ...this.state,
          ...stateData,
          processedEmails: new Set(stateData.processedEmails || [])
        };
        this.logger.debug('Loaded email monitoring state from file');
      }
    } catch (error) {
      this.logger.warn('Failed to load state, using defaults:', error);
    }
  }

  /**
   * Save monitoring state to file
   */
  private saveState(): void {
    try {
      const stateData = {
        ...this.state,
        processedEmails: Array.from(this.state.processedEmails)
      };
      fs.writeFileSync(this.stateFile, JSON.stringify(stateData, null, 2));
      this.logger.debug('Saved email monitoring state to file');
    } catch (error) {
      this.logger.error('Failed to save state:', error);
    }
  }

  /**
   * Load processed emails from file
   */
  private loadProcessedEmails(): void {
    try {
      if (fs.existsSync(this.processedEmailsFile)) {
        const emailsData = JSON.parse(fs.readFileSync(this.processedEmailsFile, 'utf8'));
        this.processedEmails = new Map(Object.entries(emailsData));
        this.logger.debug(`Loaded ${this.processedEmails.size} processed emails from file`);
      }
    } catch (error) {
      this.logger.warn('Failed to load processed emails, starting fresh:', error);
    }
  }

  /**
   * Save processed emails to file
   */
  private saveProcessedEmails(): void {
    try {
      const emailsData = Object.fromEntries(this.processedEmails);
      fs.writeFileSync(this.processedEmailsFile, JSON.stringify(emailsData, null, 2));
      this.logger.debug('Saved processed emails to file');
    } catch (error) {
      this.logger.error('Failed to save processed emails:', error);
    }
  }

  /**
   * Load configuration from file
   */
  private loadConfig(): void {
    try {
      if (fs.existsSync(this.configFile)) {
        const configData = JSON.parse(fs.readFileSync(this.configFile, 'utf8'));
        this.config = { ...this.config, ...configData };
        this.logger.debug('Loaded email monitoring configuration from file');
      } else {
        // Save default config
        this.saveConfig();
      }
    } catch (error) {
      this.logger.warn('Failed to load config, using defaults:', error);
    }
  }

  /**
   * Save configuration to file
   */
  private saveConfig(): void {
    try {
      fs.writeFileSync(this.configFile, JSON.stringify(this.config, null, 2));
      this.logger.debug('Saved email monitoring configuration to file');
    } catch (error) {
      this.logger.error('Failed to save config:', error);
    }
  }

  /**
   * Check if an email has already been processed
   */
  isEmailProcessed(emailId: string): boolean {
    return this.state.processedEmails.has(emailId);
  }

  /**
   * Mark an email as processed and store its details
   */
  markEmailProcessed(email: ProcessedEmail): void {
    this.state.processedEmails.add(email.id);
    this.processedEmails.set(email.id, email);
    this.state.totalEmailsProcessed++;
    
    if (email.hasSchedulingIntent) {
      this.state.schedulingEmailsFound++;
    }

    this.saveState();
    this.saveProcessedEmails();

    this.logger.info('Email marked as processed', {
      emailId: email.id,
      subject: email.subject,
      hasSchedulingIntent: email.hasSchedulingIntent
    });
  }

  /**
   * Update last checked timestamp
   */
  updateLastChecked(): void {
    this.state.lastChecked = new Date().toISOString();
    this.saveState();
  }

  /**
   * Get monitoring state
   */
  getState(): EmailMonitorState {
    return { ...this.state };
  }

  /**
   * Get processed email details
   */
  getProcessedEmail(emailId: string): ProcessedEmail | undefined {
    return this.processedEmails.get(emailId);
  }

  /**
   * Get all processed emails with scheduling intent
   */
  getSchedulingEmails(): ProcessedEmail[] {
    return Array.from(this.processedEmails.values())
      .filter(email => email.hasSchedulingIntent)
      .sort((a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime());
  }

  /**
   * Get configuration
   */
  getConfig(): EmailMonitoringConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<EmailMonitoringConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.saveConfig();
    this.logger.info('Email monitoring configuration updated', newConfig);
  }

  /**
   * Get emails processed in the last N hours
   */
  getRecentProcessedEmails(hoursBack: number = 24): ProcessedEmail[] {
    const cutoffTime = new Date(Date.now() - hoursBack * 60 * 60 * 1000);
    
    return Array.from(this.processedEmails.values())
      .filter(email => new Date(email.processedAt) > cutoffTime)
      .sort((a, b) => new Date(b.processedAt).getTime() - new Date(a.processedAt).getTime());
  }

  /**
   * Clean up old processed emails (keep last 30 days)
   */
  cleanupOldEmails(): void {
    const cutoffTime = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    let removedCount = 0;

    for (const [emailId, email] of this.processedEmails.entries()) {
      if (new Date(email.processedAt) < cutoffTime) {
        this.processedEmails.delete(emailId);
        this.state.processedEmails.delete(emailId);
        removedCount++;
      }
    }

    if (removedCount > 0) {
      this.saveState();
      this.saveProcessedEmails();
      this.logger.info(`Cleaned up ${removedCount} old processed emails`);
    }
  }

  /**
   * Get storage statistics
   */
  getStorageStats(): {
    totalProcessed: number;
    schedulingEmailsFound: number;
    lastChecked: string;
    configEnabled: boolean;
    pollingInterval: number;
    storageSize: number;
  } {
    return {
      totalProcessed: this.state.totalEmailsProcessed,
      schedulingEmailsFound: this.state.schedulingEmailsFound,
      lastChecked: this.state.lastChecked,
      configEnabled: this.config.enabled,
      pollingInterval: this.config.pollingIntervalMinutes,
      storageSize: this.processedEmails.size,
    };
  }
} 