import { GmailService } from './gmail.js';
import { EmailStorageService } from './email-storage.js';
import { AzureAIService } from './azure-ai.js';
import { 
  EmailSummary, 
  ProcessedEmail, 
  EmailMonitoringConfig,
  GmailError 
} from '../types/index.js';
import { Logger } from '../utils/logger.js';

/**
 * Email Monitoring Service - Polls Gmail for new emails and processes them for scheduling intent
 */
export class EmailMonitorService {
  private logger: Logger;
  private gmailService: GmailService;
  private storageService: EmailStorageService;
  private azureAIService: AzureAIService;
  private pollingTimer: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;
  private isProcessing: boolean = false;

  constructor(
    logger: Logger,
    gmailService: GmailService,
    storageService: EmailStorageService,
    azureAIService: AzureAIService
  ) {
    this.logger = logger.child({ component: 'EmailMonitor' });
    this.gmailService = gmailService;
    this.storageService = storageService;
    this.azureAIService = azureAIService;
  }

  /**
   * Start the email monitoring service
   */
  start(): void {
    const config = this.storageService.getConfig();
    
    if (!config.enabled) {
      this.logger.info('Email monitoring is disabled in config');
      return;
    }

    if (this.isRunning) {
      this.logger.warn('Email monitoring is already running');
      return;
    }

    this.isRunning = true;
    this.scheduleNextCheck(config);
    
    this.logger.info('Email monitoring service started', {
      pollingInterval: config.pollingIntervalMinutes,
      maxEmailsPerCheck: config.maxEmailsPerCheck
    });
  }

  /**
   * Stop the email monitoring service
   */
  stop(): void {
    if (this.pollingTimer) {
      clearTimeout(this.pollingTimer);
      this.pollingTimer = null;
    }

    this.isRunning = false;
    this.logger.info('Email monitoring service stopped');
  }

  /**
   * Schedule the next email check
   */
  private scheduleNextCheck(config: EmailMonitoringConfig): void {
    if (!this.isRunning) return;

    const intervalMs = config.pollingIntervalMinutes * 60 * 1000;
    
    this.pollingTimer = setTimeout(async () => {
      try {
        await this.checkForNewEmails();
      } catch (error) {
        this.logger.error('Error during scheduled email check:', error);
      } finally {
        // Schedule next check regardless of success/failure
        this.scheduleNextCheck(config);
      }
    }, intervalMs);

    this.logger.debug(`Next email check scheduled in ${config.pollingIntervalMinutes} minutes`);
  }

  /**
   * Check for new emails and process them
   */
  async checkForNewEmails(): Promise<void> {
    if (this.isProcessing) {
      this.logger.debug('Email processing already in progress, skipping this check');
      return;
    }

    this.isProcessing = true;
    const config = this.storageService.getConfig();

    try {
      this.logger.debug('Starting email check for new messages');

      // Get recent emails from Gmail
      const emails = await this.gmailService.getRecentEmails(config.maxEmailsPerCheck);
      
      if (!emails || emails.length === 0) {
        this.logger.debug('No emails found during check');
        this.storageService.updateLastChecked();
        return;
      }

      // Filter out already processed emails
      const newEmails = emails.filter(email => !this.storageService.isEmailProcessed(email.id));
      
      if (newEmails.length === 0) {
        this.logger.debug('No new emails to process');
        this.storageService.updateLastChecked();
        return;
      }

      this.logger.info(`Found ${newEmails.length} new emails to process`);

      // Process each new email
      for (const email of newEmails) {
        try {
          await this.processEmail(email, config);
        } catch (error) {
          this.logger.error(`Failed to process email ${email.id}:`, error);
          
          // Mark as processed even if failed to avoid reprocessing
          const failedProcessedEmail: ProcessedEmail = {
            id: email.id,
            subject: email.subject || 'No Subject',
            from: email.from || 'Unknown Sender',
            receivedAt: email.date || new Date().toISOString(),
            processedAt: new Date().toISOString(),
            hasSchedulingIntent: false,
            actionTaken: 'none',
          };
          
          this.storageService.markEmailProcessed(failedProcessedEmail);
        }
      }

      this.storageService.updateLastChecked();
      this.logger.info(`Email check completed. Processed ${newEmails.length} new emails`);

    } catch (error) {
      this.logger.error('Failed to check for new emails:', error);
      throw new GmailError('Email monitoring check failed', error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Process a single email for scheduling intent
   */
  private async processEmail(email: EmailSummary, config: EmailMonitoringConfig): Promise<void> {
    this.logger.debug(`Processing email: ${email.subject}`);

    try {
      // Quick keyword check first for performance
      const hasKeywords = this.containsSchedulingKeywords(email, config.schedulingKeywords);
      
      let hasSchedulingIntent = false;
      let schedulingDetails: ProcessedEmail['schedulingDetails'];
      let confidence = 0;

      if (hasKeywords) {
        // Use Azure AI to analyze for scheduling intent
        const emailText = `Subject: ${email.subject}\nFrom: ${email.from}\nBody: ${email.snippet}`;
        
        try {
          const analysis = await this.azureAIService.analyzeEmailForScheduling(emailText);
          hasSchedulingIntent = analysis.hasSchedulingIntent;
          confidence = analysis.confidence;
          schedulingDetails = analysis.details;
        } catch (aiError) {
          this.logger.warn(`Azure AI analysis failed for email ${email.id}, using keyword detection:`, aiError);
          hasSchedulingIntent = hasKeywords;
          confidence = 0.5; // Medium confidence for keyword-only detection
        }
      }

      // Create processed email record
      const processedEmail: ProcessedEmail = {
        id: email.id,
        subject: email.subject,
        from: email.from,
        receivedAt: email.date,
        processedAt: new Date().toISOString(),
        hasSchedulingIntent,
        schedulingDetails,
        actionTaken: 'none',
      };

      // Determine action based on config and confidence
      if (hasSchedulingIntent && confidence >= config.autoProcessing.confidenceThreshold) {
        if (config.autoProcessing.autoSuggestMeetings) {
          processedEmail.actionTaken = 'calendar_suggestion';
          // TODO: Implement auto-suggestion logic in Phase 4
        }
        
        if (config.autoProcessing.autoCreateCalendarEvents) {
          processedEmail.actionTaken = 'auto_scheduled';
          // TODO: Implement auto-scheduling logic in Phase 4
        }
      }

      // Store the processed email
      this.storageService.markEmailProcessed(processedEmail);

      if (hasSchedulingIntent) {
        this.logger.info('Scheduling email detected', {
          emailId: email.id,
          subject: email.subject,
          confidence,
          actionTaken: processedEmail.actionTaken
        });
      }

    } catch (error) {
      this.logger.error(`Error processing email ${email.id}:`, error);
      throw error;
    }
  }

  /**
   * Check if email contains scheduling keywords
   */
  private containsSchedulingKeywords(email: EmailSummary, keywords: string[]): boolean {
    const searchText = `${email.subject} ${email.snippet}`.toLowerCase();
    
    return keywords.some(keyword => 
      searchText.includes(keyword.toLowerCase())
    );
  }



  /**
   * Force a manual check for new emails (for testing/debugging)
   */
  async manualCheck(): Promise<void> {
    this.logger.info('Manual email check triggered');
    await this.checkForNewEmails();
  }

  /**
   * Get monitoring status
   */
  getStatus(): {
    isRunning: boolean;
    isProcessing: boolean;
    lastChecked: string;
    config: EmailMonitoringConfig;
    stats: ReturnType<EmailStorageService['getStorageStats']>;
  } {
    return {
      isRunning: this.isRunning,
      isProcessing: this.isProcessing,
      lastChecked: this.storageService.getState().lastChecked,
      config: this.storageService.getConfig(),
      stats: this.storageService.getStorageStats(),
    };
  }

  /**
   * Update monitoring configuration
   */
  updateConfig(newConfig: Partial<EmailMonitoringConfig>): void {
    const oldConfig = this.storageService.getConfig();
    this.storageService.updateConfig(newConfig);
    
    // Restart monitoring if interval changed
    if (newConfig.pollingIntervalMinutes && 
        newConfig.pollingIntervalMinutes !== oldConfig.pollingIntervalMinutes) {
      if (this.isRunning) {
        this.stop();
        this.start();
      }
    }
  }
} 